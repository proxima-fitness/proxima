/**
 * @module program-week-model
 * Pure week shell shaping for the MCP App (ADR 0034 / 06).
 * Depends on: programs-db prescription routine shape.
 * Used by: program-week-app.ts, program-week-model_test.ts.
 */

import type { TPrescriptionRoutine } from './programs-db.ts'

export type TWeekDayShell = {
  title: string
  order: string
  exercise_count: number
  exercises: Array<{ title: string; set_count: number }>
}

export type TProgramWeekShell = {
  program_id: number
  title: string
  week_index: number
  week_count: number
  days: TWeekDayShell[]
}

/**
 * 0-based week indices present in the Hevy-shaped grid (`folder_id`).
 */
export function weekIndices(routines: readonly TPrescriptionRoutine[]): number[] {
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

/**
 * One-week shell for the MCP App iframe (placeholders OK — full builder is 07).
 */
export function buildProgramWeekShell(input: {
  program_id: number
  title: string
  routines: readonly TPrescriptionRoutine[]
  week_index: number
}): TProgramWeekShell {
  const indices = weekIndices(input.routines)
  const week_count = indices.length
  const week_index = clampWeekIndex(input.week_index, week_count)
  const folderId = week_count === 0 ? 0 : indices[week_index]!

  const days = input.routines
    .filter((routine) => routine.folder_id === folderId)
    .slice()
    .sort((a, b) => Number(a.order) - Number(b.order))
    .map((routine) => ({
      title: routine.title,
      order: routine.order,
      exercise_count: routine.exercises.length,
      exercises: routine.exercises.map((exercise) => ({
        title: exercise.title,
        set_count: exercise.sets.length,
      })),
    }))

  return {
    program_id: input.program_id,
    title: input.title,
    week_index,
    week_count,
    days,
  }
}
