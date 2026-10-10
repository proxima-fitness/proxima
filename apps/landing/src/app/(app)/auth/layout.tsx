/**
 * @module (app)/auth/layout
 *
 * Layout for auth routes (login, sign-up, forgot-password, etc.). Pass-through
 * only; no shell. Sits at src/app/(app)/auth/layout.tsx; wraps all /auth/* routes.
 *
 * Depends on: none.
 * Used by: All (app)/auth/* pages.
 */

export const metadata = {
  title: 'Login or Signup',
  description: 'Login or Signup to your Proxima Account',
};

/**
 * Auth segment layout; renders children with no wrapper UI.
 *
 * @param props.children - The active auth page (e.g. login, sign-up).
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
      <>{children}</>
  )
}
