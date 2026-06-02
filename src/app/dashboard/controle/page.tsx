'use client'
import { useState, useEffect } from 'react'
import { createClient, PECAS, PW_PREDIOS, ELIS_PREDIOS, getLavanderia } from '@/lib/supabase'
import { isGestorProfile } from '../layout'

// Pontos que cada perfil pode editar
const DEPOSITO_PONTOS = ['A','B','C','D','L','M','N']
const OPERACOES_PONTOS = ['E','F','G','H','I','J']

const PECAS_S = ['LC','LS','Fr','TB','TR','TP']

const PONTOS_DL = [
  { id: 'A', label: 'A — Estoque limpo 7h pré-envio' },
  { id: 'B', label: 'B — Limpos recebidos manhã' },
  { id: 'C', label: 'C — Limpos enviados para prédios' },
  { id: 'D', label: 'D — Estoque limpo pós-separação' },
]
const PONTOS_PL = [
  { id: 'E', label: 'E — Estoque limpo pré-operação' },
  { id: 'F', label: 'F — Limpos entregues pela logística' },
  { id: 'G', label: 'G — Estoque limpo pós-operação' },
]
const PONTOS_DS_MN = [
  { id: 'M', label: 'M — Total sujo bipado / contado no depósito' },
  { id: 'N', label: 'N — Total confirmado recebido pela lavanderia' },
]

function emptyArr() { return PECAS.map(() => '') }

function PecaRow({ prefix, values, onChange, readonly = false }: {
  prefix: string, values: string[], onChange: (i: number, v: string) => void, readonly?: boolean
}) {
  return (
    <div>
      <div className="grid grid-cols-6 gap-1.5 mb-0.5">
        {PECAS_S.map(p => <div key={p} className="text-center text-xs text-gray-400">{p}</div>)}
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {PECAS.map((_, i) => (
          <input key={i} type="number" min="0"
            value={values[i]}
            onChange={e => onChange(i, e.target.value)}
            readOnly={readonly}
            placeholder="—"
            className={`w-full text-center rounded border text-sm px-1 py-1.5 focus:outline-none
              ${readonly ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-100' : 'bg-white border-gray-200 focus:border-blue-300'}`}
          />
        ))}
      </div>
    </div>
  )
}

function PontoBlock({ id, label, values, onChange, saved, saving, onSave, accentColor, readonly = false }: any) {
  const total = values.reduce((s: number, v: string) => s + (parseInt(v) || 0), 0)
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-3">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50"
        style={{ borderLeftWidth: 3, borderLeftColor: accentColor }}>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold"
            style={{ background: accentColor }}>{id}</span>
          <span className="text-sm font-medium text-gray-900">{label}</span>
        </div>
        {saved && <span className="text-xs text-green-600">✓ Salvo</span>}
      </div>
      <div className="px-4 py-3">
        <PecaRow prefix={id} values={values} onChange={onChange} readonly={readonly} />
        {!readonly && (
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">Total: {total}</span>
            <button onClick={onSave} disabled={saving}
              className="px-4 py-1.5 rounded-lg text-white text-xs font-medium disabled:opacity-60"
              style={{ background: accentColor }}>
              {saving ? 'Salvando...' : `Salvar ${id}`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

interface Talao {
  id: number; numero: string; data_cos: string; predio_origem: string; pecas: string[]
}

function TalaoBlock({ tipo, label, accentColor, taloes, onAdd, onRemove, onUpdate, onSave, saved, saving }: any) {
  const sums = PECAS.map((_, i) => taloes.reduce((s: number, t: Talao) => s + (parseInt(t.pecas[i]) || 0), 0))
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-3">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50"
        style={{ borderLeftWidth: 3, borderLeftColor: accentColor }}>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold"
            style={{ background: accentColor }}>{tipo}</span>
          <span className="text-sm font-medium text-gray-900">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-green-600">✓ Salvo</span>}
          <button onClick={onAdd}
            className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg hover:bg-gray-50">
            + Talão
          </button>
        </div>
      </div>
      <div className="px-4 py-3">
        {taloes.map((t: Talao) => (
          <div key={t.id} className="border border-gray-100 rounded-lg p-3 mb-2 bg-gray-50">
            <div className="flex gap-2 mb-2 flex-wrap items-end">
              <div>
                <div className="text-xs text-gray-400 mb-0.5">Nº Talão</div>
                <input value={t.numero} onChange={e => onUpdate(t.id, 'numero', e.target.value)}
                  placeholder="ex: 1042"
                  className="border border-gray-200 rounded px-2 py-1 text-xs w-20 focus:outline-none" />
              </div>
              {tipo === 'L' && (
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">Prédio origem</div>
                  <input value={t.predio_origem} onChange={e => onUpdate(t.id, 'predio_origem', e.target.value)}
                    className="border border-gray-200 rounded px-2 py-1 text-xs w-20 focus:outline-none" />
                </div>
              )}
              <div>
                <div className="text-xs text-gray-400 mb-0.5">Data COs</div>
                <input type="date" value={t.data_cos} onChange={e => onUpdate(t.id, 'data_cos', e.target.value)}
                  className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none" />
              </div>
              <button onClick={() => onRemove(t.id)}
                className="text-xs text-red-400 hover:text-red-600 ml-auto">✕</button>
            </div>
            <div className="grid grid-cols-6 gap-1.5 mb-0.5">
              {PECAS_S.map(p => <div key={p} className="text-center text-xs text-gray-400">{p}</div>)}
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {PECAS.map((_, i) => (
                <input key={i} type="number" min="0" value={t.pecas[i]}
                  onChange={e => onUpdate(t.id, `peca_${i}`, e.target.value)}
                  placeholder="0"
                  className="w-full text-center border border-gray-200 rounded px-1 py-1.5 text-xs focus:outline-none bg-white" />
              ))}
            </div>
          </div>
        ))}
        {taloes.length > 0 && (
          <div className="bg-blue-50 rounded-lg px-3 py-2 mb-2">
            <div className="text-xs text-blue-700 font-medium mb-1">Soma total ({taloes.length} talões)</div>
            <div className="grid grid-cols-6 gap-1.5">
              {sums.map((v: number, i: number) => (
                <div key={i} className="text-center">
                  <div className="text-xs text-blue-400">{PECAS_S[i]}</div>
                  <div className="text-sm font-semibold text-blue-900">{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex justify-end mt-1">
          <button onClick={onSave} disabled={saving}
            className="px-4 py-1.5 rounded-lg text-white text-xs font-medium disabled:opacity-60"
            style={{ background: accentColor }}>
            {saving ? 'Salvando...' : `Salvar ${tipo}`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ControlePage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [lavanderia, setLavanderia] = useState<'PW' | 'ELIS'>('PW')
  const [predio, setPredio] = useState('')
  const [userProfile, setUserProfile] = useState<any>(null)

  const [vals, setVals] = useState<Record<string, string[]>>({
    A: emptyArr(), B: emptyArr(), C: emptyArr(), D: emptyArr(),
    E: emptyArr(), F: emptyArr(), G: emptyArr(),
    H: emptyArr(), J: emptyArr(),
    M: emptyArr(), N: emptyArr(),
  })
  const [taloes, setTaloes] = useState<Record<string, Talao[]>>({ I: [], L: [] })
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [jAuto, setJAuto] = useState<string[]>(emptyArr())

  const supabase = createClient()

  // Load user profile for role-based access
  useEffect(() => {
    async function loadProfile() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: prof } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).single()
      setUserProfile(prof)
    }
    loadProfile()
  }, [])

  function canEdit(ponto: string) {
    if (!userProfile) return true // otimista enquanto carrega
    if (isGestorProfile(userProfile)) return true
    const mods = Array.isArray(userProfile.modulos) ? userProfile.modulos : []
    if (mods.includes('deposito')) return DEPOSITO_PONTOS.includes(ponto)
    if (mods.includes('operacoes')) return OPERACOES_PONTOS.includes(ponto)
    return false
  }

  // Load data when date/lavanderia/predio changes
  useEffect(() => {
    async function load() {
      setVals({ A: emptyArr(), B: emptyArr(), C: emptyArr(), D: emptyArr(), E: emptyArr(), F: emptyArr(), G: emptyArr(), H: emptyArr(), J: emptyArr(), M: emptyArr(), N: emptyArr() })
      setTaloes({ I: [], L: [] })
      setSaved({})

      // Load simple pontos
      const tables: [string, string[]][] = [
        ['deposito_limpo', ['A','B','C','D']],
        ['predio_limpo', ['E','F','G']],
        ['predio_sujo', ['H']],
        ['deposito_sujo', ['M','N']],
      ]
      for (const [table, pontos] of tables) {
        let q = supabase.from(table).select('*').eq('data', date).eq('lavanderia', lavanderia)
        if (['E','F','G','H'].includes(pontos[0]) && predio) q = q.eq('predio', predio)
        const { data } = await q
        if (!data) continue
        for (const ponto of pontos) {
          const row = data.find((r: any) => r.ponto === ponto)
          if (row) {
            setVals(prev => ({ ...prev, [ponto]: PECAS.map(k => row[k] != null ? String(row[k]) : '') }))
            setSaved(prev => ({ ...prev, [ponto]: true }))
          }
        }
      }

      // Load talao pontos
      for (const [table, tipo, needsPredio] of [['predio_sujo','I',true],['deposito_sujo','L',false]] as [string, string, boolean][]) {
        let q = supabase.from(table).select('*').eq('data', date).eq('ponto', tipo).eq('lavanderia', lavanderia)
        if (needsPredio && predio) q = q.eq('predio', predio)
        const { data } = await q
        if (data && data.length > 0) {
          setTaloes(prev => ({
            ...prev,
            [tipo]: data.map((row: any, idx: number) => ({
              id: row.id ?? idx,
              numero: row.numero_talao || '',
              data_cos: row.data_cos || '',
              predio_origem: row.predio_origem || '',
              pecas: PECAS.map(k => row[k] != null ? String(row[k]) : ''),
            }))
          }))
          setSaved(prev => ({ ...prev, [tipo]: true }))
        }
      }

      // Load J from limpezas
      if (predio) {
        const { data } = await supabase.from('limpezas').select('*').eq('data', date).eq('predio', predio)
        if (data && data.length > 0) {
          const campos = ['lenco_casal_esperado','lenco_solteiro_esperado','fronha_esperada','toalha_banho_esperada','toalha_rosto_esperada','toalha_piso_esperada']
          setJAuto(PECAS.map((_, i) => String(data.reduce((s: number, r: any) => s + (r[campos[i]] || 0), 0))))
        } else {
          setJAuto(emptyArr())
        }
      }
    }
    load()
  }, [date, lavanderia, predio])

  function setVal(ponto: string, i: number, v: string) {
    setVals(prev => { const a = [...prev[ponto]]; a[i] = v; return { ...prev, [ponto]: a } })
    setSaved(prev => ({ ...prev, [ponto]: false }))
  }

  function addTalao(tipo: string) {
    setTaloes(prev => ({ ...prev, [tipo]: [...prev[tipo], { id: Date.now(), numero: '', data_cos: '', predio_origem: predio, pecas: emptyArr() }] }))
  }

  function removeTalao(tipo: string, id: number) {
    setTaloes(prev => ({ ...prev, [tipo]: prev[tipo].filter(t => t.id !== id) }))
  }

  function updateTalao(tipo: string, id: number, field: string, val: string) {
    setTaloes(prev => ({
      ...prev,
      [tipo]: prev[tipo].map(t => {
        if (t.id !== id) return t
        if (field.startsWith('peca_')) {
          const i = parseInt(field.split('_')[1])
          const p = [...t.pecas]; p[i] = val
          return { ...t, pecas: p }
        }
        return { ...t, [field]: val }
      })
    }))
    setSaved(prev => ({ ...prev, [tipo]: false }))
  }

  async function savePonto(ponto: string, table: string, needsPredio = false) {
    setSaving(prev => ({ ...prev, [ponto]: true }))
    const { data: { session } } = await supabase.auth.getSession()
    const pecas = vals[ponto]
    const hasAny = pecas.some(v => v !== '')
    if (!hasAny) { setSaving(prev => ({ ...prev, [ponto]: false })); return }

    let q = supabase.from(table).delete().eq('data', date).eq('ponto', ponto).eq('lavanderia', lavanderia)
    if (needsPredio && predio) q = q.eq('predio', predio)
    await q

    const row: any = {
      data: date, ponto, lavanderia,
      ...PECAS.reduce((acc, k, i) => ({ ...acc, [k]: parseInt(pecas[i]) || null }), {}),
      total: pecas.reduce((s, v) => s + (parseInt(v) || 0), 0),
      registrado_por: session?.user.id,
    }
    if (needsPredio && predio) row.predio = predio

    const { error } = await supabase.from(table).insert(row)
    setSaving(prev => ({ ...prev, [ponto]: false }))
    if (error) setErrors(prev => ({ ...prev, [ponto]: error.message }))
    else setSaved(prev => ({ ...prev, [ponto]: true }))
  }

  async function saveTalao(tipo: string, table: string, needsPredio = false) {
    setSaving(prev => ({ ...prev, [tipo]: true }))
    const ts = taloes[tipo]
    if (!ts.length) { setSaving(prev => ({ ...prev, [tipo]: false })); return }
    const { data: { session } } = await supabase.auth.getSession()

    let q = supabase.from(table).delete().eq('data', date).eq('ponto', tipo).eq('lavanderia', lavanderia)
    if (needsPredio && predio) q = q.eq('predio', predio)
    await q

    const rows = ts.map(t => ({
      data: date, ponto: tipo, lavanderia,
      numero_talao: t.numero || null,
      data_cos: t.data_cos || null,
      predio_origem: t.predio_origem || null,
      ...(needsPredio && predio ? { predio } : {}),
      ...PECAS.reduce((acc, k, i) => ({ ...acc, [k]: parseInt(t.pecas[i]) || null }), {}),
      total: t.pecas.reduce((s, v) => s + (parseInt(v) || 0), 0),
      registrado_por: session?.user.id,
    }))

    const { error } = await supabase.from(table).insert(rows)
    setSaving(prev => ({ ...prev, [tipo]: false }))
    if (error) setErrors(prev => ({ ...prev, [tipo]: error.message }))
    else setSaved(prev => ({ ...prev, [tipo]: true }))
  }

  const prediosFiltrados = lavanderia === 'ELIS' ? ELIS_PREDIOS : PW_PREDIOS.sort()

  return (
    <div>
      {/* Header com filtros */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Pontos de Controle</h1>
          <p className="text-sm text-gray-400 mt-0.5">A · B · C · D · E · F · G · H · I · J · L · M · N</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Data</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Lavanderia</label>
          <select value={lavanderia} onChange={e => { setLavanderia(e.target.value as any); setPredio('') }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
            <option value="PW">PW</option>
            <option value="ELIS">ELIS</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Prédio</label>
          <select value={predio} onChange={e => setPredio(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
            <option value="">Selecionar prédio...</option>
            {prediosFiltrados.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* DEPÓSITO LIMPO */}
      <div className="rounded-xl overflow-hidden mb-4">
        <div className="flex items-center justify-between px-4 py-2.5 mb-2"
          style={{ background: '#EBF3FB', borderLeft: '3px solid #185FA5' }}>
          <span className="text-sm font-medium" style={{ color: '#0C447C' }}>Depósito Limpo — SKURBAN</span>
          <span className="text-xs" style={{ color: '#185FA5' }}>A · B · C · D</span>
        </div>
        {PONTOS_DL.map(p => (
          <PontoBlock key={p.id} id={p.id} label={p.label}
            values={vals[p.id]} onChange={(i: number, v: string) => setVal(p.id, i, v)}
            saved={saved[p.id]} saving={saving[p.id]}
            onSave={() => savePonto(p.id, 'deposito_limpo')}
            accentColor="#185FA5" readonly={!canEdit(p.id)} />
        ))}
      </div>

      {/* PRÉDIO LIMPO */}
      <div className="rounded-xl overflow-hidden mb-4">
        <div className="flex items-center justify-between px-4 py-2.5 mb-2"
          style={{ background: '#EAF3DE', borderLeft: '3px solid #3B6D11' }}>
          <span className="text-sm font-medium" style={{ color: '#27500A' }}>Prédio Limpo</span>
          <span className="text-xs" style={{ color: '#3B6D11' }}>E · F · G</span>
        </div>
        {!predio ? (
          <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-gray-400 text-sm mb-3">
            Selecione um prédio para preencher E, F e G
          </div>
        ) : PONTOS_PL.map(p => (
          <PontoBlock key={p.id} id={p.id} label={p.label}
            values={vals[p.id]} onChange={(i: number, v: string) => setVal(p.id, i, v)}
            saved={saved[p.id]} saving={saving[p.id]}
            onSave={() => savePonto(p.id, 'predio_limpo', true)}
            accentColor="#3B6D11" readonly={!canEdit(p.id)} />
        ))}
      </div>

      {/* PRÉDIO SUJO */}
      <div className="rounded-xl overflow-hidden mb-4">
        <div className="flex items-center justify-between px-4 py-2.5 mb-2"
          style={{ background: '#FAEEDA', borderLeft: '3px solid #854F0B' }}>
          <span className="text-sm font-medium" style={{ color: '#633806' }}>Prédio Sujo</span>
          <span className="text-xs" style={{ color: '#854F0B' }}>H · I · J</span>
        </div>
        {!predio ? (
          <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-gray-400 text-sm mb-3">
            Selecione um prédio para preencher H, I e J
          </div>
        ) : (
          <>
            <PontoBlock id="H" label="H — Sujo no depósito do prédio início da operação"
              values={vals.H} onChange={(i: number, v: string) => setVal('H', i, v)}
              saved={saved.H} saving={saving.H}
              onSave={() => savePonto('H', 'predio_sujo', true)}
              accentColor="#854F0B" readonly={!canEdit('H')} />
            <TalaoBlock tipo="I" label="I — Sujo retirado dos quartos (por talão)"
              accentColor="#854F0B"
              taloes={taloes.I}
              onAdd={() => addTalao('I')}
              onRemove={(id: number) => removeTalao('I', id)}
              onUpdate={(id: number, f: string, v: string) => updateTalao('I', id, f, v)}
              onSave={() => saveTalao('I', 'predio_sujo', true)}
              saved={saved.I} saving={saving.I} />
            {/* J automático */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-3">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-50"
                style={{ borderLeftWidth: 3, borderLeftColor: '#888' }}>
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold bg-gray-400">J</span>
                <span className="text-sm font-medium text-gray-900">J — Sujo esperado calculado (automático)</span>
              </div>
              <div className="px-4 py-3">
                {jAuto.every(v => v === '' || v === '0') ? (
                  <p className="text-sm text-gray-400">Nenhuma limpeza registrada para {predio} em {date}.</p>
                ) : (
                  <PecaRow prefix="J" values={jAuto} onChange={() => {}} readonly />
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* DEPÓSITO SUJO */}
      <div className="rounded-xl overflow-hidden mb-4">
        <div className="flex items-center justify-between px-4 py-2.5 mb-2"
          style={{ background: '#FCEBEB', borderLeft: '3px solid #A32D2D' }}>
          <span className="text-sm font-medium" style={{ color: '#791F1F' }}>Depósito Sujo — SKURBAN</span>
          <span className="text-xs" style={{ color: '#A32D2D' }}>L · M · N</span>
        </div>
        <TalaoBlock tipo="L" label="L — Sujos recebidos no depósito SKURBAN (por talão)"
          accentColor="#A32D2D"
          taloes={taloes.L}
          onAdd={() => addTalao('L')}
          onRemove={(id: number) => removeTalao('L', id)}
          onUpdate={(id: number, f: string, v: string) => updateTalao('L', id, f, v)}
          onSave={() => saveTalao('L', 'deposito_sujo')}
          saved={saved.L} saving={saving.L} />
        {PONTOS_DS_MN.map(p => (
          <PontoBlock key={p.id} id={p.id} label={p.label}
            values={vals[p.id]} onChange={(i: number, v: string) => setVal(p.id, i, v)}
            saved={saved[p.id]} saving={saving[p.id]}
            onSave={() => savePonto(p.id, 'deposito_sujo')}
            accentColor="#A32D2D" readonly={!canEdit(p.id)} />
        ))}
      </div>

      {/* Erros */}
      {Object.entries(errors).filter(([,v]) => v).map(([k, v]) => (
        <div key={k} className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-2">{k}: {v}</div>
      ))}
    </div>
  )
}
