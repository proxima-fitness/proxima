'use client'

/**
 * @module logout-button
 * Button that signs out the user via Supabase and redirects to /auth/login.
 * Depends on: Supabase client, UI Button, next/navigation.
 * Used by: anywhere a logout control is needed (e.g. header/sidebar).
 */
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

/** No props. Renders a button that signs out and redirects to login. */
export function LogoutButton() {
  const router = useRouter()

  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return <Button onClick={logout}>Logout</Button>
}
