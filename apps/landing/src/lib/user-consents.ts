/**
 * @module lib/user-consents
 *
 * Pure user-consent patch builders.
 *
 * Depends on: none
 * Used by: api/user-consents, consent UI (01d+)
 */

/**
 * Builds a partial update for optional consent toggles with timestamp rules.
 */
export function buildOptionalConsentPatch(
    updates: TOptionalConsentUpdates,
    now: Date = new Date(),
): TOptionalConsentPatch {
    const patch: TOptionalConsentPatch = {
        updated_at: now.toISOString(),
    };

    if (updates.platformImprovementOptIn !== undefined) {
        patch.platform_improvement_opt_in = updates.platformImprovementOptIn;
        patch.platform_improvement_opt_in_at = updates.platformImprovementOptIn
            ? now.toISOString()
            : null;
    }

    if (updates.marketingOptIn !== undefined) {
        patch.marketing_opt_in = updates.marketingOptIn;
        patch.marketing_opt_in_at = updates.marketingOptIn ? now.toISOString() : null;
    }

    return patch;
}
