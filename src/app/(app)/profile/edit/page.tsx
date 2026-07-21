/**
 * @module (app)/profile/edit/page
 *
 * Edit profile route for identity and Constraint profile. Sits at
 * src/app/(app)/profile/edit/page.tsx; route "/profile/edit".
 *
 * Depends on: EditProfileContent.
 * Used by: Next.js (route "/profile/edit").
 */

import { EditProfileContent } from "@/components/account/EditProfileContent";

export const metadata = {
    title: "Edit profile | Proxima Fitness",
    description: "Edit your identity and Constraint Profile.",
};

/** Edit profile page; delegates to EditProfileContent. */
export default function EditProfilePage() {
    return <EditProfileContent />;
}
