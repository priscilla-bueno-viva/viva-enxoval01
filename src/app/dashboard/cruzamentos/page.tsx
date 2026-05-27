'use client'
import { useState } from 'react'
import { createClient, PECAS, PECAS_SHORT, PECAS_LABEL } from '@/lib/supabase'

function diff(a: Record<string, number>, b: Record<string, number>) {
  return PECAS.map(k => (a[k] || 0) - (b[k] || 0))
}
function isZero(arr: number[]) { return arr.every(v => v === 0) }
function sumArr(rows: any[], campos: string[]) {
  return PECAS.reduce((acc, k, i) => ({ ...acc, [k]: rows.reduce((s, r) => s + (r[campos[i]] || r[k] || 0), 0) }), {} as Record<string, number>)
}

export default function CruzamentosPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [lavanderia, setLavanderia] = useState('')
  const [predio, setPredio] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function calcular() {
    setLoading(true)
    const matchDate = (q: any) => q.eq('data', date)
    const matchLav = (q: any) => lavanderia ? q.eq('lavanderia', lavanderia) : q
    const matchPred = (q: any) => predio ? q.eq('predio', predio) : q

    const [
      { data: dlData },
      { data: plData },
      { data: psData },
      { data: dsData },
      { data: limpData },
    ] = await Promise.all([
      matchLav(matchDate(supabase.from('deposito_limpo').select('*'))),
      matchLav(matchPred(matchDate(supabase.from('predio_limpo').select('*')))),
      matchLav(matchPred(matchDate(supabase.from('predio_sujo').select('*')))),
      matchLav(matchDate(supabase.from('deposito_sujo').select('*'))),
      matchLav(matchPred(matchDate(supabase.from('limpezas').select('*')))),
    ])

    const get = (rows: any[], ponto: string) => {
      const r = rows?.filter(x => x.ponto === ponto) || []
      return PECAS.reduce((acc, k) => ({ ...acc, [k]: r.reduce((s: number, x: any) => s + (x[k] || 0), 0) }), {} as Record<string, number>)
    }

    const E = get(plData || [], 'E')
    const F = get(plData || [], 'F')
    const I = get(psData || [], 'I')
    const L_taloes = get(dsData || [], 'L')
    const M = get(dsData || [], 'M')
    const N = get(dsData || [], 'N')

    // J from limpezas
    const J = PECAS.reduce((acc, k, i) => {
      const campos = ['lenco_casal_esperado','lenco_solteiro_esperado','fronha_esperada','toalha_banho_esperada','toalha_rosto_esperada','toalha_piso_esperada']
      return { ...acc, [k]: (limpData || []).reduce((s: number, r: any) => s + (r[campos[i]] || 0), 0) }
    }, {} as Record<string, number>)

    const cruzamentos = [
      { id: 'E × F', desc: 'Estoque limpo pré-op vs limpos entregues logística', a: E, b: F, aLabel: 'E', bLabel: 'F' },
      { id: 'I × J', desc: 'Sujo retirado (talões) vs sujo esperado calculado', a: I, b: J, aLabel: 'I', bLabel: 'J' },
      { id: 'L × I', desc: 'Talões recebidos no depósito vs retirados nos prédios', a: L_taloes, b: I, aLabel: 'L', bLabel: 'I' },
      { id: 'M × L', desc: 'Total bipado depósito vs soma talões recebidos', a: M, b: L_taloes, aLabel: 'M', bLabel: 'L' },
      { id: 'N × M', desc: 'Confirmado pela lavanderia vs total bipado SKURBAN', a: N, b: M, aLabel: 'N', bLabel: 'M' },
    ]

    setResults(cruzamentos.map(c => ({
      ...c,
      diff: diff(c.a, c.b),
      hasData: PECAS.some(k => (c.a[k] || 0) > 0 || (c.b[k] || 0) > 0),
    })))
    setLoading(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Cruzamentos</h1>
          <p className="text-sm text-gray-400 mt-0.5">Verificação automática dos pontos de controle</p>
        </div>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none" />
        <select value={lavanderia} onChange={e => setLavanderia(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
          <option value="">Todas as lavanderias</option>
          <option value="PW">PW</option>
          <option value="ELIS">ELIS</option>
        </select>
        <input value={predio} onChange={e => setPredio(e.target.value.toUpperCase())}
          placeholder="Prédio (opcional)"
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none w-36" />
        <button onClick={calcular} disabled={loading}
          className="px-5 py-1.5 rounded-lg text-white text-sm font-medium disabled:opacity-60"
          style={{ background: '#02275B' }}>
          {loading ? 'Calculando...' : 'Calcular'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map(c => {
            const ok = isZero(c.diff)
            const noData = !c.hasData
            return (
              <div key={c.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold text-gray-900">{c.id}</span>
                    <span className="text-sm text-gray-500">{c.desc}</span>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium
                    ${noData ? 'bg-gray-100 text-gray-400' :
                      ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {noData ? 'Sem dados' : ok ? '✓ OK' : '⚠ Divergência'}
                  </span>
                </div>
                <div className="px-5 py-4">
                  <div className="grid grid-cols-7 gap-2 mb-2">
                    {PECAS.map((k, i) => <div key={k} className="text-center text-xs text-gray-400">{PECAS_SHORT[i]}</div>)}
                    <div className="text-center text-xs text-gray-400">Total</div>
                  </div>
                  {[{label: c.aLabel, vals: c.a}, {label: c.bLabel, vals: c.b}].map(row => (
                    <div key={row.label} className="grid grid-cols-7 gap-2 mb-1">
                      {PECAS.map((k) => (
                        <div key={k} className="text-center text-sm font-medium text-gray-700">{row.vals[k] ?? 0}</div>
                      ))}
                      <div className="text-center text-sm font-semibold text-gray-500">
                        {PECAS.reduce((s, k) => s + (row.vals[k] || 0), 0)}
                      </div>
                    </div>
                  ))}
                  {!ok && !noData && (
                    <div className="mt-3 pt-3 border-t border-gray-50">
                      <div className="text-xs text-gray-400 mb-1">Diferença ({c.aLabel} − {c.bLabel}):</div>
                      <div className="grid grid-cols-7 gap-2">
                        {c.diff.map((v: number, i: number) => (
                          <div key={i} className={`text-center text-sm font-semibold ${v > 0 ? 'text-orange-600' : v < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            {v > 0 ? `+${v}` : v}
                          </div>
                        ))}
                        <div className={`text-center text-sm font-semibold ${c.diff.reduce((s: number, v: number) => s + v, 0) !== 0 ? 'text-red-600' : 'text-gray-400'}`}>
                          {c.diff.reduce((s: number, v: number) => s + v, 0) > 0 ? '+' : ''}{c.diff.reduce((s: number, v: number) => s + v, 0)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
