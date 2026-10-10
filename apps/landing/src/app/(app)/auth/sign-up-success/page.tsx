/**
 * @module (app)/auth/sign-up-success/page
 *
 * Post sign-up success page. Card instructing user to check email to confirm.
 * Sits at src/app/(app)/auth/sign-up-success/page.tsx; route "/auth/sign-up-success".
 *
 * Depends on: Card components.
 * Used by: Next.js (route "/auth/sign-up-success").
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

/** Sign-up success; confirm-email message. */
export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Thank you for signing up!</CardTitle>
              <CardDescription>Check your email to confirm</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                You&apos;ve successfully signed up. Please check your email to confirm your account
                before signing in.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
