'use client'
import { useState, useEffect } from 'react'
import { createClient, PECAS, PECAS_LABEL, PECAS_SHORT, calcTotal } from '@/lib/supabase'

interface PontoConfig {
  id: string
  label: string
  descricao: string
  hasTalao?: boolean
  hasDataCOs?: boolean
  hasPredioOrigem?: boolean
  hasPredio?: boolean
  readonly?: boolean
}

interface PontoFormProps {
  table: string
  pontos: PontoConfig[]
  date: string
  lavanderia?: string
  predio?: string
  accentColor: string
  extraData?: Record<string, any>
}

function emptyPecas() {
  return PECAS.reduce((acc, k) => ({ ...acc, [k]: '' }), {} as Record<string, string>)
}

export default function PontoForm({ table, pontos, date, lavanderia, predio, accentColor, extraData }: PontoFormProps) {
  const supabase = createClient()
  const [values, setValues] = useState<Record<string, Record<string, string>>>(
    Object.fromEntries(pontos.map(p => [p.id, emptyPecas()]))
  )
  const [taloes, setTaloes] = useState<Record<string, any[]>>(
    Object.fromEntries(pontos.filter(p => p.hasTalao).map(p => [p.id, []]))
  )
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setValues(Object.fromEntries(pontos.map(p => [p.id, emptyPecas()])))
      setTaloes(Object.fromEntries(pontos.filter(p => p.hasTalao).map(p => [p.id, []])))
      setSaved({})

      for (const ponto of pontos) {
        if (ponto.readonly) continue
        let query = supabase.from(table).select('*').eq('data', date).eq('ponto', ponto.id)
        if (lavanderia) query = query.eq('lavanderia', lavanderia)
        if (predio) query = query.eq('predio', predio)
        const { data } = await query
        if (!data || data.length === 0) continue

        if (ponto.hasTalao) {
          const loaded = data.map((row, idx) => ({
            id: row.id ?? idx,
            numero: row.numero_talao || '',
            data_cos: row.data_cos || '',
            predio_origem: row.predio_origem || '',
            pecas: PECAS.reduce((acc, k) => ({ ...acc, [k]: row[k] != null ? String(row[k]) : '' }), {} as Record<string, string>),
          }))
          setTaloes(prev => ({ ...prev, [ponto.id]: loaded }))
        } else {
          const row = data[0]
          const pecas = PECAS.reduce((acc, k) => ({ ...acc, [k]: row[k] != null ? String(row[k]) : '' }), {} as Record<string, string>)
          setValues(prev => ({ ...prev, [ponto.id]: pecas }))
        }
        setSaved(prev => ({ ...prev, [ponto.id]: true }))
      }
      setLoading(false)
    }
    loadData()
  }, [date, lavanderia, predio, table])

  function setPecaVal(pontoId: string, key: string, val: string) {
    setValues(prev => ({ ...prev, [pontoId]: { ...prev[pontoId], [key]: val } }))
    setSaved(prev => ({ ...prev, [pontoId]: false }))
  }

  function addTalao(pontoId: string) {
    setTaloes(prev => ({
      ...prev,
      [pontoId]: [...(prev[pontoId] || []), {
        id: Date.now(),
        numero: '',
        data_cos: '',
        predio_origem: predio || '',
        pecas: emptyPecas(),
      }]
    }))
  }

  function removeTalao(pontoId: string, talaoId: number) {
    setTaloes(prev => ({ ...prev, [pontoId]: prev[pontoId].filter(t => t.id !== talaoId) }))
  }

  function updateTalao(pontoId: string, talaoId: number, field: string, val: string) {
    setTaloes(prev => ({
      ...prev,
      [pontoId]: prev[pontoId].map(t => t.id === talaoId ? { ...t, [field]: val } : t)
    }))
    setSaved(prev => ({ ...prev, [pontoId]: false }))
  }

  function updateTalaoPeca(pontoId: string, talaoId: number, key: string, val: string) {
    setTaloes(prev => ({
      ...prev,
      [pontoId]: prev[pontoId].map(t => t.id === talaoId ? { ...t, pecas: { ...t.pecas, [key]: val } } : t)
    }))
    setSaved(prev => ({ ...prev, [pontoId]: false }))
  }

  function talaoTotal(talao: any) {
    return PECAS.reduce((s, k) => s + (parseInt(talao.pecas[k]) || 0), 0)
  }

  function sumTaloes(pontoId: string): Record<string, number> {
    const ts = taloes[pontoId] || []
    return PECAS.reduce((acc, k) => ({
      ...acc,
      [k]: ts.reduce((s, t) => s + (parseInt(t.pecas[k]) || 0), 0)
    }), {} as Record<string, number>)
  }

  async function savePonto(ponto: PontoConfig) {
    setSaving(ponto.id)
    setErrors(prev => ({ ...prev, [ponto.id]: '' }))

    const { data: { session } } = await supabase.auth.getSession()

    if (ponto.hasTalao) {
      const ts = taloes[ponto.id] || []
      if (ts.length === 0) { setSaving(null); return }

      // Delete existing taloes for this ponto/date
      await supabase.from(table).delete()
        .eq('data', date).eq('ponto', ponto.id)
        .match(lavanderia ? { lavanderia } : {})
        .match(predio ? { predio } : {})

      const rows = ts.map(t => ({
        data: date,
        ponto: ponto.id,
        numero_talao: t.numero || null,
        data_cos: t.data_cos || null,
        predio_origem: t.predio_origem || null,
        ...(lavanderia ? { lavanderia } : {}),
        ...(predio ? { predio } : {}),
        ...PECAS.reduce((acc, k) => ({ ...acc, [k]: parseInt(t.pecas[k]) || null }), {}),
        total: talaoTotal(t),
        registrado_por: session?.user.id,
        ...extraData,
      }))

      const { error } = await supabase.from(table).insert(rows)
      if (error) setErrors(prev => ({ ...prev, [ponto.id]: error.message }))
      else setSaved(prev => ({ ...prev, [ponto.id]: true }))
    } else {
      const pecas = values[ponto.id]
      const hasAny = PECAS.some(k => pecas[k] !== '')
      if (!hasAny) { setSaving(null); return }

      const total = PECAS.reduce((s, k) => s + (parseInt(pecas[k]) || 0), 0)

      // Upsert: delete existing and re-insert
      await supabase.from(table).delete()
        .eq('data', date).eq('ponto', ponto.id)
        .match(lavanderia ? { lavanderia } : {})
        .match(predio ? { predio } : {})

      const row = {
        data: date,
        ponto: ponto.id,
        ...(lavanderia ? { lavanderia } : {}),
        ...(predio ? { predio } : {}),
        ...PECAS.reduce((acc, k) => ({ ...acc, [k]: parseInt(pecas[k]) || null }), {}),
        total,
        registrado_por: session?.user.id,
        ...extraData,
      }

      const { error } = await supabase.from(table).insert(row)
      if (error) setErrors(prev => ({ ...prev, [ponto.id]: error.message }))
      else setSaved(prev => ({ ...prev, [ponto.id]: true }))
    }
    setSaving(null)
  }

  return (
    <div className="space-y-4">
      {pontos.map(ponto => (
        <div key={ponto.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50" style={{ borderLeftWidth: 3, borderLeftColor: accentColor }}>
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                style={{ background: accentColor }}>{ponto.id}</span>
              <div>
                <div className="text-sm font-medium text-gray-900">{ponto.label}</div>
                <div className="text-xs text-gray-400">{ponto.descricao}</div>
              </div>
            </div>
            {loading ? <span className="text-xs text-gray-400">Carregando...</span> : saved[ponto.id] && <span className="text-xs text-green-600">✓ Salvo</span>}
          </div>

          <div className="px-5 py-4">
            {ponto.hasTalao ? (
              <>
                <div className="flex justify-end mb-3">
                  <button
                    onClick={() => addTalao(ponto.id)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
                  >
                    + Adicionar talão
                  </button>
                </div>

                {(taloes[ponto.id] || []).map(talao => (
                  <div key={talao.id} className="border border-gray-100 rounded-lg p-3 mb-3 bg-gray-50">
                    <div className="flex gap-3 mb-3 flex-wrap">
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Nº Talão</label>
                        <input value={talao.numero} onChange={e => updateTalao(ponto.id, talao.id, 'numero', e.target.value)}
                          placeholder="ex: 1042"
                          className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs w-24 focus:outline-none" />
                      </div>
                      {ponto.hasPredioOrigem && (
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Prédio de origem</label>
                          <input value={talao.predio_origem} onChange={e => updateTalao(ponto.id, talao.id, 'predio_origem', e.target.value)}
                            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs w-20 focus:outline-none" />
                        </div>
                      )}
                      {ponto.hasDataCOs && (
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Data dos COs</label>
                          <input type="date" value={talao.data_cos} onChange={e => updateTalao(ponto.id, talao.id, 'data_cos', e.target.value)}
                            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none" />
                        </div>
                      )}
                      <div className="ml-auto">
                        <button onClick={() => removeTalao(ponto.id, talao.id)}
                          className="text-xs text-red-400 hover:text-red-600 mt-4">✕ Remover</button>
                      </div>
                    </div>

                    <div className="grid grid-cols-6 gap-2">
                      {PECAS.map((k, i) => (
                        <div key={k}>
                          <label className="text-xs text-gray-400 block mb-1 text-center">{PECAS_SHORT[i]}</label>
                          <input type="number" min="0" value={talao.pecas[k]}
                            onChange={e => updateTalaoPeca(ponto.id, talao.id, k, e.target.value)}
                            placeholder="0"
                            className="w-full text-center border border-gray-200 rounded-lg px-1 py-1.5 text-xs focus:outline-none bg-white" />
                        </div>
                      ))}
                    </div>
                    <div className="text-right text-xs text-gray-400 mt-2">Total: {talaoTotal(talao)}</div>
                  </div>
                ))}

                {(taloes[ponto.id] || []).length > 1 && (
                  <div className="bg-blue-50 rounded-lg px-4 py-2 mb-3">
                    <div className="text-xs text-blue-700 font-medium mb-1">Soma total ({(taloes[ponto.id] || []).length} talões)</div>
                    <div className="grid grid-cols-6 gap-2">
                      {PECAS.map((k, i) => (
                        <div key={k} className="text-center">
                          <div className="text-xs text-blue-400">{PECAS_SHORT[i]}</div>
                          <div className="text-sm font-semibold text-blue-900">{sumTaloes(ponto.id)[k]}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="grid grid-cols-6 gap-2">
                  {PECAS.map((k, i) => (
                    <div key={k}>
                      <label className="text-xs text-gray-400 block mb-1 text-center">{PECAS_SHORT[i]}</label>
                      <input
                        type="number" min="0"
                        value={values[ponto.id][k]}
                        onChange={e => setPecaVal(ponto.id, k, e.target.value)}
                        readOnly={ponto.readonly}
                        placeholder="—"
                        title={PECAS_LABEL[i]}
                        className={`w-full text-center rounded-lg border text-sm px-1 py-1.5 focus:outline-none
                          ${ponto.readonly ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-100' : 'bg-white border-gray-200 focus:border-blue-300 focus:ring-1 focus:ring-blue-100'}
                        `}
                      />
                    </div>
                  ))}
                </div>
                {!ponto.readonly && (
                  <div className="text-right text-xs text-gray-400 mt-2">
                    Total: {PECAS.reduce((s, k) => s + (parseInt(values[ponto.id][k]) || 0), 0)}
                  </div>
                )}
              </>
            )}

            {errors[ponto.id] && (
              <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">{errors[ponto.id]}</div>
            )}

            {!ponto.readonly && (
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => savePonto(ponto)}
                  disabled={saving === ponto.id}
                  className="px-5 py-2 rounded-lg text-white text-xs font-medium disabled:opacity-60 transition"
                  style={{ background: accentColor }}
                >
                  {saving === ponto.id ? 'Salvando...' : `Salvar ${ponto.id}`}
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
