import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.exchangeCodeForSession(code)
  }

  const type = requestUrl.searchParams.get('type')
  if (type === 'recovery') {
    return NextResponse.redirect(requestUrl.origin + '/auth/reset-password')
  }

  return NextResponse.redirect(requestUrl.origin + '/dashboard')
}
