'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function DashboardHome() {
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState({ limpezas: 0, registros: 0 })
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: prof } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).single()
      setProfile(prof)

      const [{ count: l }, { count: r }] = await Promise.all([
        supabase.from('limpezas').select('*', { count: 'exact', head: true }).eq('data', today),
        supabase.from('deposito_limpo').select('*', { count: 'exact', head: true }).eq('data', today),
      ])
      setStats({ limpezas: l || 0, registros: r || 0 })
    }
    load()
  }, [])

  const nome = profile?.nome || profile?.email?.split('@')[0] || 'Equipe'
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-1">{saudacao}, {nome} 👋</h1>
      <p className="text-sm text-gray-400 mb-8">
        {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="text-2xl font-semibold text-gray-900">{stats.limpezas}</div>
          <div className="text-sm text-gray-400 mt-1">Limpezas registradas hoje</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="text-2xl font-semibold text-gray-900">{stats.registros}</div>
          <div className="text-sm text-gray-400 mt-1">Pontos de controle hoje</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="font-medium text-gray-900 mb-4 text-sm">Fluxo do dia</h2>
        <div className="space-y-3">
          {[
            { label: 'Manhã — Depósito SKURBAN', pontos: 'A, B, C, D', cor: 'bg-blue-50 text-blue-700' },
            { label: 'Manhã — Prédios (Limpo)', pontos: 'E, F, G', cor: 'bg-green-50 text-green-700' },
            { label: 'Operação — Prédios (Sujo)', pontos: 'H, I, J', cor: 'bg-orange-50 text-orange-700' },
            { label: 'Tarde/Noite — Depósito SKURBAN (Sujo)', pontos: 'L, M, N', cor: 'bg-red-50 text-red-700' },
          ].map(f => (
            <div key={f.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-700">{f.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${f.cor}`}>{f.pontos}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
