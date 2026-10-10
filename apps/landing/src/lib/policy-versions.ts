// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module lib/policy-versions
 *
 * Pure policy version selection and stale legal-acceptance detection.
 *
 * Depends on: none
 * Used by: api/policy-versions, consent UI (01d+)
 */
function toSummary(row: TPolicyVersionRow): TPolicyVersionSummary {
    return {
        id: row.id,
        versionLabel: row.version_label,
        effectiveAt: row.effective_at,
    };
}

/**
 * Picks the latest effective row per document type from a policy_versions result set.
 */
export function selectCurrentPolicyVersions(
    rows: TPolicyVersionRow[],
    now: Date = new Date(),
): TCurrentPolicyVersions | null {
    const nowMs = now.getTime();
    const eligible = rows.filter((row) => new Date(row.effective_at).getTime() <= nowMs);

    const termsRow = eligible
        .filter((row) => row.document_type === "terms_of_use")
        .sort((a, b) => new Date(b.effective_at).getTime() - new Date(a.effective_at).getTime())[0];

    const privacyRow = eligible
        .filter((row) => row.document_type === "privacy_policy")
        .sort((a, b) => new Date(b.effective_at).getTime() - new Date(a.effective_at).getTime())[0];

    if (!termsRow || !privacyRow) {
        return null;
    }

    return {
        terms: toSummary(termsRow),
        privacy: toSummary(privacyRow),
    };
}

/** True when both FKs match the published current versions. */
export function isLegalAcceptanceCurrent(
    consents: TUserConsentsLegalFields | null | undefined,
    currentVersions: TCurrentPolicyVersions,
): boolean {
    if (!consents) {
        return false;
    }

    return (
        consents.terms_version_id === currentVersions.terms.id &&
        consents.privacy_version_id === currentVersions.privacy.id
    );
}

/** True when supplied version IDs match the published current versions. */
export function areVersionIdsCurrent(
    termsVersionId: string,
    privacyVersionId: string,
    currentVersions: TCurrentPolicyVersions,
): boolean {
    return (
        termsVersionId === currentVersions.terms.id &&
        privacyVersionId === currentVersions.privacy.id
    );
}
