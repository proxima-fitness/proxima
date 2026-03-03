"use client";

/**
 * @module forgot-password-form
 * Form to request a password reset: email input, submit triggers Turnstile then reset API.
 * Shows success state ("Check your email") when reset is sent.
 * Depends on: TurnstileResetPassword, UI card/input/button, cn.
 * Used by: auth forgot-password page.
 */
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useState } from 'react'
import { TurnstileResetPassword } from './TurnstileResetPassword';

/** Props: div props (e.g. className) for the form container. */
export function ForgotPasswordForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {

    const [email, setEmail] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [isLoading, setIsLoading] = useState(false);
    const [turnstileOpen, setTurnstileOpen] = useState(false);

    const handleForgotPassword = async () => {
        setIsLoading(true)
        setError(null)
        setTurnstileOpen(true)
    };

    return (
        <div className={cn('flex flex-col gap-6', className)} {...props}>
            {success ? (
                <Card className='bg-lightGray dark:bg-extraDarkGray dark:text-white'>
                    <CardHeader>
                        <CardTitle className="text-2xl">Check Your Email</CardTitle>
                        <CardDescription>Password reset instructions sent</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                        If you registered using your email and password, you will receive a password reset
                        email.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <Card className='bg-lightGray dark:bg-extraDarkGray dark:text-white'>
                    <CardHeader>
                        <CardTitle className="text-2xl">Reset Your Password</CardTitle>
                        <CardDescription>
                        Type in your email and we&apos;ll send you a link to reset your password
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleForgotPassword}>
                        <div className="flex flex-col gap-6">
                            <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="lifter@proximafitness.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            </div>
                            {error && <p className="text-sm text-red-500">{error}</p>}
                            <Button type="submit" className="w-full bg-lightSecondary text-white" disabled={isLoading}>
                            {isLoading ? 'Sending...' : 'Send reset email'}
                            </Button>
                        </div>
                        <div className="mt-4 text-center text-sm">
                            Already have an account?{' '}
                            <Link href="/auth/login" className="underline underline-offset-4">
                            Login
                            </Link>
                        </div>
                        </form>
                        { turnstileOpen && <TurnstileResetPassword email={email} setSuccess={setSuccess} /> }
                    </CardContent>
                </Card>
            )}
        </div>
  )
}
