/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/oauth/decision/route.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const formData = await request.formData()
  const decision = formData.get('decision')
  const authorizationId = formData.get('authorization_id') as string

  if (!authorizationId) {
    return NextResponse.json({ error: 'Missing authorization_id' }, { status: 400 })
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: async () => (await cookies()).getAll(),
        setAll: async (cookiesToSet: { name: any; value: any; options: any }[]) => {
          const cookieStore = await cookies()
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: any }) => cookieStore.set(name, value, options))
        },
      },
    }
  )

  if (decision === 'approve') {
    const { data, error } = await supabase.auth.oauth.approveAuthorization(authorizationId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Redirect back to the client with authorization code
    return NextResponse.redirect(data.redirect_url)
  } else {
    const { data, error } = await supabase.auth.oauth.denyAuthorization(authorizationId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Redirect back to the client with error
    return NextResponse.redirect(data.redirect_url)
  }
}