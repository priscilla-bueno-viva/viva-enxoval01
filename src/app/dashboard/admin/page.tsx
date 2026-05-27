'use client'
import { useEffect, useState } from 'react'
import { createClient, PW_PREDIOS, ELIS_PREDIOS } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const MODULOS = [
  { id: 'deposito_limpo', label: 'Depósito Limpo (A·B·C·D)' },
  { id: 'predio_limpo', label: 'Prédio Limpo (E·F·G)' },
  { id: 'predio_sujo', label: 'Prédio Sujo (H·I·J)' },
  { id: 'deposito_sujo', label: 'Depósito Sujo (L·M·N)' },
]
const TODOS_PREDIOS = [...ELIS_PREDIOS, ...PW_PREDIOS].sort()

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [editData, setEditData] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [isGestor, setIsGestor] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }
      const { data: prof } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).single()
      if (!prof?.is_gestor) { router.push('/dashboard'); return }
      setIsGestor(true)
      const { data: allUsers } = await supabase.from('user_profiles').select('*').order('email')
      setUsers(allUsers || [])
    }
    load()
  }, [])

  function startEdit(user: any) {
    setEditing(user.id)
    setEditData({ ...user, modulos: user.modulos || [], predios: user.predios || [] })
  }

  function toggleModulo(m: string) {
    setEditData((prev: any) => ({
      ...prev,
      modulos: prev.modulos.includes(m) ? prev.modulos.filter((x: string) => x !== m) : [...prev.modulos, m]
    }))
  }

  function togglePredio(p: string) {
    setEditData((prev: any) => ({
      ...prev,
      predios: prev.predios.includes(p) ? prev.predios.filter((x: string) => x !== p) : [...prev.predios, p]
    }))
  }

  async function saveUser() {
    setSaving(true)
    await supabase.from('user_profiles').update({
      nome: editData.nome,
      is_gestor: editData.is_gestor,
      modulos: editData.modulos,
      predios: editData.predios,
    }).eq('id', editing)
    const { data } = await supabase.from('user_profiles').select('*').order('email')
    setUsers(data || [])
    setEditing(null)
    setSaving(false)
  }

  if (!isGestor) return null

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Gestão de Usuários</h1>
        <p className="text-sm text-gray-400 mt-0.5">Defina módulos e prédios de acesso para cada membro do time</p>
      </div>

      <div className="space-y-3">
        {users.map(user => (
          <div key={user.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <div className="text-sm font-medium text-gray-900">{user.nome || user.email}</div>
                <div className="text-xs text-gray-400">{user.email}</div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {user.is_gestor && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">Gestor</span>
                  )}
                  {(user.modulos || []).map((m: string) => (
                    <span key={m} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {MODULOS.find(x => x.id === m)?.label || m}
                    </span>
                  ))}
                  {(user.predios || []).length > 0 && (
                    <span className="text-xs text-gray-400">
                      Prédios: {user.predios.join(', ')}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => startEdit(user)}
                className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                Editar
              </button>
            </div>

            {editing === user.id && (
              <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Nome</label>
                    <input value={editData.nome || ''} onChange={e => setEditData((p: any) => ({ ...p, nome: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none bg-white" />
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <input type="checkbox" id={`gestor-${user.id}`} checked={editData.is_gestor}
                      onChange={e => setEditData((p: any) => ({ ...p, is_gestor: e.target.checked }))} />
                    <label htmlFor={`gestor-${user.id}`} className="text-sm text-gray-700">Acesso de gestor</label>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-xs text-gray-500 mb-2 font-medium">Módulos</div>
                  <div className="flex flex-wrap gap-2">
                    {MODULOS.map(m => (
                      <button key={m.id} onClick={() => toggleModulo(m.id)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition
                          ${editData.modulos.includes(m.id) ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-200 text-gray-500 hover:bg-gray-100'}`}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-xs text-gray-500 mb-1 font-medium">
                    Prédios específicos <span className="font-normal text-gray-400">(vazio = todos os prédios do módulo)</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {TODOS_PREDIOS.map(p => (
                      <button key={p} onClick={() => togglePredio(p)}
                        className={`text-xs px-2 py-1 rounded border transition
                          ${editData.predios.includes(p) ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-100 text-gray-400 hover:border-gray-300'}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditing(null)} className="text-xs px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-100">
                    Cancelar
                  </button>
                  <button onClick={saveUser} disabled={saving}
                    className="text-xs px-4 py-2 rounded-lg text-white disabled:opacity-60"
                    style={{ background: '#02275B' }}>
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
