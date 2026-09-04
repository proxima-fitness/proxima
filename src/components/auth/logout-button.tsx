'use client'

/**
 * @module logout-button
 * Button that signs out the user via Supabase and redirects to /auth/login
 * with **Sign-in return** set to the page they left (ADR 0001).
 * Depends on: Supabase client, UI Button, next/navigation, sign-in-return.
 * Used by: anywhere a logout control is needed (e.g. header/sidebar).
 */
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { buildAuthLoginHref } from '@/lib/sign-in-return'

/** No props. Renders a button that signs out and redirects to login with return. */
export function LogoutButton() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push(buildAuthLoginHref(pathname, searchParams))
  }

  return <Button onClick={logout}>Logout</Button>
}
