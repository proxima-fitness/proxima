// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module @proxima/program-mutation-schemas
 *
 * Deno-safe program mutation zod schemas + normalize helpers.
 * Depends on: zod
 * Used by: landing mutations (slice 03); edge MCP (slice 03+)
 */

export * from "./schemas.ts";
export { normalizeRestSeconds, normalizeHevyApiRoutineForAddDay } from "./normalizeHevyApiRoutine.ts";
export { OP_NESTED_OBJECT_FIELDS } from "./normalizeAgentInput.ts";
