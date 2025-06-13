'use client'

import { cn } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Separator } from './ui/separator'
import { Provider } from '@supabase/supabase-js'

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [googleIsLoading,setGoogleIsLoading] = useState(false);
  const [appleIsLoading, setAppleIsLoading] = useState(false);

  const router = useRouter()

  const handleSocialLogin = async (e: React.FormEvent, provider: Provider) => {
    e.preventDefault()
    const supabase = createClient()
    if (provider === "apple") {
        setAppleIsLoading(true);
        setError(null);
    } else if (provider === "google") {
        setGoogleIsLoading(true);
        setError(null);
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `https://proximafitness.com/auth/oauth?next=/protected`,
        },
      })

      if (error) throw error
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
      setGoogleIsLoading(false);
      setAppleIsLoading(false);
    }
  }


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      // Update this route to redirect to an authenticated route. The user already has an active session.
      router.push('/protected')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
        </CardHeader>
        <CardContent>
            <div className='flex flex-col gap-4'>
            <form onSubmit={ (e) => handleSocialLogin(e, "apple")}>
                <div className="flex flex-col gap-6">
                    {error && <p className="text-sm text-destructive-500">{error}</p>}
                    <Button variant='outline' type="submit" className="w-full" disabled={isLoading}>
                        {appleIsLoading ? 'Logging in...' : 'Continue with Apple'}
                    </Button>
                </div>
           </form>
            <form onSubmit={ (e) => handleSocialLogin(e, "google")}>
                <div className="flex flex-col gap-6">
                    {error && <p className="text-sm text-destructive-500">{error}</p>}
                    <Button variant="outline" type="submit" className="w-full" disabled={isLoading}>
                        {googleIsLoading ? 'Logging in...' : 'Continue with Google'}
                    </Button>
                    <div
                        id="appleid-signin"
                        data-mode="center-align"
                        data-type="sign-in"
                        data-color="black"
                        data-border="false"
                        data-border-radius="15"
                        data-width="200"
                        data-height="35"
                        >
                    </div>

                </div>
           </form>
            </div>
           <Separator className=' my-4' />
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full bg-lightSecondary text-white" disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{' '}
              <Link href="/auth/sign-up" className="underline underline-offset-4">
                Sign up
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
