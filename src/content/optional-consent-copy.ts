/**
 * @module optional-consent-copy
 *
 * Shared labels for optional platform improvement and marketing consent UI.
 *
 * Used by: OptionalConsentPreferences, PrivacySettingsContent
 */

export const PLATFORM_IMPROVEMENT_CONSENT = {
    label: "Allow Proxima to use my usage data to improve the service.",
} as const;

export const MARKETING_CONSENT = {
    label: "Email me promotional updates about Proxima features, offers, and product news.",
} as const;

export type TOptionalConsentField = "platformImprovement" | "marketing";

type TOptionalConsentCopy = {
    readonly label: string;
};

export const OPTIONAL_CONSENT_COPY: Record<TOptionalConsentField, TOptionalConsentCopy> = {
    platformImprovement: PLATFORM_IMPROVEMENT_CONSENT,
    marketing: MARKETING_CONSENT,
};
