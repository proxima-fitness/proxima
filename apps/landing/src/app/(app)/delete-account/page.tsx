// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module (app)/delete-account/page
 *
 * Delete-account page route. Renders a CTA that opens the shared DeleteAccountDialog.
 * Sits at src/app/(app)/delete-account/page.tsx; route "/delete-account".
 *
 * Depends on: DeleteAccountPageContent (client).
 * Used by: Next.js (route "/delete-account").
 */

import { DeleteAccountPageContent } from "./DeleteAccountPageContent";

export const metadata = {
    title: "Delete Account | Proxima Fitness",
    description: "Permanently delete your Proxima account and all associated data.",
};

/** Delete-account page; opens the same DeleteAccountDialog as the Navbar/Sidebar menu. */
export default function DeleteAccount() {
    return <DeleteAccountPageContent />;
}
