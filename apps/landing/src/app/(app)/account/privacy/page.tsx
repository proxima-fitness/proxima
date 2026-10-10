// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module (app)/account/privacy/page
 *
 * Settings route for API key management and optional consent toggles. Sits at
 * src/app/(app)/account/privacy/page.tsx; route "/account/privacy".
 * Suspense wraps content because PrivacySettingsContent uses useSearchParams.
 *
 * Depends on: PrivacySettingsContent.
 * Used by: Next.js (route "/account/privacy").
 */

import { Suspense } from "react";

import { PrivacySettingsContent } from "@/components/account/PrivacySettingsContent";
import { Spinner } from "@/components/ui/spinner";

export const metadata = {
    title: "Settings | Proxima Fitness",
    description: "Manage your Proxima API key and optional privacy and marketing consent preferences.",
};

function PrivacyFallback() {
    return (
        <div className="min-h-[50vh] flex items-center justify-center px-4">
            <Spinner size="medium" />
        </div>
    );
}

/** Settings page; delegates to PrivacySettingsContent. */
export default function PrivacySettingsPage() {
    return (
        <Suspense fallback={<PrivacyFallback />}>
            <PrivacySettingsContent />
        </Suspense>
    );
}
