/**
 * @module @proxima/program-mutation-schemas
 *
 * Deno-safe program mutation zod schemas + normalize helpers.
 * Depends on: zod
 * Used by: landing mutations (slice 03); edge MCP (slice 03+)
 */

export * from "./schemas";
export { normalizeRestSeconds, normalizeHevyApiRoutineForAddDay } from "./normalizeHevyApiRoutine";
export { OP_NESTED_OBJECT_FIELDS } from "./normalizeAgentInput";
