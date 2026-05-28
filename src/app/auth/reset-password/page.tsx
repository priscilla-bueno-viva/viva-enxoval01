'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('A senha deve ter ao menos 6 caracteres.'); return }
    if (password !== confirm) { setError('As senhas não coincidem.'); return }
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) setError('Erro ao definir senha. Tente novamente.')
    else setDone(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ background: '#02275B' }}>
            🧺
          </div>
          <div>
            <div className="font-semibold text-gray-900 text-sm">VIVA Stays</div>
            <div className="text-xs text-gray-400">Controle de Enxoval</div>
          </div>
        </div>

        {done ? (
          <div className="text-center">
            <div className="text-4xl mb-4">✅</div>
            <h2 className="font-semibold text-gray-900 mb-2">Senha definida!</h2>
            <p className="text-sm text-gray-500 mb-5">Você já pode entrar com sua nova senha.</p>
            <button onClick={() => router.push('/')}
              className="w-full py-2.5 rounded-lg text-white text-sm font-medium"
              style={{ background: '#02275B' }}>
              Ir para o login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 className="font-semibold text-gray-900 mb-1">Definir senha</h2>
            <p className="text-sm text-gray-400 mb-6">Escolha uma senha para acessar o sistema</p>

            <label className="block text-xs text-gray-500 mb-1">Nova senha</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required minLength={6}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />

            <label className="block text-xs text-gray-500 mb-1">Confirmar senha</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="••••••••" required
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />

            {error && <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</div>}

            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg text-white text-sm font-medium transition disabled:opacity-60"
              style={{ background: '#02275B' }}>
              {loading ? 'Salvando...' : 'Salvar senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
