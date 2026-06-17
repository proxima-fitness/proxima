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

/** SessionStorage bridge: sign-up form stashes consents before Turnstile; auth helper persists after register. */
export const SIGN_UP_PENDING_CONSENTS_KEY = "proxima-sign-up-pending-consents";


export function stashSignUpPendingConsents(consents: TSignUpPendingConsents): void {
    sessionStorage.setItem(SIGN_UP_PENDING_CONSENTS_KEY, JSON.stringify(consents));
}

export function readSignUpPendingConsents(): TSignUpPendingConsents | null {
    const raw = sessionStorage.getItem(SIGN_UP_PENDING_CONSENTS_KEY);
    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw) as TSignUpPendingConsents;
    } catch {
        return null;
    }
}

export function clearSignUpPendingConsents(): void {
    sessionStorage.removeItem(SIGN_UP_PENDING_CONSENTS_KEY);
}
