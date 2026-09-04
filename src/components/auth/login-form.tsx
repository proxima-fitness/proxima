'use client'

/**
 * @module login-form
 * Login card: Apple/Google OAuth buttons, email/password form with validation. On submit shows
 * Turnstile then TurnstileSignIn; supports redirect path and forgot-password link.
 * Depends on: TurnstileSignIn, Supabase client, UI components, react-hook-form/yup.
 * Used by: auth login page.
 */
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
import { useState } from 'react'
import { Separator } from '../ui/separator'
import { Provider } from '@supabase/supabase-js'
import { TurnstileSignIn } from './TurnstileSignIn'
import { buildAuthSignUpHrefFromNext, sanitizeSignInReturn } from '@/lib/sign-in-return'
import * as Yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from 'react-hook-form'

/** Props: div props plus redirectPath (where to send user after successful login; default '/'). */
type TLoginFormProps = React.ComponentPropsWithoutRef<'div'> & {
  redirectPath?: string;
};

/** Renders login card with OAuth, email/password form, and Turnstile-gated sign-in. */
export function LoginForm({ className, redirectPath = '/', ...props }: TLoginFormProps) {
    const safeRedirectPath = sanitizeSignInReturn(redirectPath);

    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [googleIsLoading,setGoogleIsLoading] = useState(false);
    const [appleIsLoading, setAppleIsLoading] = useState(false);
    const [turnstileOpen, setTurnstileOpen] = useState(false);

    const handleIsLoading = (isLoading: boolean) => {
        setIsLoading(isLoading);
    }

    const handleTurnstileOpen = (turnstileOpen: boolean) => {
        setTurnstileOpen(turnstileOpen);
    }

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
                redirectTo: `https://proximafitness.com/auth/oauth?next=${encodeURIComponent(safeRedirectPath)}`,
                },
            })

            if (error) throw error
        } catch (error: unknown) {
            setError(error instanceof Error ? error.message : 'An error occurred')
            setGoogleIsLoading(false);
            setAppleIsLoading(false);
        }
    }

    const schema = Yup.object({
        email: Yup.string()
            .email("Invalid email address")
            .required("Email is required"),
        password: Yup.string()
            .min(6, "Password must be at least 6 characters")
            .matches(/[0-9]/, "Password must contain at least one numeric character e.g. 123")
            .matches(/[a-z]/, "Password must contain at least one lowercase character")
            .matches(/[A-Z]/, "Password must contain at least one uppercase character")
            .matches(/[a-zA-Z]/, "Password must contain at least one alphabetic character e.g. abc")
            // .matches(/[^a-zA-Z0-9]/, PasswordSpecial[language])
            .required("Password is required"),
    });

    const { register, watch, handleSubmit, formState, setValue } = useForm({
        mode: "onChange",
        resolver: yupResolver(schema),
        defaultValues: {
            email: "",
            password: "",
        },
    } );

    const watchEmail = watch("email");
    const watchPassword = watch("password");
    const { onChange: onEmailChange } = register("email");
    const { onChange: onPasswordChange } = register("password");

    const handleLogin = () => {
        handleIsLoading(true)
        handleTurnstileOpen(true);
    }

    const handleTurnstileClose = () => {
        handleTurnstileOpen(false);
        handleIsLoading(false);
    }

    const handleSignInError = () => {
        setValue('password', '');
    }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className='bg-lightGray dark:bg-extraDarkGray dark:text-white'>
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
                </div>
           </form>
            </div>
           <Separator className=' my-4' />
          <form onSubmit={ handleSubmit(handleLogin) } id={ "sign-in-form"  }>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">{(formState?.errors?.email?.message && formState?.errors?.email?.message.length > 0)  ? formState.errors.email.message : "Email"}</Label>
                <Input
                    id="email"
                    type="email"
                    placeholder="lifter@proximafitness.com"
                    required
                    value={ watchEmail }
                    onInput={ (e) => {
                        onEmailChange({
                        target: {
                            name: "email",
                            value: e?.currentTarget?.value,
                        },
                        type: "email",
                        });
                    } }
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">{(formState?.errors?.password?.message && formState?.errors?.password?.message.length > 0)  ? formState.errors.password.message : "Password"}</Label>
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
                    value={ watchPassword }
                    onInput={ (e) => {
                        onPasswordChange({
                        target: {
                            name: "password",
                            value: e?.currentTarget?.value,
                        },
                        type: "password",
                        });
                    } }
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full bg-lightSecondary text-white" disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{' '}
              <Link href={buildAuthSignUpHrefFromNext(safeRedirectPath)} className="underline underline-offset-4">
                Sign up
              </Link>
            </div>
          </form>
        { turnstileOpen &&
            <TurnstileSignIn
                email={ watch().email }
                password={ watch().password }
                handleTurnstileClose={ handleTurnstileClose }
                onSignInError={ handleSignInError }
                redirectPath={ safeRedirectPath }
            />
        }
        </CardContent>
      </Card>
    </div>
  )
}
