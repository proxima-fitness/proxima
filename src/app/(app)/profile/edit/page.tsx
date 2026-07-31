/**
 * @module (app)/profile/edit/page
 *
 * Edit profile route for identity and Constraint profile. Sits at
 * src/app/(app)/profile/edit/page.tsx; route "/profile/edit".
 * Suspense wraps content because EditProfileContent uses useSearchParams.
 *
 * Depends on: EditProfileContent.
 * Used by: Next.js (route "/profile/edit").
 */

import { Suspense } from "react";

import { EditProfileContent } from "@/components/account/EditProfileContent";
import { Spinner } from "@/components/ui/spinner";

export const metadata = {
    title: "Edit profile | Proxima Fitness",
    description: "Edit your identity and Constraint Profile.",
};

function EditProfileFallback() {
    return (
        <div className="min-h-[50vh] flex items-center justify-center px-4">
            <Spinner size="medium" />
        </div>
    );
}

/** Edit profile page; delegates to EditProfileContent. */
export default function EditProfilePage() {
    return (
        <Suspense fallback={<EditProfileFallback />}>
            <EditProfileContent />
        </Suspense>
    );
}
