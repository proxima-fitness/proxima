/**
 * @module auth/confirm
 *
 * Email OTP confirmation callback route. Supabase redirects here after a user
 * clicks a magic-link or email confirmation link. The route verifies the OTP
 * token hash and, on success, redirects the user into the app.
 *
 * Depends on: @/utils/supabase/server (Supabase SSR client)
 * Used by: Supabase email templates (magic link / confirmation redirect URL)
 */

import { createClient } from '@/utils/supabase/server'
import { type EmailOtpType } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { type NextRequest } from 'next/server'
import { sanitizeSignInReturn } from '@/lib/sign-in-return'

/**
 * Verifies an email OTP token hash from the query string and redirects the
 * user to the app on success, or to an error page on failure.
 *
 * @param request - Incoming request with `token_hash`, `type`, and optional `next` query params.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = sanitizeSignInReturn(searchParams.get('next'))

  if (token_hash && type) {
    const supabase = await createClient()

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    if (!error) {
      // redirect user to specified redirect URL or root of app
      redirect(next)
    } else {
      // redirect the user to an error page with some instructions
      redirect(`/auth/error?error=${error?.message}`)
    }
  }

  // redirect the user to an error page with some instructions
  redirect(`/auth/error?error=No token hash or type`)
}
