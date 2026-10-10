// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module api/chat/constraints/validate
 *
 * Re-export shim — source of truth is `@proxima/mutation-constraint-gate` (ADR 0035).
 */

export {
    validateAgainstConstraints,
    type TConstraintViolation,
    type TValidationResult,
} from "@proxima/mutation-constraint-gate";
