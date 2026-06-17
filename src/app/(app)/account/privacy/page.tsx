/**
 * @module (app)/account/privacy/page
 *
 * Privacy settings route for optional consent toggles. Sits at
 * src/app/(app)/account/privacy/page.tsx; route "/account/privacy".
 *
 * Depends on: PrivacySettingsContent.
 * Used by: Next.js (route "/account/privacy").
 */

import { PrivacySettingsContent } from "@/components/account/PrivacySettingsContent";

export const metadata = {
    title: "Privacy settings | Proxima Fitness",
    description: "Manage your optional privacy and marketing consent preferences.",
};

/** Privacy settings page; delegates to PrivacySettingsContent. */
export default function PrivacySettingsPage() {
    return <PrivacySettingsContent />;
}
