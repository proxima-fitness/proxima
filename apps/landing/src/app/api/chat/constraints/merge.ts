// SPDX-License-Identifier: AGPL-3.0-only

import { sanitizeExcludedEquipment } from './initialize';
import type { TConstraintProfile } from './types';

/**
 * Merges a persisted constraint profile (from DB) with a session profile
 * (from questionnaire params).
 *
 * When `persisted` is null: returns session (first-time seed).
 *
 * When `persisted` is non-null:
 * - Array fields (`injuries`, `excludedEquipment`, `excludedAreas`)
 *   use persisted only - do not union with session. Edit profile removals must stick;
 *   stale questionnaire/session strings must not resurrect on the next chat turn.
 * - Preferences: persisted only (same tradeoff as arrays). Cleared prefs must stick;
 *   stale questionnaire/session preference strings must not resurrect.
 *
 * Tradeoff: new questionnaire array or preference values for users with an existing
 * row must arrive via `updateConstraintProfile` or Edit profile Save - not merge alone.
 */
export function mergeConstraintProfiles(
    persisted: TConstraintProfile | null,
    session: TConstraintProfile,
): TConstraintProfile {
    if (!persisted) {
        return {
            ...session,
            excludedEquipment: sanitizeExcludedEquipment(session.excludedEquipment),
        };
    }

    return {
        injuries: persisted.injuries,
        excludedEquipment: sanitizeExcludedEquipment(persisted.excludedEquipment),
        excludedAreas: persisted.excludedAreas,
        preferences: { ...persisted.preferences },
    };
}
