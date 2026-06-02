'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const NAV = [
  { href: '/dashboard', label: 'Início', icon: '🏠', modulo: null },
  { href: '/dashboard/limpezas', label: 'Limpezas do Dia', icon: '🧹', modulo: null },
  { href: '/dashboard/previsao', label: 'Previsão de Envio', icon: '📦', modulo: null, sub: 'Calcule o que enviar amanhã' },
  { href: '/dashboard/controle', label: 'Pontos de Controle', icon: '📋', modulo: null, sub: 'A·B·C·D · E·F·G · H·I·J · L·M·N' },
  { href: '/dashboard/cruzamentos', label: 'Cruzamentos', icon: '⚖️', modulo: null },
  { href: '/dashboard/admin', label: 'Gestão de Usuários', icon: '👥', modulo: 'gestor' },
]

export function isGestorProfile(profile: any) {
  if (!profile) return false
  const g = profile.is_gestor
  return g === true || g === 'true' || g === 'TRUE' || g === 1 || g === '1'
}

export function getRoleLabel(profile: any) {
  if (isGestorProfile(profile)) return 'Gestor'
  const mods = profile?.modulos || []
  const arr = Array.isArray(mods) ? mods : []
  if (arr.includes('deposito')) return 'Depósito'
  if (arr.includes('operacoes')) return 'Operações'
  return ''
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }

      let { data: prof } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      // Fallback: busca por email se não encontrou por id
      if (!prof && session.user.email) {
        const { data: profByEmail } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('email', session.user.email)
          .single()
        prof = profByEmail
      }

      setProfile(prof)
      setLoading(false)
    }
    load()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-400 text-sm">Carregando...</div>
    </div>
  )

  function canAccess(modulo: string | null) {
    if (!modulo) return true
    if (!profile) return false
    if (isGestorProfile(profile)) return true
    if (modulo === 'gestor') return false
    const mods = profile.modulos || []
    const arr = Array.isArray(mods) ? mods : []
    return arr.includes(modulo)
  }

  const visibleNav = NAV.filter(n => canAccess(n.modulo))
  const roleLabel = getRoleLabel(profile)

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col border-r border-gray-100 bg-white">
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-100">
          <span className="text-xl">🧺</span>
          <div>
            <div className="text-xs font-semibold text-gray-900">Enxoval</div>
            <div className="text-xs text-gray-400">VIVA Stays</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 overflow-y-auto">
          {visibleNav.map(item => (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-0.5 text-sm transition group
                ${pathname === item.href
                  ? 'bg-blue-50 text-blue-900 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              <span>{item.icon}</span>
              <div className="min-w-0">
                <div className="truncate">{item.label}</div>
                {item.sub && <div className="text-xs text-gray-400">{item.sub}</div>}
              </div>
            </a>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-gray-100 px-3 py-3">
          <div className="text-xs text-gray-500 truncate mb-1">{profile?.nome || profile?.email}</div>
{roleLabel && (
            <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 mb-2">{roleLabel}</span>
          )}
          <button
            onClick={handleSignOut}
            className="text-xs text-gray-400 hover:text-gray-600 transition"
          >
            Sair →
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto bg-gray-50">
        <div className="max-w-5xl mx-auto px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
