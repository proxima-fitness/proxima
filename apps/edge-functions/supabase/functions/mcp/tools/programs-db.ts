// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Program list + prescription read against the OAuth user's RLS client
 * (ADR 0034 / 01). List membership mirrors landing `getSubscribedPrograms`
 * (`program_subscribers`). Grid shape mirrors `program-prescription.ts`.
 */

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.108.2'

export type TListedProgram = {
  id: number
  title: string
  /** On Program overview (Join / subscribe). Always true for list rows. */
  joined: true
}

export type TRepRange = { start: number; end: number }

export type TPrescriptionSet = {
  index: number
  type: string
  weight_kg: number | null
  reps: number | null
  distance_meters: null
  duration_seconds: number | null
  rpe: number | null
  custom_metric: null
  rep_range: TRepRange | null
}

export type TPrescriptionExercise = {
  index: number
  title: string
  notes: string
  rest_seconds: null
  exercise_template_id: string
  supersets_id: null
  sets: TPrescriptionSet[]
}

export type TPrescriptionRoutine = {
  id: string
  title: string
  /** 0-based week index. */
  folder_id: number
  notes: string
  /** 1-based day within the week. */
  order: string
  exercises: TPrescriptionExercise[]
}

export type TReadProgramResult =
  | {
    status: 'ok'
    program: {
      id: number
      title: string
      program_length: number | null
      routines: TPrescriptionRoutine[]
    }
  }
  | { status: 'not_found' }
  | { status: 'error'; error: string }

type TExerciseRow = {
  id?: string | null
  created_at?: string | null
  reps?: Array<number | null> | null
  reps_max?: number[] | null
  reps_range?: unknown
  rpe?: number[] | null
  rpe_range?: number[][] | null
  time_taken?: number[] | null
  time_range?: number[][] | null
  amrap?: string[] | null
  percent_rm?: number[] | null
  weights?: Array<number | null> | null
  set_types?: string[] | null
  hevy_exercise_templates?: { id?: string | null; title?: string | null } | null
}

type TDayRow = {
  id?: string | null
  nthDay?: number | null
  nthWeek?: number | null
  day_title?: string | null
  program_workout_exercises?: TExerciseRow[] | null
}

const PRESCRIPTION_SELECT = `
  id,
  title,
  program_length,
  schedule_workouts (
    id,
    nthDay,
    nthWeek,
    day_title,
    program_workout_exercises (
      id,
      created_at,
      reps,
      reps_max,
      reps_range,
      rpe,
      rpe_range,
      time_taken,
      time_range,
      amrap,
      percent_rm,
      weights,
      set_types,
      hevy_exercise_templates ( id, title )
    )
  )
`

/**
 * Programs on the caller's Program overview (Join rows).
 * Empty when the athlete has not Joined any Proxima program.
 */
export async function listPrograms(
  db: SupabaseClient,
  userId: string
): Promise<TListedProgram[]> {
  const { data: subscriptions, error: subError } = await db
    .from('program_subscribers')
    .select('program_id')
    .eq('user_id', userId)

  if (subError) {
    throw new Error(subError.message)
  }

  type TSubRow = { program_id: number | null }
  const programIds = [
    ...new Set(
      ((subscriptions ?? []) as TSubRow[])
        .map((row) => row.program_id)
        .filter((id): id is number => typeof id === 'number')
    ),
  ]

  if (programIds.length === 0) {
    return []
  }

  const { data: programs, error: programsError } = await db
    .from('programs')
    .select('id, title')
    .in('id', programIds)
    .order('id', { ascending: true })

  if (programsError) {
    throw new Error(programsError.message)
  }

  type TProgramListRow = { id: number; title: string | null }
  const rows = (programs ?? []) as TProgramListRow[]
  return rows.map((program) => ({
    id: program.id,
    title: program.title ?? 'Proxima Program',
    joined: true as const,
  }))
}

/**
 * Full Program prescription as Hevy-shaped routines for a Joined program.
 * Missing / not Joined → not_found (no vault default).
 */
export async function readProgram(
  db: SupabaseClient,
  userId: string,
  programId: number
): Promise<TReadProgramResult> {
  if (!Number.isInteger(programId) || programId <= 0) {
    return { status: 'not_found' }
  }

  const { data: sub, error: subError } = await db
    .from('program_subscribers')
    .select('program_id')
    .eq('user_id', userId)
    .eq('program_id', programId)
    .maybeSingle()

  if (subError) {
    return { status: 'error', error: subError.message }
  }
  if (!sub) {
    return { status: 'not_found' }
  }

  const { data, error } = await db
    .from('programs')
    .select(PRESCRIPTION_SELECT)
    .eq('id', programId)
    .maybeSingle()

  if (error) {
    return { status: 'error', error: error.message }
  }
  if (!data) {
    return { status: 'not_found' }
  }

  const days = (data.schedule_workouts ?? []) as TDayRow[]
  return {
    status: 'ok',
    program: {
      id: data.id,
      title: data.title ?? 'Proxima Program',
      program_length: data.program_length ?? null,
      routines: mapDaysToRoutines(days),
    },
  }
}

/** Exported for unit tests — same mapping as landing program-prescription. */
export function mapDaysToRoutines(days: readonly TDayRow[]): TPrescriptionRoutine[] {
  const byWeek = new Map<number, TDayRow[]>()
  for (const day of days) {
    const week = day.nthWeek
    if (week == null || week < 1) continue
    const bucket = byWeek.get(week) ?? []
    bucket.push(day)
    byWeek.set(week, bucket)
  }

  const weeks = [...byWeek.keys()].sort((a, b) => a - b)
  const routines: TPrescriptionRoutine[] = []
  for (const nthWeek of weeks) {
    const weekDays = [...(byWeek.get(nthWeek) ?? [])].sort(
      (a, b) => (a.nthDay ?? 0) - (b.nthDay ?? 0)
    )
    for (const [dayIndex, day] of weekDays.entries()) {
      const exercises = sortExercises(day.program_workout_exercises ?? [])
      routines.push({
        id: day.id ?? String(dayIndex + 1),
        title: day.day_title
          ? `${dayIndex + 1} - ${day.day_title}`
          : `Day ${dayIndex + 1}`,
        folder_id: nthWeek - 1,
        notes: '',
        order: String(dayIndex + 1),
        exercises: exercises.map((exercise, exerciseIndex) => ({
          index: exerciseIndex,
          title: exercise.hevy_exercise_templates?.title ?? 'Unknown Exercise',
          notes: '',
          rest_seconds: null,
          exercise_template_id: exercise.hevy_exercise_templates?.id ?? '',
          supersets_id: null,
          sets: buildSets(exercise),
        })),
      })
    }
  }
  return routines
}

function sortExercises(exercises: readonly TExerciseRow[]): TExerciseRow[] {
  return [...exercises].sort((a, b) => {
    const byCreated = (a.created_at ?? '').localeCompare(b.created_at ?? '')
    if (byCreated !== 0) return byCreated
    return (a.id ?? '').localeCompare(b.id ?? '')
  })
}

function positiveOrNull(value: number | null | undefined): number | null {
  return value == null || value <= 0 ? null : value
}

function repRangeAt(repsRange: unknown, index: number): TRepRange | null {
  if (!Array.isArray(repsRange)) return null
  const entry = repsRange[index]
  if (!Array.isArray(entry) || entry.length < 2) return null
  const [start, end] = entry
  if (typeof start !== 'number' || typeof end !== 'number') return null
  return { start, end }
}

function buildSets(exercise: TExerciseRow): TPrescriptionSet[] {
  const repsRange = Array.isArray(exercise.reps_range) ? exercise.reps_range : []
  const setCount = Math.max(
    exercise.reps?.length ?? 0,
    exercise.weights?.length ?? 0,
    exercise.rpe?.length ?? 0,
    exercise.rpe_range?.length ?? 0,
    exercise.time_taken?.length ?? 0,
    exercise.time_range?.length ?? 0,
    exercise.reps_max?.length ?? 0,
    exercise.amrap?.length ?? 0,
    exercise.percent_rm?.length ?? 0,
    repsRange.length
  )

  const sets: TPrescriptionSet[] = []
  for (let index = 0; index < setCount; index += 1) {
    const rep_range = repRangeAt(exercise.reps_range, index)
    const rpe = exercise.rpe?.[index] ?? exercise.rpe_range?.[index]?.[1] ?? null
    const duration =
      exercise.time_taken?.[index] ?? exercise.time_range?.[index]?.[1] ?? null

    sets.push({
      index,
      type: exercise.set_types?.[index] ?? 'normal',
      weight_kg: positiveOrNull(exercise.weights?.[index]),
      reps: rep_range ? null : (exercise.reps?.[index] ?? null),
      distance_meters: null,
      duration_seconds: positiveOrNull(duration),
      rpe: positiveOrNull(rpe),
      custom_metric: null,
      rep_range,
    })
  }
  return sets
}
