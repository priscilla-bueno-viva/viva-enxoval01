'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { PADRAO, getLavanderia, TODOS_PREDIOS } from '@/lib/supabase'
import { UNIT_COMBO } from '@/lib/unitMap'
import * as XLSX from 'xlsx'

const PECAS_SHORT = ['LC', 'LS', 'Fr', 'TB', 'TR', 'TP']
const PECAS_DB = ['lc', 'ls', 'fr', 'tb', 'tr', 'tp']

interface Unidade {
  id?: string
  predio: string
  unidade: string
  tipologia: string
  lc: number; ls: number; fr: number; tb: number; tr: number; tp: number
  updated_at?: string
}

const BLANK: Omit<Unidade, 'id' | 'updated_at'> = { predio: '', unidade: '', tipologia: '', lc: 0, ls: 0, fr: 0, tb: 0, tr: 0, tp: 0 }

export default function UnidadesPage() {
  const [rows, setRows] = useState<Unidade[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Unidade>>({})
  const [filterPredio, setFilterPredio] = useState('')
  const [search, setSearch] = useState('')
  const [msg, setMsg] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newUnit, setNewUnit] = useState<Omit<Unidade, 'id' | 'updated_at'>>(BLANK)
  const [addSaving, setAddSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('unidades').select('*').order('predio').order('unidade')
    setRows(data || [])
    setLoading(false)
  }

  function showMsg(text: string) {
    setMsg(text)
    setTimeout(() => setMsg(''), 4000)
  }

  // Importa todas as unidades do mapeamento estático para o banco
  async function importarPadrao() {
    setImporting(true)
    const toInsert: Omit<Unidade, 'id' | 'updated_at'>[] = []
    for (const [unidade, tipologia] of Object.entries(UNIT_COMBO)) {
      const predio = unidade.split(' ')[0]
      const combos = PADRAO[predio] || {}
      const pad = combos[tipologia] || [0, 0, 0, 0, 0, 0]
      toInsert.push({ predio, unidade, tipologia, lc: pad[0], ls: pad[1], fr: pad[2], tb: pad[3], tr: pad[4], tp: pad[5] })
    }
    for (let i = 0; i < toInsert.length; i += 200) {
      await supabase.from('unidades').upsert(toInsert.slice(i, i + 200), { onConflict: 'unidade' })
    }
    setImporting(false)
    showMsg(`✓ ${toInsert.length} unidades importadas do sistema`)
    load()
  }

  // Importa unidades via Excel
  // Formato esperado: colunas Unidade, Prédio, Tipologia, LC, LS, Fr, TB, TR, TP
  function importarExcel(file: File) {
    const reader = new FileReader()
    reader.onload = async e => {
      setImporting(true)
      const wb = XLSX.read(new Uint8Array(e.target!.result as ArrayBuffer), { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(ws, { defval: '' }) as any[]

      const toInsert: Omit<Unidade, 'id' | 'updated_at'>[] = []
      for (const r of data) {
        const unidade = String(r['Unidade'] || r['unidade'] || '').trim()
        const predio = String(r['Prédio'] || r['Predio'] || r['predio'] || unidade.split(' ')[0] || '').trim()
        const tipologia = String(r['Tipologia'] || r['tipologia'] || r['Combinação'] || r['Combinacao'] || '').trim()
        if (!unidade || !predio) continue
        toInsert.push({
          predio,
          unidade,
          tipologia,
          lc: parseInt(r['LC'] || r['lc'] || r['Lençol Casal'] || 0) || 0,
          ls: parseInt(r['LS'] || r['ls'] || r['Lençol Solteiro'] || 0) || 0,
          fr: parseInt(r['Fr'] || r['fr'] || r['Fronha'] || 0) || 0,
          tb: parseInt(r['TB'] || r['tb'] || r['Toalha Banho'] || 0) || 0,
          tr: parseInt(r['TR'] || r['tr'] || r['Toalha Rosto'] || 0) || 0,
          tp: parseInt(r['TP'] || r['tp'] || r['Toalha Piso'] || 0) || 0,
        })
      }

      for (let i = 0; i < toInsert.length; i += 200) {
        await supabase.from('unidades').upsert(toInsert.slice(i, i + 200), { onConflict: 'unidade' })
      }
      setImporting(false)
      showMsg(`✓ ${toInsert.length} unidades importadas do Excel`)
      load()
    }
    reader.readAsArrayBuffer(file)
  }

  function exportarExcel() {
    const header = ['Unidade', 'Prédio', 'Tipologia', ...PECAS_SHORT, 'Total']
    const dataRows = filtered.map(r => [
      r.unidade, r.predio, r.tipologia,
      r.lc, r.ls, r.fr, r.tb, r.tr, r.tp,
      r.lc + r.ls + r.fr + r.tb + r.tr + r.tp,
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([header, ...dataRows]), 'Unidades')
    XLSX.writeFile(wb, `unidades_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  async function saveEdit(row: Unidade) {
    setSaving(row.unidade)
    const payload = {
      tipologia: editData.tipologia ?? row.tipologia,
      lc: Number(editData.lc ?? row.lc),
      ls: Number(editData.ls ?? row.ls),
      fr: Number(editData.fr ?? row.fr),
      tb: Number(editData.tb ?? row.tb),
      tr: Number(editData.tr ?? row.tr),
      tp: Number(editData.tp ?? row.tp),
    }
    await supabase.from('unidades').update(payload).eq('unidade', row.unidade)
    setRows(prev => prev.map(r => r.unidade === row.unidade ? { ...r, ...payload } : r))
    setEditingId(null); setEditData({}); setSaving(null)
  }

  async function addUnit() {
    if (!newUnit.unidade || !newUnit.predio) return
    setAddSaving(true)
    const { error } = await supabase.from('unidades').upsert(newUnit, { onConflict: 'unidade' })
    setAddSaving(false)
    if (error) { showMsg('Erro: ' + error.message); return }
    showMsg('✓ Unidade adicionada!')
    setShowAdd(false); setNewUnit(BLANK); load()
  }

  async function deleteUnit(unidade: string) {
    if (!confirm(`Remover "${unidade}"?`)) return
    await supabase.from('unidades').delete().eq('unidade', unidade)
    setRows(prev => prev.filter(r => r.unidade !== unidade))
  }

  const predios = useMemo(() => [...new Set(rows.map(r => r.predio))].sort(), [rows])

  const filtered = useMemo(() => rows.filter(r => {
    if (filterPredio && r.predio !== filterPredio) return false
    if (search && !r.unidade.toLowerCase().includes(search.toLowerCase()) && !r.tipologia.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [rows, filterPredio, search])

  // Quando usuário muda o prédio no form de adicionar, preenche tipologia com primeiro combo
  function handleNewPredio(predio: string) {
    const combos = PADRAO[predio] || {}
    const firstCombo = Object.keys(combos)[0] || ''
    const pad = combos[firstCombo] || [0,0,0,0,0,0]
    setNewUnit(p => ({ ...p, predio, tipologia: firstCombo, lc: pad[0], ls: pad[1], fr: pad[2], tb: pad[3], tr: pad[4], tp: pad[5] }))
  }

  function handleNewTipologia(tipologia: string) {
    const combos = PADRAO[newUnit.predio] || {}
    const pad = combos[tipologia] || [0,0,0,0,0,0]
    setNewUnit(p => ({ ...p, tipologia, lc: pad[0], ls: pad[1], fr: pad[2], tb: pad[3], tr: pad[4], tp: pad[5] }))
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Cadastro de Unidades</h1>
          <p className="text-sm text-gray-400 mt-0.5">Tipologia e enxoval padrão por unidade · {rows.length} cadastradas</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {msg && <span className="text-xs text-green-600 font-medium">{msg}</span>}
          {rows.length > 0 && (
            <button onClick={exportarExcel}
              className="text-xs px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition">
              ⬇ Exportar Excel
            </button>
          )}
          {/* Import via Excel */}
          <label className="text-xs px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition cursor-pointer">
            📂 Importar Excel
            <input type="file" accept=".xlsx,.xls" className="hidden"
              onChange={e => e.target.files?.[0] && importarExcel(e.target.files[0])} />
          </label>
          <button onClick={importarPadrao} disabled={importing}
            className="text-xs px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-60 transition">
            {importing ? 'Importando...' : '⬆ Importar padrão do sistema'}
          </button>
          <button onClick={() => setShowAdd(true)}
            className="text-xs px-4 py-2 rounded-lg text-white"
            style={{ background: '#02275B' }}>
            + Adicionar unidade
          </button>
        </div>
      </div>

      {/* Modal: adicionar unidade */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Adicionar Unidade</h2>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Prédio *</label>
                <select value={newUnit.predio} onChange={e => handleNewPredio(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
                  <option value="">Selecionar...</option>
                  {TODOS_PREDIOS.sort().map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Nome da unidade *</label>
                <input value={newUnit.unidade} onChange={e => setNewUnit(p => ({ ...p, unidade: e.target.value }))}
                  placeholder="Ex: SPZ 648 - 101"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs text-gray-500 block mb-1">Tipologia</label>
              {newUnit.predio && PADRAO[newUnit.predio] ? (
                <select value={newUnit.tipologia} onChange={e => handleNewTipologia(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
                  <option value="">Selecionar...</option>
                  {Object.keys(PADRAO[newUnit.predio]).map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              ) : (
                <input value={newUnit.tipologia} onChange={e => setNewUnit(p => ({ ...p, tipologia: e.target.value }))}
                  placeholder="Ex: Studio | Q1:Queen | 1 banh"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              )}
            </div>

            <div className="mb-5">
              <label className="text-xs text-gray-500 block mb-2">Quantidades de enxoval</label>
              <div className="grid grid-cols-6 gap-2">
                {PECAS_SHORT.map((p, i) => (
                  <div key={p} className="text-center">
                    <div className="text-xs text-gray-400 mb-1">{p}</div>
                    <input type="number" min="0"
                      value={String(newUnit[PECAS_DB[i] as keyof typeof newUnit])}
                      onChange={e => setNewUnit(prev => ({ ...prev, [PECAS_DB[i]]: parseInt(e.target.value) || 0 }))}
                      className="w-full text-center border border-gray-200 rounded px-1 py-1.5 text-sm focus:outline-none" />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowAdd(false); setNewUnit(BLANK) }}
                className="text-xs px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-100">
                Cancelar
              </button>
              <button onClick={addUnit} disabled={addSaving || !newUnit.unidade || !newUnit.predio}
                className="text-xs px-5 py-2 rounded-lg text-white disabled:opacity-60"
                style={{ background: '#02275B' }}>
                {addSaving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formato esperado para import Excel */}
      <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
        <strong>Formato do Excel para importação:</strong> colunas <code>Unidade · Prédio · Tipologia · LC · LS · Fr · TB · TR · TP</code> — uma unidade por linha.
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-5">
        <select value={filterPredio} onChange={e => setFilterPredio(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
          <option value="">Todos os prédios</option>
          {predios.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar unidade ou tipologia..."
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
        <span className="text-xs text-gray-400 self-center">{filtered.length} unidades</span>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Carregando...</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <div className="text-3xl mb-3">📋</div>
          <div className="text-sm font-medium text-gray-700 mb-1">Nenhuma unidade cadastrada</div>
          <div className="text-xs text-gray-400 mb-4">Clique em "Importar padrão do sistema" para carregar as {Object.keys(UNIT_COMBO).length} unidades mapeadas</div>
          <button onClick={importarPadrao} disabled={importing}
            className="text-sm px-5 py-2 rounded-lg text-white disabled:opacity-60"
            style={{ background: '#02275B' }}>
            {importing ? 'Importando...' : '⬆ Importar agora'}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Prédio</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Unidade</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Tipologia</th>
                  {PECAS_SHORT.map(p => (
                    <th key={p} className="text-center px-2 py-3 text-xs text-gray-400 font-medium">{p}</th>
                  ))}
                  <th className="text-center px-3 py-3 text-xs text-gray-400 font-medium">Total</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => {
                  const isEditing = editingId === row.unidade
                  const vals = PECAS_DB.map(k => Number(isEditing ? (editData[k as keyof Unidade] ?? row[k as keyof Unidade]) : row[k as keyof Unidade]))
                  const total = vals.reduce((s, v) => s + (v || 0), 0)
                  return (
                    <tr key={row.unidade} className={`border-b border-gray-50 ${isEditing ? 'bg-blue-50/40' : 'hover:bg-gray-50'}`}>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getLavanderia(row.predio) === 'ELIS' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                          {row.predio}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-900 font-medium text-xs">{row.unidade}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs max-w-xs">
                        {isEditing ? (
                          <input value={String(editData.tipologia ?? row.tipologia)}
                            onChange={e => setEditData(p => ({ ...p, tipologia: e.target.value }))}
                            className="w-full border border-blue-200 rounded px-2 py-1 text-xs focus:outline-none bg-white" />
                        ) : row.tipologia}
                      </td>
                      {PECAS_DB.map((k, i) => (
                        <td key={k} className="px-2 py-2.5 text-center">
                          {isEditing ? (
                            <input type="number" min="0"
                              value={String(editData[k as keyof Unidade] ?? row[k as keyof Unidade])}
                              onChange={e => setEditData(p => ({ ...p, [k]: e.target.value }))}
                              className="w-12 text-center border border-blue-200 rounded px-1 py-1 text-xs focus:outline-none bg-white" />
                          ) : (
                            <span className={`text-xs ${vals[i] > 0 ? 'text-gray-700' : 'text-gray-300'}`}>{vals[i]}</span>
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-center text-xs font-semibold text-gray-900">{total}</td>
                      <td className="px-3 py-2.5 text-right">
                        {isEditing ? (
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => { setEditingId(null); setEditData({}) }}
                              className="text-xs px-2 py-1 border border-gray-200 rounded hover:bg-gray-100">✕</button>
                            <button onClick={() => saveEdit(row)} disabled={saving === row.unidade}
                              className="text-xs px-3 py-1 rounded text-white disabled:opacity-60"
                              style={{ background: '#02275B' }}>
                              {saving === row.unidade ? '...' : '✓'}
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => { setEditingId(row.unidade); setEditData({}) }}
                              className="text-xs px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 transition">
                              Editar
                            </button>
                            <button onClick={() => deleteUnit(row.unidade)}
                              className="text-xs px-2 py-1 border border-red-100 rounded text-red-400 hover:bg-red-50 transition">
                              ✕
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
