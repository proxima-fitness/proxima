// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module api/exercise-identity
 *
 * Re-export shim — source of truth is `@proxima/exercise-identity` (ADR 0035).
 * Depends on: @proxima/exercise-identity
 * Used by: api/workout-history (sync), api/custom-movements (Week Export mint)
 */

export { normalizeExerciseTitle, exerciseMatchKey } from "@proxima/exercise-identity";
