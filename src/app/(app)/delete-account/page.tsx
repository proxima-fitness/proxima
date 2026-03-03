/**
 * @module (app)/delete-account/page
 *
 * Delete-account page route. Placeholder with a delete-account CTA. Sits at
 * src/app/(app)/delete-account/page.tsx; route "/delete-account".
 *
 * Depends on: Button.
 * Used by: Next.js (route "/delete-account").
 */

import { Button } from "@/components/ui/button";

export const metadata = {
    title: "Delete Account | Proxima Fitness",
    description: "Get in touch with us",
};

/** Delete-account page; currently a placeholder with a single button. */
export default function DeleteAccount() {
    return (
        <div className='h-[900px] bg-white flex flex-col items-center justify-center'>
            <Button>Delete Account</Button>
        </div>
    );
}
