/**
 * @module (app)/account/edit-profile/page
 *
 * Edit profile route for identity and Constraint profile. Sits at
 * src/app/(app)/account/edit-profile/page.tsx; route "/account/edit-profile".
 *
 * Depends on: EditProfileContent.
 * Used by: Next.js (route "/account/edit-profile").
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
