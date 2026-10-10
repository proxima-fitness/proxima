/**
 * @module program-week-model
 * Pure week builder shaping for the MCP App (ADR 0034 / 06–07).
 *
 * Spike (07): reimplement against tool JSON — extracting landing week
 * components would pull React/Next and blow the ~10-file sub-plan cap.
 *
 * Depends on: programs-db prescription routine shape, mutate-schema builder.
 * Used by: program-week-app.ts, program-week-model_test.ts.
 */

import type { TBuilderRoutine } from './mutate-schema.ts'
import type { TPrescriptionRoutine } from './programs-db.ts'

export type TProgramWeekBuilder = {
  program_id: number
  title: string
  week_index: number
  week_count: number
  /** Full in-memory grid for Accept / Save (all weeks). */
  builder_routines: TBuilderRoutine[]
  pending_proposal: boolean
  pending_op_count: number
}

/**
 * 0-based week indices present in the Hevy-shaped grid (`folder_id`).
 */
export function weekIndices(
  routines: readonly { folder_id: number }[],
): number[] {
  const set = new Set<number>()
  for (const routine of routines) {
    if (Number.isInteger(routine.folder_id) && routine.folder_id >= 0) {
      set.add(routine.folder_id)
    }
  }
  return [...set].sort((a, b) => a - b)
}

/**
 * Clamp a requested week into the program's week range. Empty program → 0.
 */
export function clampWeekIndex(
  requested: number,
  weekCount: number,
): number {
  if (weekCount <= 0) return 0
  if (!Number.isInteger(requested)) return 0
  if (requested < 0) return 0
  if (requested >= weekCount) return weekCount - 1
  return requested
}

/** Deep-clone prescription routines into builder shape for Accept/Save. */
export function cloneBuilderRoutines(
  routines: readonly TPrescriptionRoutine[],
): TBuilderRoutine[] {
  return structuredClone(routines) as TBuilderRoutine[]
}

/**
 * Days for one week (0-based index into sorted weekIndices), sorted by order.
 */
export function daysForWeek(
  routines: readonly TBuilderRoutine[],
  weekIndex: number,
): TBuilderRoutine[] {
  const indices = weekIndices(routines)
  if (indices.length === 0) return []
  const folderId = indices[clampWeekIndex(weekIndex, indices.length)]!
  return routines
    .filter((routine) => routine.folder_id === folderId)
    .slice()
    .sort((a, b) => Number(a.order) - Number(b.order))
}

/**
 * Patch one set field on the builder grid (manual Edit program edits).
 * Returns a new array; no-op clone if the slot is missing.
 */
export function patchBuilderSet(
  routines: readonly TBuilderRoutine[],
  dayId: string,
  exerciseIndex: number,
  setIndex: number,
  field: 'reps' | 'weight_kg' | 'rpe',
  value: number | null,
): TBuilderRoutine[] {
  return routines.map((day) => {
    if (day.id !== dayId) return day
    return {
      ...day,
      exercises: day.exercises.map((exercise, ei) => {
        if (ei !== exerciseIndex) return exercise
        return {
          ...exercise,
          sets: exercise.sets.map((set, si) => {
            if (si !== setIndex) return set
            return { ...set, [field]: value }
          }),
        }
      }),
    }
  })
}

/**
 * Week-builder payload for the MCP App iframe.
 */
export function buildProgramWeekBuilder(input: {
  program_id: number
  title: string
  routines: readonly TPrescriptionRoutine[]
  week_index: number
  pending_op_count?: number
}): TProgramWeekBuilder {
  const indices = weekIndices(input.routines)
  const week_count = indices.length
  const week_index = clampWeekIndex(input.week_index, week_count)
  const pending_op_count = input.pending_op_count ?? 0

  return {
    program_id: input.program_id,
    title: input.title,
    week_index,
    week_count,
    builder_routines: cloneBuilderRoutines(input.routines),
    pending_proposal: pending_op_count > 0,
    pending_op_count,
  }
}