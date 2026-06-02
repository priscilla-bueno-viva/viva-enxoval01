'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { PADRAO, getLavanderia } from '@/lib/supabase'
import { UNIT_COMBO } from '@/lib/unitMap'

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
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('unidades').select('*').order('predio').order('unidade')
    setRows(data || [])
    setLoading(false)
  }

  // Importa todas as unidades do mapeamento estático para o banco
  async function importarPadrao() {
    setImporting(true)
    setMsg('')
    const toInsert: Omit<Unidade, 'id' | 'updated_at'>[] = []

    for (const [unidade, tipologia] of Object.entries(UNIT_COMBO)) {
      const predio = unidade.split(' ')[0]
      const combos = PADRAO[predio] || {}
      const pad = combos[tipologia] || [0, 0, 0, 0, 0, 0]
      toInsert.push({
        predio,
        unidade,
        tipologia,
        lc: pad[0], ls: pad[1], fr: pad[2],
        tb: pad[3], tr: pad[4], tp: pad[5],
      })
    }

    // Upsert em lotes de 200
    for (let i = 0; i < toInsert.length; i += 200) {
      const batch = toInsert.slice(i, i + 200)
      await supabase.from('unidades').upsert(batch, { onConflict: 'unidade' })
    }

    setImporting(false)
    setMsg(`✓ ${toInsert.length} unidades importadas!`)
    setTimeout(() => setMsg(''), 4000)
    load()
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
    setEditingId(null)
    setEditData({})
    setSaving(null)
  }

  const predios = useMemo(() => [...new Set(rows.map(r => r.predio))].sort(), [rows])

  const filtered = useMemo(() => rows.filter(r => {
    if (filterPredio && r.predio !== filterPredio) return false
    if (search && !r.unidade.toLowerCase().includes(search.toLowerCase()) && !r.tipologia.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [rows, filterPredio, search])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Cadastro de Unidades</h1>
          <p className="text-sm text-gray-400 mt-0.5">Tipologia e enxoval padrão por unidade · {rows.length} unidades cadastradas</p>
        </div>
        <div className="flex items-center gap-2">
          {msg && <span className="text-xs text-green-600 font-medium">{msg}</span>}
          <button
            onClick={importarPadrao}
            disabled={importing}
            className="text-xs px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-60 transition"
          >
            {importing ? 'Importando...' : '⬆ Importar padrão do sistema'}
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-5">
        <select
          value={filterPredio}
          onChange={e => setFilterPredio(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white"
        >
          <option value="">Todos os prédios</option>
          {predios.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar unidade ou tipologia..."
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
        />
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
                  const vals = PECAS_DB.map(k => isEditing ? (editData[k as keyof Unidade] ?? row[k as keyof Unidade]) : row[k as keyof Unidade]) as number[]
                  const total = vals.reduce((s, v) => s + (Number(v) || 0), 0)

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
                          <input
                            value={String(editData.tipologia ?? row.tipologia)}
                            onChange={e => setEditData(p => ({ ...p, tipologia: e.target.value }))}
                            className="w-full border border-blue-200 rounded px-2 py-1 text-xs focus:outline-none bg-white"
                          />
                        ) : row.tipologia}
                      </td>
                      {PECAS_DB.map((k, i) => (
                        <td key={k} className="px-2 py-2.5 text-center">
                          {isEditing ? (
                            <input
                              type="number" min="0"
                              value={String(editData[k as keyof Unidade] ?? row[k as keyof Unidade])}
                              onChange={e => setEditData(p => ({ ...p, [k]: e.target.value }))}
                              className="w-12 text-center border border-blue-200 rounded px-1 py-1 text-xs focus:outline-none bg-white"
                            />
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
                              className="text-xs px-2 py-1 border border-gray-200 rounded hover:bg-gray-100">
                              ✕
                            </button>
                            <button onClick={() => saveEdit(row)} disabled={saving === row.unidade}
                              className="text-xs px-3 py-1 rounded text-white disabled:opacity-60"
                              style={{ background: '#02275B' }}>
                              {saving === row.unidade ? '...' : '✓'}
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditingId(row.unidade); setEditData({}) }}
                            className="text-xs px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 transition">
                            Editar
                          </button>
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
