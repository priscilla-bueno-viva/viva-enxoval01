'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const NAV = [
  { href: '/dashboard', label: 'Início', icon: '🏠', modulo: null },
  { href: '/dashboard/limpezas', label: 'Limpezas do Dia', icon: '🧹', modulo: null },
  { href: '/dashboard/deposito-limpo', label: 'Depósito Limpo', icon: '🏭', modulo: 'deposito_limpo', sub: 'A · B · C · D' },
  { href: '/dashboard/predio-limpo', label: 'Prédio Limpo', icon: '🏢', modulo: 'predio_limpo', sub: 'E · F · G' },
  { href: '/dashboard/predio-sujo', label: 'Prédio Sujo', icon: '🏢', modulo: 'predio_sujo', sub: 'H · I · J' },
  { href: '/dashboard/deposito-sujo', label: 'Depósito Sujo', icon: '🏭', modulo: 'deposito_sujo', sub: 'L · M · N' },
  { href: '/dashboard/cruzamentos', label: 'Cruzamentos', icon: '⚖️', modulo: null },
  { href: '/dashboard/admin', label: 'Gestão de Usuários', icon: '👥', modulo: 'gestor' },
]

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

      const { data: prof } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

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
    if (profile?.is_gestor) return true
    if (modulo === 'gestor') return false
    return profile?.modulos?.includes(modulo)
  }

  const visibleNav = NAV.filter(n => canAccess(n.modulo))

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
          <div className="text-xs text-gray-500 truncate mb-1">{profile?.email}</div>
          {profile?.is_gestor && (
            <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 mb-2">Gestor</span>
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
