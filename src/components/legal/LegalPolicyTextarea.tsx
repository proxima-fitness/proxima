/**
 * @module LegalPolicyTextarea
 *
 * Scrollable read-only textarea showing Privacy Policy and Terms of Use.
 *
 * Depends on: Textarea, content/legal-policy-text
 * Used by: LegalAcceptanceDialog, sign-up consents (01e)
 */
"use client";

import { COMBINED_LEGAL_POLICY_TEXT } from "@/content/legal-policy-text";
import { Textarea } from "@/components/ui/textarea";

/** Displays combined legal policy text in a scrollable read-only textarea. */
export function LegalPolicyTextarea() {
    return (
        <Textarea
            readOnly
            aria-label="Privacy Policy and Terms of Use"
            value={COMBINED_LEGAL_POLICY_TEXT}
            className="min-h-72 h-[50vh] max-h-128 resize-none overflow-y-auto bg-muted/30 text-sm leading-relaxed cursor-default focus-visible:ring-0"
        />
    );
}
