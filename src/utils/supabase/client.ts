import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_KEY!
  )
}
