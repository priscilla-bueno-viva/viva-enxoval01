'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'

type Mode = 'password' | 'magic' | 'reset'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<Mode>('password')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  function validateEmail(e: string) {
    if (!e.endsWith('@vivastays.co')) {
      setError('Acesso restrito a e-mails @vivastays.co')
      return false
    }
    return true
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!validateEmail(email)) return
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) setError('E-mail ou senha incorretos.')
  }

  async function handleMagic(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!validateEmail(email)) return
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
    if (err) setError('Erro ao enviar link. Tente novamente.')
    else setDone(true)
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!validateEmail(email)) return
    setLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    })
    setLoading(false)
    if (err) setError('Erro ao enviar e-mail. Tente novamente.')
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
            <div className="text-4xl mb-4">{mode === 'reset' ? '🔑' : '📬'}</div>
            <h2 className="font-semibold text-gray-900 mb-2">
              {mode === 'reset' ? 'E-mail enviado!' : 'Link enviado!'}
            </h2>
            <p className="text-sm text-gray-500">
              {mode === 'reset'
                ? <>Verifique sua caixa de entrada em <strong>{email}</strong> e clique no link para definir sua senha.</>
                : <>Verifique sua caixa de entrada em <strong>{email}</strong> e clique no link para acessar.</>
              }
            </p>
            <button onClick={() => { setDone(false); setMode('password') }}
              className="mt-5 text-xs text-blue-600 hover:underline">
              Voltar ao login
            </button>
          </div>
        ) : mode === 'password' ? (
          <form onSubmit={handlePassword}>
            <h2 className="font-semibold text-gray-900 mb-1">Entrar</h2>
            <p className="text-sm text-gray-400 mb-6">E-mail e senha</p>

            <label className="block text-xs text-gray-500 mb-1">E-mail corporativo</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="nome@vivastays.co" required
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />

            <label className="block text-xs text-gray-500 mb-1">Senha</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />

            {error && <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</div>}

            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg text-white text-sm font-medium transition disabled:opacity-60"
              style={{ background: '#02275B' }}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

            <div className="flex justify-between mt-4">
              <button type="button" onClick={() => { setMode('reset'); setError('') }}
                className="text-xs text-gray-400 hover:text-gray-600">
                Esqueci minha senha
              </button>
              <button type="button" onClick={() => { setMode('magic'); setError('') }}
                className="text-xs text-gray-400 hover:text-gray-600">
                Entrar por link
              </button>
            </div>
          </form>
        ) : mode === 'magic' ? (
          <form onSubmit={handleMagic}>
            <h2 className="font-semibold text-gray-900 mb-1">Entrar por link</h2>
            <p className="text-sm text-gray-400 mb-6">Enviaremos um link de acesso para o seu e-mail</p>

            <label className="block text-xs text-gray-500 mb-1">E-mail corporativo</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="nome@vivastays.co" required
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />

            {error && <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</div>}

            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg text-white text-sm font-medium transition disabled:opacity-60"
              style={{ background: '#02275B' }}>
              {loading ? 'Enviando...' : 'Enviar link de acesso'}
            </button>

            <button type="button" onClick={() => { setMode('password'); setError('') }}
              className="w-full mt-3 text-xs text-gray-400 hover:text-gray-600">
              ← Voltar ao login com senha
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset}>
            <h2 className="font-semibold text-gray-900 mb-1">Definir senha</h2>
            <p className="text-sm text-gray-400 mb-6">Enviaremos um link para você criar ou redefinir sua senha</p>

            <label className="block text-xs text-gray-500 mb-1">E-mail corporativo</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="nome@vivastays.co" required
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />

            {error && <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</div>}

            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg text-white text-sm font-medium transition disabled:opacity-60"
              style={{ background: '#02275B' }}>
              {loading ? 'Enviando...' : 'Enviar link para definir senha'}
            </button>

            <button type="button" onClick={() => { setMode('password'); setError('') }}
              className="w-full mt-3 text-xs text-gray-400 hover:text-gray-600">
              ← Voltar ao login com senha
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
