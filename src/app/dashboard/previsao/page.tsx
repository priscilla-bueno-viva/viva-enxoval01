'use client'
import { useState, useEffect } from 'react'
import { createClient, PADRAO, getLavanderia, PECAS } from '@/lib/supabase'
import { UNIT_COMBO } from '@/lib/unitMap'
import * as XLSX from 'xlsx'

const PECAS_SHORT = ['LC', 'LS', 'Fr', 'TB', 'TR', 'TP']
const PECAS_LABEL = ['Lençol Casal', 'Lençol Solteiro', 'Fronha', 'Toalha Banho', 'Toalha Rosto', 'Toalha Piso']

function tomorrow() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}
function today() {
  return new Date().toISOString().split('T')[0]
}

interface PredioDados {
  predio: string
  lavanderia: string
  limpezas: number
  necessario: number[]   // por peça
  estoqueG: number[]     // ponto G de hoje
  aEnviar: number[]      // max(0, necessario - estoqueG)
  confirmado: boolean
  observacao: string
  enviadoReal: string[]  // quantidade real digitada pela logística
}

export default function PrevisaoPage() {
  const [dataPrev, setDataPrev] = useState(tomorrow())
  const [dataG, setDataG] = useState(today())
  const [predios, setPredios] = useState<PredioDados[]>([])
  const [loading, setLoading] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const supabase = createClient()

  // Processa arquivo de previsão de limpezas
  function processFile(file: File) {
    const reader = new FileReader()
    reader.onload = async e => {
      const wb = XLSX.read(new Uint8Array(e.target!.result as ArrayBuffer), { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(ws, { defval: '' }) as any[]

      // Agrupa por prédio e soma peças necessárias
      const byPredio: Record<string, { lav: string; limpezas: number; necessario: number[] }> = {}

      for (const r of data) {
        const unidade = (r['Unidade'] || r['unidade'] || '').trim()
        const status = (r['Status'] || r['status'] || '').toLowerCase()
        // Aceita scheduled, pending, confirmed ou sem status (previsão)
        if (status === 'completed') continue
        const predio = unidade.split(' ')[0]
        if (!predio || !PADRAO[predio]) continue

        const combos = PADRAO[predio] || {}
        const comboKey = UNIT_COMBO[unidade] || Object.keys(combos)[0] || ''
        const pad = (comboKey && combos[comboKey]) ? combos[comboKey] : [0,0,0,0,0,0]
        const lav = getLavanderia(predio)

        if (!byPredio[predio]) byPredio[predio] = { lav, limpezas: 0, necessario: [0,0,0,0,0,0] }
        byPredio[predio].limpezas++
        pad.forEach((v, i) => byPredio[predio].necessario[i] += v)
      }

      // Carrega ponto G do banco para cada prédio
      await carregarG(byPredio)
    }
    reader.readAsArrayBuffer(file)
  }

  async function carregarG(byPredio?: Record<string, any>) {
    setLoading(true)
    const fonte = byPredio || predios.reduce((acc, p) => {
      acc[p.predio] = { lav: p.lavanderia, limpezas: p.limpezas, necessario: p.necessario }
      return acc
    }, {} as Record<string, any>)

    const prediosList = Object.keys(fonte)
    if (!prediosList.length) { setLoading(false); return }

    // Busca ponto G (estoque limpo pós-operação) para cada prédio na dataG
    const { data: gData } = await supabase
      .from('predio_limpo')
      .select('*')
      .eq('data', dataG)
      .eq('ponto', 'G')
      .in('predio', prediosList)

    // Busca confirmações salvas para a data de previsão
    const { data: confirmData } = await supabase
      .from('previsao_logistica')
      .select('*')
      .eq('data_previsao', dataPrev)

    const resultado: PredioDados[] = prediosList.map(predio => {
      const info = fonte[predio]
      const gRow = gData?.find((r: any) => r.predio === predio)
      const estoqueG = PECAS.map(k => gRow?.[k] || 0)
      const necessario = info.necessario
      const aEnviar = necessario.map((n: number, i: number) => Math.max(0, n - estoqueG[i]))

      const saved = confirmData?.find((r: any) => r.predio === predio)
      return {
        predio,
        lavanderia: info.lav,
        limpezas: info.limpezas,
        necessario,
        estoqueG,
        aEnviar,
        confirmado: saved?.confirmado || false,
        observacao: saved?.observacao || '',
        enviadoReal: saved?.enviado_real ? JSON.parse(saved.enviado_real) : aEnviar.map(String),
      }
    }).sort((a, b) => a.predio.localeCompare(b.predio))

    setPredios(resultado)
    setLoading(false)
  }

  // Recarrega G quando dataG muda e já há dados
  useEffect(() => {
    if (predios.length > 0) carregarG()
  }, [dataG])

  function updateEnviado(predio: string, i: number, val: string) {
    setPredios(prev => prev.map(p => p.predio !== predio ? p : {
      ...p, enviadoReal: p.enviadoReal.map((v, idx) => idx === i ? val : v)
    }))
  }

  function updateObs(predio: string, val: string) {
    setPredios(prev => prev.map(p => p.predio !== predio ? p : { ...p, observacao: val }))
  }

  function toggleConfirmado(predio: string) {
    setPredios(prev => prev.map(p => p.predio !== predio ? p : { ...p, confirmado: !p.confirmado }))
  }

  async function salvarConfirmacoes() {
    setSalvando(true)
    const { data: { session } } = await supabase.auth.getSession()

    for (const p of predios) {
      const payload = {
        data_previsao: dataPrev,
        data_g: dataG,
        predio: p.predio,
        lavanderia: p.lavanderia,
        limpezas_previstas: p.limpezas,
        necessario: JSON.stringify(p.necessario),
        estoque_g: JSON.stringify(p.estoqueG),
        a_enviar: JSON.stringify(p.aEnviar),
        enviado_real: JSON.stringify(p.enviadoReal),
        observacao: p.observacao,
        confirmado: p.confirmado,
        atualizado_por: session?.user.id,
      }
      await supabase.from('previsao_logistica').upsert(payload, { onConflict: 'data_previsao,predio' })
    }
    setSalvando(false)
    setSavedMsg('✓ Confirmações salvas!')
    setTimeout(() => setSavedMsg(''), 3000)
  }

  function handleExport() {
    if (!predios.length) return
    const header = ['Prédio', 'Lav.', 'Limpezas previstas',
      ...PECAS_SHORT.map(p => `Necessário ${p}`),
      ...PECAS_SHORT.map(p => `Estoque G ${p}`),
      ...PECAS_SHORT.map(p => `A Enviar ${p}`),
      ...PECAS_SHORT.map(p => `Enviado Real ${p}`),
      'Confirmado', 'Observação']

    const rows = predios.map(p => [
      p.predio, p.lavanderia, p.limpezas,
      ...p.necessario,
      ...p.estoqueG,
      ...p.aEnviar,
      ...p.enviadoReal.map(v => parseInt(v) || 0),
      p.confirmado ? 'Sim' : 'Não',
      p.observacao,
    ])

    // Totais
    const totNec = PECAS_SHORT.map((_, i) => predios.reduce((s, p) => s + p.necessario[i], 0))
    const totG = PECAS_SHORT.map((_, i) => predios.reduce((s, p) => s + p.estoqueG[i], 0))
    const totEnv = PECAS_SHORT.map((_, i) => predios.reduce((s, p) => s + p.aEnviar[i], 0))
    const totReal = PECAS_SHORT.map((_, i) => predios.reduce((s, p) => s + (parseInt(p.enviadoReal[i]) || 0), 0))
    const totRow = ['TOTAL', '', predios.reduce((s, p) => s + p.limpezas, 0), ...totNec, ...totG, ...totEnv, ...totReal, '', '']

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows, [], totRow])
    XLSX.utils.book_append_sheet(wb, ws, 'Previsão de Envio')
    XLSX.writeFile(wb, `previsao_envio_${dataPrev}.xlsx`)
  }

  const totalAEnviar = PECAS_SHORT.reduce((s, _, i) => s + predios.reduce((ss, p) => ss + p.aEnviar[i], 0), 0)
  const confirmados = predios.filter(p => p.confirmado).length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Previsão de Envio</h1>
          <p className="text-sm text-gray-400 mt-0.5">Calcule o enxoval a enviar para cada prédio com base nas limpezas previstas e estoque G</p>
        </div>
        {predios.length > 0 && (
          <button onClick={handleExport}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
            ⬇ Exportar Excel
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Data das limpezas previstas (amanhã)</label>
          <input type="date" value={dataPrev} onChange={e => setDataPrev(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Data do estoque G (hoje — ponto G registrado)</label>
          <input type="date" value={dataG} onChange={e => setDataG(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
        </div>
      </div>

      {/* Upload */}
      <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-6 cursor-pointer hover:bg-gray-50 transition mb-5">
        <span className="text-2xl mb-2">📂</span>
        <span className="text-sm font-medium text-gray-700">Carregar arquivo de previsão de limpezas</span>
        <span className="text-xs text-gray-400 mt-1">.xlsx ou .xls — limpezas agendadas para {dataPrev}</span>
        <input type="file" accept=".xlsx,.xls" className="hidden"
          onChange={e => e.target.files?.[0] && processFile(e.target.files[0])} />
      </label>

      {loading && (
        <div className="text-center py-8 text-gray-400 text-sm">Carregando dados...</div>
      )}

      {!loading && predios.length > 0 && (
        <>
          {/* Resumo */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="text-xl font-semibold text-gray-900">{predios.length}</div>
              <div className="text-xs text-gray-400 mt-1">Prédios com limpezas previstas</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="text-xl font-semibold text-gray-900">{totalAEnviar}</div>
              <div className="text-xs text-gray-400 mt-1">Total de peças a enviar</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="text-xl font-semibold" style={{ color: confirmados === predios.length ? '#16a34a' : '#d97706' }}>
                {confirmados} / {predios.length}
              </div>
              <div className="text-xs text-gray-400 mt-1">Prédios confirmados pela logística</div>
            </div>
          </div>

          {/* Tabela resumo */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-5">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">Resumo por prédio</span>
              <span className="text-xs text-gray-400">Necessário = limpezas × padrão · A Enviar = Necessário − Estoque G</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-3 py-2.5 text-xs text-gray-400 font-medium">Prédio</th>
                    <th className="text-center px-2 py-2.5 text-xs text-gray-400 font-medium">Lav.</th>
                    <th className="text-center px-2 py-2.5 text-xs text-gray-400 font-medium">Limp.</th>
                    {PECAS_SHORT.map(p => (
                      <th key={p} colSpan={3} className="text-center px-2 py-2.5 text-xs font-medium border-l border-gray-100" style={{ color: '#02275B' }}>{p}</th>
                    ))}
                    <th className="text-center px-2 py-2.5 text-xs text-gray-400 font-medium">Status</th>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <th></th><th></th><th></th>
                    {PECAS_SHORT.map(p => (
                      <>
                        <th key={`${p}-n`} className="text-center px-1 py-1.5 text-xs text-blue-400 font-normal border-l border-gray-100">Nec.</th>
                        <th key={`${p}-g`} className="text-center px-1 py-1.5 text-xs text-green-500 font-normal">G</th>
                        <th key={`${p}-e`} className="text-center px-1 py-1.5 text-xs text-orange-500 font-normal">Env.</th>
                      </>
                    ))}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {predios.map(p => (
                    <tr key={p.predio} className={`border-b border-gray-50 hover:bg-gray-50 ${p.confirmado ? 'bg-green-50/30' : ''}`}>
                      <td className="px-3 py-2 font-medium text-gray-900">{p.predio}</td>
                      <td className="px-2 py-2 text-center">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${p.lavanderia === 'ELIS' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>{p.lavanderia}</span>
                      </td>
                      <td className="px-2 py-2 text-center text-gray-700">{p.limpezas}</td>
                      {PECAS_SHORT.map((_, i) => (
                        <>
                          <td key={`n${i}`} className="px-1 py-2 text-center text-xs text-blue-700 font-medium border-l border-gray-100">{p.necessario[i]}</td>
                          <td key={`g${i}`} className="px-1 py-2 text-center text-xs text-green-600">{p.estoqueG[i]}</td>
                          <td key={`e${i}`} className={`px-1 py-2 text-center text-xs font-semibold ${p.aEnviar[i] > 0 ? 'text-orange-600' : 'text-gray-400'}`}>{p.aEnviar[i]}</td>
                        </>
                      ))}
                      <td className="px-2 py-2 text-center">
                        {p.confirmado
                          ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">✓ OK</span>
                          : <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 font-medium">Pendente</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 bg-gray-50">
                    <td className="px-3 py-2 text-xs font-semibold text-gray-700">TOTAL</td>
                    <td></td>
                    <td className="px-2 py-2 text-center text-xs font-semibold text-gray-700">{predios.reduce((s, p) => s + p.limpezas, 0)}</td>
                    {PECAS_SHORT.map((_, i) => (
                      <>
                        <td key={`tn${i}`} className="px-1 py-2 text-center text-xs font-semibold text-blue-700 border-l border-gray-100">
                          {predios.reduce((s, p) => s + p.necessario[i], 0)}
                        </td>
                        <td key={`tg${i}`} className="px-1 py-2 text-center text-xs font-semibold text-green-600">
                          {predios.reduce((s, p) => s + p.estoqueG[i], 0)}
                        </td>
                        <td key={`te${i}`} className="px-1 py-2 text-center text-xs font-semibold text-orange-600">
                          {predios.reduce((s, p) => s + p.aEnviar[i], 0)}
                        </td>
                      </>
                    ))}
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Checklist logística — por prédio */}
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Confirmação da Logística</h2>
            <div className="space-y-3">
              {predios.map(p => (
                <div key={p.predio} className={`bg-white rounded-xl border overflow-hidden ${p.confirmado ? 'border-green-200' : 'border-gray-100'}`}>
                  <div className={`flex items-center justify-between px-4 py-3 ${p.confirmado ? 'bg-green-50' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900 text-sm">{p.predio}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.lavanderia === 'ELIS' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{p.lavanderia}</span>
                      <span className="text-xs text-gray-400">{p.limpezas} limpezas previstas</span>
                    </div>
                    <button
                      onClick={() => toggleConfirmado(p.predio)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${p.confirmado ? 'bg-green-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                      {p.confirmado ? '✓ Confirmado' : 'Confirmar envio'}
                    </button>
                  </div>

                  <div className="px-4 py-3">
                    {/* Grid de peças */}
                    <div className="grid grid-cols-6 gap-2 mb-3">
                      {PECAS_SHORT.map((peca, i) => (
                        <div key={peca} className="text-center">
                          <div className="text-xs font-medium text-gray-500 mb-1">{peca}</div>
                          <div className="text-xs text-blue-600 mb-0.5">Nec: {p.necessario[i]}</div>
                          <div className="text-xs text-green-600 mb-0.5">G: {p.estoqueG[i]}</div>
                          <div className={`text-xs font-semibold mb-1 ${p.aEnviar[i] > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                            Env: {p.aEnviar[i]}
                          </div>
                          <input
                            type="number" min="0"
                            value={p.enviadoReal[i]}
                            onChange={e => updateEnviado(p.predio, i, e.target.value)}
                            placeholder={String(p.aEnviar[i])}
                            title={`Real enviado de ${PECAS_LABEL[i]}`}
                            className={`w-full text-center rounded border text-xs px-1 py-1.5 focus:outline-none
                              ${parseInt(p.enviadoReal[i]) !== p.aEnviar[i] && p.enviadoReal[i] !== ''
                                ? 'border-orange-300 bg-orange-50 text-orange-700'
                                : 'border-gray-200 bg-white'}`}
                          />
                          <div className="text-xs text-gray-400 mt-0.5">real</div>
                        </div>
                      ))}
                    </div>

                    {/* Observação */}
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Observações / divergências</label>
                      <input
                        type="text"
                        value={p.observacao}
                        onChange={e => updateObs(p.predio, e.target.value)}
                        placeholder="Ex: faltou 2 LC, enviado com prédio vizinho..."
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-300"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Botão salvar */}
          <div className="flex items-center gap-3 justify-end">
            {savedMsg && <span className="text-xs text-green-600">{savedMsg}</span>}
            <button onClick={salvarConfirmacoes} disabled={salvando}
              className="px-6 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-60"
              style={{ background: '#02275B' }}>
              {salvando ? 'Salvando...' : 'Salvar confirmações'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
