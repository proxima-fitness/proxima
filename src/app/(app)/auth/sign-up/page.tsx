/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @module (app)/auth/sign-up/page
 *
 * Sign-up page. Renders SignUpForm with side imagery and gradients. Sits at
 * src/app/(app)/auth/sign-up/page.tsx; route "/auth/sign-up".
 *
 * Depends on: SignUpForm, public images.
 * Used by: Next.js (route "/auth/sign-up").
 */

import { SignUpForm } from '@/components/auth/sign-up-form'
import { ai_program_builder } from 'public'

/** Sign-up page; form and side imagery. */
export default function Page() {
  return (
    <div className="bg-white dark:bg-darkGray flex flex-row sm:min-h-svh w-full items-center justify-around gap-24 md:p-10">
      <div className="w-full pr-12 max-sm:pr-0 max-w-md">
        <SignUpForm />
      </div>
    <div className={ `w-[50%] relative max-sm:hidden` } >
        <img src={ (ai_program_builder as any).src } alt="Program Creator Image" className="relative z-5" />
        {/* gradient start */}
        <div className="absolute z-0 w-[40%] h-[35%] top-0 pink__gradient" />
        <div className="absolute z-1 w-[80%] h-[80%] rounded-full white__gradient bottom-40" />
        <div className="absolute z-0 w-[50%] h-[50%] right-20 bottom-20 blue__gradient" />
        {/* gradient end */}
    </div>
    </div>
  )
}
