// SPDX-License-Identifier: AGPL-3.0-only

/**
 * First build land + persist for Proxima MCP (ADR 0034 / 03).
 * Plate week 1 → stamp Periodization wave → INSERT prescription + Join owner.
 *
 * Landmines vs Andy `buildProgram` (document, do not boil the ocean):
 * - No Jev / Program sanity LLM evaluate (C5 — no Gateway)
 * - No week-coverage / phase-hardness Soft-fails (pure helpers stay in landing)
 * - No expandHevyShareSeed / once-guard / stalemate
 * - Direct stamp (no mutation-registry applyOperations); share package if mutate needs same ops
 *
 * Depends on: build-schema, @supabase/supabase-js
 * Used by: build.ts, build-db_test.ts
 */

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.108.2'

import type {
  TBuildProgramInput,
  TExerciseRole,
  TPeriodizationWaveInput,
} from './build-schema.ts'

export type TRepRange = { start: number; end: number }

export type TStampedSet = {
  type: string
  reps: number | null
  rep_range: TRepRange | null
  rpe: number | null
  weight_kg: number | null
}

export type TStampedExercise = {
  exercise_template_id: string
  title: string
  notes: string
  rest_seconds: string | null
  supersets_id: number | null
  role: TExerciseRole
  sets: TStampedSet[]
}

export type TStampedRoutine = {
  id: string
  title: string
  folder_id: number
  notes: string
  order: string
  exercises: TStampedExercise[]
}

export type TPlateAndStampResult =
  | { ok: true; program: TStampedRoutine[] }
  | { ok: false; error: string; message: string }

export type TBuildProgramResult =
  | {
    status: 'ok'
    program_id: number
    title: string
    program_length: number
  }
  | { status: 'error'; error: string }

type TWaveWeek = TPeriodizationWaveInput['weeks'][number]
type TDelta = { rpeDelta: number; setCountDelta: number }

function fail(error: string, message: string): TPlateAndStampResult {
  return { ok: false, error, message }
}

function isWorkingSet(set: TStampedSet): boolean {
  return set.type !== 'warmup'
}

function clampRpe(rpe: number, delta: number): number {
  return Math.min(10, Math.max(1, rpe + delta))
}

function roleKey(dayOrder: number, exerciseIndex: number): string {
  return `${dayOrder}:${exerciseIndex}`
}

function waveByWeek(wave: TPeriodizationWaveInput): Map<number, TWaveWeek> {
  const rows = new Map<number, TWaveWeek>()
  for (const row of wave.weeks) {
    rows.set(row.week, row)
  }
  return rows
}

function deltasForRole(row: TWaveWeek, role: TExerciseRole): TDelta | null {
  if (role === 'warmup') return null
  if (role === 'main') return row.main
  return row.accessory ?? null
}

function paddedWorkingSets(
  working: TStampedSet[],
  targetCount: number
): TStampedSet[] {
  const out: TStampedSet[] = []
  const last = working[working.length - 1]
  for (let i = 0; i < targetCount; i++) {
    const source = working[i] ?? last
    if (source) out.push({ ...source })
  }
  return out
}

function applyDeltaToExercise(
  exercise: TStampedExercise,
  delta: TDelta,
  mainRepRange: TRepRange | null | undefined,
  role: TExerciseRole
): TStampedExercise {
  const applyRepRange = role === 'main' && mainRepRange != null
  const noOp =
    delta.setCountDelta === 0 && delta.rpeDelta === 0 && !applyRepRange
  if (noOp) {
    return {
      ...exercise,
      sets: exercise.sets.map((set) => ({ ...set })),
    }
  }

  const warmups = exercise.sets.filter((set) => !isWorkingSet(set)).map((
    set
  ) => ({ ...set }))
  const working = exercise.sets.filter(isWorkingSet)
  const targetCount = Math.max(1, working.length + delta.setCountDelta)
  const nextWorking = paddedWorkingSets(working, targetCount).map((set) => {
    const next: TStampedSet = { ...set }
    if (delta.rpeDelta !== 0 && next.rpe != null && Number.isFinite(next.rpe)) {
      next.rpe = clampRpe(next.rpe, delta.rpeDelta)
    }
    if (applyRepRange && mainRepRange != null) {
      if (mainRepRange.start === mainRepRange.end) {
        next.rep_range = null
        next.reps = next.reps ?? mainRepRange.start
      } else {
        next.rep_range = {
          start: mainRepRange.start,
          end: mainRepRange.end,
        }
      }
    }
    return next
  })

  return {
    ...exercise,
    sets: [...warmups, ...nextWorking],
  }
}

function week1Routines(input: TBuildProgramInput): TStampedRoutine[] {
  return [...input.routines]
    .sort((a, b) => a.dayNumber - b.dayNumber)
    .map((routine, index) => ({
      id: String(index + 1),
      title: routine.title,
      folder_id: 0,
      notes: routine.notes ?? '',
      order: String(routine.dayNumber),
      exercises: routine.exercises.map((exercise) => ({
        exercise_template_id: exercise.exercise_template_id,
        title: exercise.title,
        notes: exercise.notes ?? '',
        rest_seconds: exercise.rest_seconds ?? '90',
        supersets_id: exercise.supersets_id ?? null,
        role: exercise.role,
        sets: exercise.sets.map((set) => ({
          type: set.type,
          reps: set.reps,
          rep_range: set.rep_range,
          rpe: set.rpe,
          weight_kg: set.weight_kg ?? null,
        })),
      })),
    }))
}

/**
 * Plate week 1 across durationWeeks and apply Periodization wave deltas
 * directly (no mutation-registry ops).
 */
export function plateAndStamp(input: TBuildProgramInput): TPlateAndStampResult {
  const week1 = week1Routines(input)
  const roles = new Map<string, TExerciseRole>()
  let hasMain = false

  for (const day of week1) {
    const dayOrder = Number(day.order)
    day.exercises.forEach((exercise, exerciseIndex) => {
      roles.set(roleKey(dayOrder, exerciseIndex), exercise.role)
      if (exercise.role === 'main') hasMain = true
    })
  }

  if (!hasMain) {
    return fail(
      'periodizationStamp.emptyMains',
      'Week 1 needs at least one main. The Periodization wave has nothing to stamp.'
    )
  }

  const waveRows = waveByWeek(input.periodizationWave)
  const weekCount = Math.max(1, input.durationWeeks)
  const full: TStampedRoutine[] = []
  let routineId = 1

  for (let weekIndex = 0; weekIndex < weekCount; weekIndex++) {
    const weekNumber = weekIndex + 1
    const waveRow = waveRows.get(weekNumber)

    for (const day of week1) {
      const dayOrder = Number(day.order)
      const exercises = day.exercises.map((exercise, exerciseIndex) => {
        if (weekIndex === 0 || waveRow == null) {
          return {
            ...exercise,
            sets: exercise.sets.map((set) => ({ ...set })),
          }
        }
        const role = roles.get(roleKey(dayOrder, exerciseIndex))
        if (role == null) {
          return {
            ...exercise,
            sets: exercise.sets.map((set) => ({ ...set })),
          }
        }
        const delta = deltasForRole(waveRow, role)
        if (delta == null) {
          return {
            ...exercise,
            sets: exercise.sets.map((set) => ({ ...set })),
          }
        }
        return applyDeltaToExercise(
          exercise,
          delta,
          waveRow.mainRepRange,
          role
        )
      })

      full.push({
        ...day,
        id: String(routineId++),
        folder_id: weekIndex,
        exercises,
      })
    }
  }

  return { ok: true, program: full }
}

function buildRepsRange2D(
  sets: TStampedSet[]
): number[][] | null {
  if (!sets.length) return null
  const pairs: number[][] = []
  for (const set of sets) {
    const range = set.rep_range
    if (range == null) return null
    if (!Number.isFinite(range.start) || !Number.isFinite(range.end)) {
      return null
    }
    pairs.push([range.start, range.end])
  }
  return pairs
}

/**
 * Stamp + persist a new owned Proxima program and Join the caller.
 * `userId` is always the OAuth subject — never taken from tool input.
 */
export async function buildProgram(
  db: SupabaseClient,
  userId: string,
  input: TBuildProgramInput
): Promise<TBuildProgramResult> {
  const stamped = plateAndStamp(input)
  if (!stamped.ok) {
    return { status: 'error', error: `${stamped.error}: ${stamped.message}` }
  }

  const title =
    input.title?.trim() ||
    input.goal.trim() ||
    'My Proxima Program'
  const programLength = input.durationWeeks

  const { data: programRow, error: programsError } = await db
    .from('programs')
    .insert([{
      title,
      details: input.goal,
      program_length: programLength,
      prompt: input.goal,
      user_id: userId,
      mesocycle_blocks: input.blocks,
      explore: false,
    }])
    .select('id')
    .single()

  if (programsError) {
    return {
      status: 'error',
      error: programsError.code
        ? `[${programsError.code}] ${programsError.message}`
        : programsError.message,
    }
  }

  const programId = programRow?.id as number
  if (!Number.isInteger(programId)) {
    return { status: 'error', error: 'Program insert returned no id' }
  }

  const scheduleUploads = stamped.program.map((routine) => ({
    id: crypto.randomUUID(),
    nthWeek: (routine.folder_id ?? 0) + 1,
    nthDay: Number(routine.order || '1'),
    day_title: routine.title,
    day_notes: routine.notes ?? '',
    program_id: programId,
  }))

  const BATCH = 50
  for (let i = 0; i < scheduleUploads.length; i += BATCH) {
    const batch = scheduleUploads.slice(i, i + BATCH)
    const { error: scheduleError } = await db
      .from('schedule_workouts')
      .insert(batch)
    if (scheduleError) {
      return { status: 'error', error: scheduleError.message }
    }
  }

  const { data: templates, error: templatesError } = await db
    .from('hevy_exercise_templates')
    .select('id, title, normalized_title')
    .limit(10000)

  if (templatesError) {
    return { status: 'error', error: templatesError.message }
  }

  const validIds = new Set((templates ?? []).map((t) => t.id as string))
  const titleToId = new Map<string, string>()
  for (const template of templates ?? []) {
    const keyTitle = String(template.title ?? '').trim().toLowerCase()
    const keyNorm = String(template.normalized_title ?? '').trim()
      .toLowerCase()
    if (keyTitle && !titleToId.has(keyTitle)) {
      titleToId.set(keyTitle, template.id as string)
    }
    if (keyNorm && !titleToId.has(keyNorm)) {
      titleToId.set(keyNorm, template.id as string)
    }
  }

  const exerciseUploads: Record<string, unknown>[] = []
  for (let i = 0; i < stamped.program.length; i++) {
    const routine = stamped.program[i]
    const schedule = scheduleUploads[i]
    if (!schedule) continue

    for (const exercise of routine.exercises) {
      const rawId = exercise.exercise_template_id
      const exerciseTitle = exercise.title.trim()
      let exerciseId: string | null = null
      if (rawId && validIds.has(rawId)) {
        exerciseId = rawId
      } else if (exerciseTitle) {
        exerciseId = titleToId.get(exerciseTitle.toLowerCase()) ?? null
      }
      if (!exerciseId) {
        return {
          status: 'error',
          error:
            `Unknown exercise_template_id for "${exerciseTitle || rawId}". Call list_exercises first.`,
        }
      }

      const reps = exercise.sets.map((set) => set.reps)
      const reps_range = buildRepsRange2D(exercise.sets)
      const weights = exercise.sets.map((set) => set.weight_kg)
      const rpe = exercise.sets.map((set) => set.rpe)
      const set_types = exercise.sets.map((set) => set.type)

      exerciseUploads.push({
        schedule_id: schedule.id,
        exercise_id: exerciseId,
        reps,
        reps_range,
        reps_max: null,
        amrap: null,
        time_taken: null,
        time_range: null,
        weights: weights.every((w) => w == null) ? null : weights,
        rpe: rpe.every((value) => value == null) ? null : rpe,
        rpe_range: null,
        percent_rm: null,
        set_types,
      })
    }
  }

  for (let i = 0; i < exerciseUploads.length; i += BATCH) {
    const batch = exerciseUploads.slice(i, i + BATCH)
    if (batch.length === 0) continue
    const { error: workoutError } = await db
      .from('program_workout_exercises')
      .insert(batch)
    if (workoutError) {
      return { status: 'error', error: workoutError.message }
    }
  }

  const { error: joinError } = await db.from('program_subscribers').insert([{
    id: crypto.randomUUID(),
    user_id: userId,
    program_id: programId,
  }])

  if (joinError) {
    return {
      status: 'error',
      error:
        `Program created (${programId}) but Join failed: ${joinError.message}`,
    }
  }

  return {
    status: 'ok',
    program_id: programId,
    title,
    program_length: programLength,
  }
}
