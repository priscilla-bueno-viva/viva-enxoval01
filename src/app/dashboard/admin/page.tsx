'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { isGestorProfile } from '../layout'

const ROLES = [
  {
    id: 'gestor',
    label: 'Gestor',
    desc: 'Acesso total — visualiza e edita tudo',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    id: 'deposito',
    label: 'Depósito',
    desc: 'Edita pontos A·B·C·D · L·M·N + Previsão de Envio + Upload limpezas',
    color: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  {
    id: 'operacoes',
    label: 'Operações',
    desc: 'Edita pontos E·F·G · H·I·J',
    color: 'bg-green-50 text-green-700 border-green-200',
  },
]

function getRole(user: any) {
  if (isGestorProfile(user)) return 'gestor'
  const mods = Array.isArray(user.modulos) ? user.modulos : []
  if (mods.includes('deposito')) return 'deposito'
  if (mods.includes('operacoes')) return 'operacoes'
  return 'deposito' // default
}

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
      if (!isGestorProfile(prof)) { router.push('/dashboard'); return }
      setIsGestor(true)
      const { data: allUsers } = await supabase.from('user_profiles').select('*').order('email')
      setUsers(allUsers || [])
    }
    load()
  }, [])

  function startEdit(user: any) {
    setEditing(user.id)
    setEditData({ ...user, selectedRole: getRole(user), nome: user.nome || '' })
  }

  async function saveUser() {
    setSaving(true)
    const role = editData.selectedRole
    const isGestorRole = role === 'gestor'
    const modulos = role === 'deposito' ? ['deposito'] : role === 'operacoes' ? ['operacoes'] : []

    await supabase.from('user_profiles').update({
      nome: editData.nome,
      is_gestor: isGestorRole,
      modulos,
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
        <p className="text-sm text-gray-400 mt-0.5">Defina o perfil de acesso de cada membro do time</p>
      </div>

      {/* Legenda de perfis */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {ROLES.map(r => (
          <div key={r.id} className={`rounded-xl border p-4 ${r.color}`}>
            <div className="font-semibold text-sm mb-1">{r.label}</div>
            <div className="text-xs opacity-80">{r.desc}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {users.map(user => {
          const role = getRole(user)
          const roleInfo = ROLES.find(r => r.id === role)
          return (
            <div key={user.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <div className="text-sm font-medium text-gray-900">{user.nome || user.email}</div>
                  <div className="text-xs text-gray-400 mb-2">{user.email}</div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${roleInfo?.color}`}>
                    {roleInfo?.label}
                  </span>
                </div>
                <button onClick={() => startEdit(user)}
                  className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                  Editar
                </button>
              </div>

              {editing === user.id && (
                <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                  <div className="mb-4">
                    <label className="text-xs text-gray-500 block mb-1">Nome (opcional)</label>
                    <input value={editData.nome} onChange={e => setEditData((p: any) => ({ ...p, nome: e.target.value }))}
                      placeholder="Nome do colaborador"
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none bg-white" />
                  </div>

                  <div className="mb-5">
                    <div className="text-xs text-gray-500 mb-2 font-medium">Perfil de acesso</div>
                    <div className="grid grid-cols-3 gap-2">
                      {ROLES.map(r => (
                        <button key={r.id} onClick={() => setEditData((p: any) => ({ ...p, selectedRole: r.id }))}
                          className={`text-left p-3 rounded-xl border transition ${
                            editData.selectedRole === r.id
                              ? r.color + ' border-2'
                              : 'border-gray-200 bg-white hover:bg-gray-50'
                          }`}>
                          <div className="font-semibold text-sm mb-0.5">{r.label}</div>
                          <div className="text-xs opacity-70">{r.desc}</div>
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
          )
        })}
      </div>
    </div>
  )
}
