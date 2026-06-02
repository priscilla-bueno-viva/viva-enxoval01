'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleMagic(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email.endsWith('@vivastays.co')) {
      setError('Acesso restrito a e-mails @vivastays.co')
      return
    }
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
    if (err) setError('Erro ao enviar link. Tente novamente.')
    else setDone(true)
  }

  if (done) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 w-full max-w-sm text-center">
        <div className="text-4xl mb-4">📬</div>
        <h2 className="font-semibold text-gray-900 mb-2">Link enviado!</h2>
        <p className="text-sm text-gray-500">
          Verifique sua caixa de entrada em <strong>{email}</strong> e clique no link para acessar.
        </p>
        <p className="text-xs text-gray-400 mt-3">Pode fechar esta aba e abrir o link direto do e-mail.</p>
        <button onClick={() => { setDone(false); setError('') }}
          className="mt-5 text-xs text-blue-600 hover:underline">
          ← Voltar
        </button>
      </div>
    </div>
  )

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

        <form onSubmit={handleMagic}>
          <h2 className="font-semibold text-gray-900 mb-1">Entrar</h2>
          <p className="text-sm text-gray-400 mb-6">Digite seu e-mail e enviaremos um link de acesso</p>

          <label className="block text-xs text-gray-500 mb-1">E-mail corporativo</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="nome@vivastays.co" required autoFocus
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />

          {error && <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</div>}

          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-lg text-white text-sm font-medium transition disabled:opacity-60"
            style={{ background: '#02275B' }}>
            {loading ? 'Enviando...' : 'Enviar link de acesso ✉'}
          </button>
        </form>
      </div>
    </div>
  )
}
