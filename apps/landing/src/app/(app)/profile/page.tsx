// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module (app)/profile/page
 *
 * Profile route. Wraps the client profile content (profile hero, programs vault, Hevy
 * grid, blind spot analysis, resume draft). Sits at src/app/(app)/profile/page.tsx; route "/profile".
 *
 * Depends on: ProfileContent.
 * Used by: Next.js (route "/profile").
 */

import { ProfileContent } from "./ProfileContent";


export const metadata = {
    title: "Profile | Proxima Fitness",
    description: "Your profile",
};

/** Profile page; delegates to ProfileContent. */
export default function ProfilePage() {
    return <ProfileContent />;
}
