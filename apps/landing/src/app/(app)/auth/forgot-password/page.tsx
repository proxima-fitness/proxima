// SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @next/next/no-img-element */
/**
 * @module (app)/auth/forgot-password/page
 *
 * Forgot-password page. Form plus decorative images and gradients. Sits at
 * src/app/(app)/auth/forgot-password/page.tsx; route "/auth/forgot-password".
 *
 * Depends on: ForgotPasswordForm, public images.
 * Used by: Next.js (route "/auth/forgot-password").
 */

import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { ai_program_builder } from 'public'

/** Forgot-password page; form and side imagery. */
export default function Page() {
  return (
    <div className="bg-white dark:bg-darkGray flex flex-row sm:min-h-svh w-full items-center justify-around gap-24 md:p-10">
      <div className="w-full pr-12 max-sm:pr-0 max-w-md">
        <ForgotPasswordForm />
      </div>
    <div className={ `w-[50%] relative max-sm:hidden` } >
        <img src={ (ai_program_builder).src } alt="Program Creator Image" className="relative z-5" />
        {/* gradient start */}
        <div className="absolute z-0 w-[40%] h-[35%] top-0 pink__gradient" />
        <div className="absolute z-1 w-[80%] h-[80%] rounded-full white__gradient bottom-40" />
        <div className="absolute z-0 w-[50%] h-[50%] right-20 bottom-20 blue__gradient" />
        {/* gradient end */}
    </div>
    </div>
  )
}
