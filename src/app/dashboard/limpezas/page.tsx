'use client'
import { useState } from 'react'
import { createClient, PADRAO, getLavanderia } from '@/lib/supabase'
import { UNIT_COMBO } from '@/lib/unitMap'
import * as XLSX from 'xlsx'

const PECAS_SHORT = ['LC', 'LS', 'Fr', 'TB', 'TR', 'TP']
const CAMPOS_ESP = ['lenco_casal_esperado','lenco_solteiro_esperado','fronha_esperada','toalha_banho_esperada','toalha_rosto_esperada','toalha_piso_esperada']

export default function LimpezasPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [rows, setRows] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  function processFile(file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      const wb = XLSX.read(new Uint8Array(e.target!.result as ArrayBuffer), { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(ws, { defval: '' }) as any[]
      const completed = data.filter(r => (r['Status'] || '').toLowerCase() === 'completed')
      const processed = completed.map(r => {
        const unidade = (r['Unidade'] || '').trim()
        const predio = unidade.split(' ')[0]
        const lav = getLavanderia(predio)
        const combos = PADRAO[predio] || {}
        const comboKey = UNIT_COMBO[unidade] || Object.keys(combos)[0] || ''
        const pad = (comboKey && combos[comboKey]) ? combos[comboKey] : [0,0,0,0,0,0]
        return {
          unidade, predio, lavanderia: lav, combinacao: comboKey,
          lenco_casal_esperado: pad[0], lenco_solteiro_esperado: pad[1],
          fronha_esperada: pad[2], toalha_banho_esperada: pad[3],
          toalha_rosto_esperada: pad[4], toalha_piso_esperada: pad[5],
          total_esperado: pad.reduce((s, v) => s + v, 0),
        }
      }).filter(r => r.predio)
      setRows(processed)
      setSaved(false)
    }
    reader.readAsArrayBuffer(file)
  }

  const byPredio = rows.reduce((acc, r) => {
    if (!acc[r.predio]) acc[r.predio] = { lav: r.lavanderia, items: [], totais: [0,0,0,0,0,0] }
    acc[r.predio].items.push(r)
    CAMPOS_ESP.forEach((c, i) => acc[r.predio].totais[i] += r[c])
    return acc
  }, {} as Record<string, any>)

  const totalLimp = rows.length
  const totalPecas = rows.reduce((s, r) => s + r.total_esperado, 0)
  const prediosPW = Object.values(byPredio).filter((p: any) => p.lav === 'PW').length
  const prediosELIS = Object.values(byPredio).filter((p: any) => p.lav === 'ELIS').length

  async function handleSave() {
    if (!rows.length) return
    setSaving(true); setError('')
    await supabase.from('limpezas').delete().eq('data', date)
    const { data: { session } } = await supabase.auth.getSession()
    const toInsert = rows.map(r => ({ ...r, data: date, registrado_por: session?.user.id }))
    const { error: err } = await supabase.from('limpezas').insert(toInsert)
    setSaving(false)
    if (err) setError('Erro ao salvar: ' + err.message)
    else setSaved(true)
  }

  function handleExport() {
    const header = ['Prédio', 'Lav.', 'Limpezas', ...PECAS_SHORT, 'Total']
    const dataRows = Object.entries(byPredio).sort(([a],[b]) => a.localeCompare(b)).map(([pred, d]: [string, any]) => {
      const tot = d.totais.reduce((s: number, v: number) => s + v, 0)
      return [pred, d.lav, d.items.length, ...d.totais, tot]
    })
    const totaisGerais = PECAS_SHORT.map((_, i) => Object.values(byPredio).reduce((s: number, d: any) => s + d.totais[i], 0))
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows, [], ['TOTAL', '', totalLimp, ...totaisGerais, totalPecas]])
    XLSX.utils.book_append_sheet(wb, ws, 'Por Prédio')
    const header2 = ['Unidade', 'Prédio', 'Lav.', 'Combinação', ...PECAS_SHORT, 'Total']
    const rows2 = rows.map(r => [r.unidade, r.predio, r.lavanderia, r.combinacao,
      r.lenco_casal_esperado, r.lenco_solteiro_esperado, r.fronha_esperada,
      r.toalha_banho_esperada, r.toalha_rosto_esperada, r.toalha_piso_esperada, r.total_esperado])
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([header2, ...rows2]), 'Detalhado')
    XLSX.writeFile(wb, `limpezas_${date}.xlsx`)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Limpezas do Dia</h1>
          <p className="text-sm text-gray-400 mt-0.5">Carregue o arquivo de limpezas para calcular o sujo esperado</p>
        </div>
        <div className="flex items-center gap-2">
          {rows.length > 0 && (
            <button onClick={handleExport}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-1.5">
              ⬇ Exportar Excel
            </button>
          )}
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none" />
        </div>
      </div>

      <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-8 cursor-pointer hover:bg-gray-50 transition mb-6">
        <span className="text-3xl mb-2">📂</span>
        <span className="text-sm font-medium text-gray-700">Clique para carregar arquivo de limpezas</span>
        <span className="text-xs text-gray-400 mt-1">.xlsx ou .xls — exportado do sistema de limpezas</span>
        <input type="file" accept=".xlsx,.xls" className="hidden" onChange={e => e.target.files?.[0] && processFile(e.target.files[0])} />
      </label>

      {rows.length > 0 && (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Limpezas', value: totalLimp },
              { label: 'Prédios com mov.', value: Object.keys(byPredio).length },
              { label: 'PW / ELIS', value: `${prediosPW} / ${prediosELIS}` },
              { label: 'Peças sujas esperadas', value: totalPecas },
            ].map(m => (
              <div key={m.label} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="text-xl font-semibold text-gray-900">{m.value}</div>
                <div className="text-xs text-gray-400 mt-1">{m.label}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Prédio</th>
                  <th className="text-center px-3 py-3 text-xs text-gray-400 font-medium">Lav.</th>
                  <th className="text-center px-3 py-3 text-xs text-gray-400 font-medium">Limp.</th>
                  {PECAS_SHORT.map(p => <th key={p} className="text-center px-2 py-3 text-xs text-gray-400 font-medium">{p}</th>)}
                  <th className="text-center px-3 py-3 text-xs text-gray-400 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(byPredio).sort(([a],[b]) => a.localeCompare(b)).map(([pred, d]: [string, any]) => {
                  const tot = d.totais.reduce((s: number, v: number) => s + v, 0)
                  return (
                    <tr key={pred} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-900">{pred}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.lav === 'ELIS' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>{d.lav}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center text-gray-700">{d.items.length}</td>
                      {d.totais.map((v: number, i: number) => <td key={i} className="px-2 py-2.5 text-center text-gray-700">{v}</td>)}
                      <td className="px-3 py-2.5 text-center font-semibold text-gray-900">{tot}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {error && <div className="text-xs text-red-600 bg-red-50 rounded-lg px-4 py-2 mb-4">{error}</div>}
          {saved && <div className="text-xs text-green-600 bg-green-50 rounded-lg px-4 py-2 mb-4">✓ Limpezas salvas para {date}</div>}

          <button onClick={handleSave} disabled={saving || saved}
            className="px-6 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-60 transition"
            style={{ background: '#02275B' }}>
            {saving ? 'Salvando...' : saved ? '✓ Salvo' : `Salvar ${totalLimp} limpezas`}
          </button>
        </>
      )}
    </div>
  )
}
