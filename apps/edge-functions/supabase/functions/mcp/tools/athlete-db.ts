/**
 * Athlete-surface reads against the OAuth user's RLS client (ADR 0034 / 11).
 * Query shapes mirror landing workout-history-read / body-measurements-read;
 * aggregates come only from @proxima/athlete-read. No live Hevy fetch.
 */

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.108.2'
import {
  aggregateProfileStatistics,
  aggregateSessionsByTemplateId,
  buildProfileTrainingMetrics,
  DEFAULT_BODY_MEASUREMENTS_LIMIT,
  DEFAULT_WORKOUT_HISTORY_LIMIT,
  getLocalMonthUtcBounds,
  getSinceIsoForWeekRange,
  groupWorkoutsByLocalDate,
  mapBackedUpWorkoutToHevyRoutine,
  normalizeMeasuredOnBound,
  paginateBodyMeasurements,
  paginateWorkoutBrowse,
  PREVIEW_MAX_EXERCISES,
  sortWorkoutNestedRows,
  transformSessionsToExercise,
  type TBrowseHevyRoutine,
  type TBrowseWorkoutRow,
  type TProfileCalendarWorkout,
  type TProfileStatisticsResponse,
  type TWorkoutHistoryCursor,
} from '@proxima/athlete-read'

const WORKOUT_NESTED_SELECT = `
    *,
    workout_exercises (
        *,
        canonical_exercises (*),
        workout_sets (*)
    )
`

const WORKOUT_NESTED_SELECT_INNER = `
    *,
    workout_exercises!inner (
        *,
        canonical_exercises (*),
        workout_sets (*)
    )
`

const HEVY_TEMPLATE_SELECT =
  'id, title, type, primary_muscle_group, secondary_muscle_groups, is_custom, equipment, normalized_title, gif_id, instructions'

const BODY_MEASUREMENT_SELECT =
  'id, measured_on, weight_kg, lean_mass_kg, fat_percent, neck_cm, shoulder_cm, chest_cm, left_bicep_cm, right_bicep_cm, left_forearm_cm, right_forearm_cm, abdomen, waist, hips, left_thigh, right_thigh, left_calf, right_calf'

export type TListWorkoutsOptions = {
  limit?: number
  since?: string
  cursorStartedAt?: string
  cursorId?: string
  preview?: boolean
  canonicalExerciseIds?: string[]
}

export type TListWorkoutsResult = {
  workouts: TBrowseHevyRoutine[]
  next_cursor: { started_at: string; id: string } | null
}

export type TBodyMeasurementRow = {
  id: string
  measured_on: string
  weight_kg: number | null
  lean_mass_kg: number | null
  fat_percent: number | null
  neck_cm: number | null
  shoulder_cm: number | null
  chest_cm: number | null
  left_bicep_cm: number | null
  right_bicep_cm: number | null
  left_forearm_cm: number | null
  right_forearm_cm: number | null
  abdomen: number | null
  waist: number | null
  hips: number | null
  left_thigh: number | null
  right_thigh: number | null
  left_calf: number | null
  right_calf: number | null
}

export type TListBodyMeasurementsOptions = {
  limit?: number
  since?: string
  until?: string
  cursorMeasuredOn?: string
  cursorId?: string
}

export type TListBodyMeasurementsResult = {
  measurements: TBodyMeasurementRow[]
  next_cursor: { measured_on: string; id: string } | null
}

export type TProfileCalendarResult = {
  year: number
  month: number
  workouts: TProfileCalendarWorkout[]
  /** Local YYYY-MM-DD → workouts that day (newest first). */
  days: Record<string, TProfileCalendarWorkout[]>
}

type THevyTemplateRow = {
  id: string
  title: string
}

/** Workout history browse — backed-up Workouts only (not live Hevy). */
export async function listWorkouts(
  db: SupabaseClient,
  userId: string,
  options: TListWorkoutsOptions = {}
): Promise<TListWorkoutsResult> {
  const page = await getWorkoutsForUser(db, userId, options)
  const previewMax = options.preview ? PREVIEW_MAX_EXERCISES : undefined
  return {
    workouts: page.workouts.map((workout) =>
      mapBackedUpWorkoutToHevyRoutine(workout, {
        previewMaxExercises: previewMax,
      })
    ),
    next_cursor: page.nextCursor
      ? { started_at: page.nextCursor.startedAt, id: page.nextCursor.id }
      : null,
  }
}

/** Profile statistics: 4/12-week Duration/Reps/Volume + consistency. */
export async function getProfileStatistics(
  db: SupabaseClient,
  userId: string,
  weeks: 4 | 12 = 4,
  referenceDate: Date = new Date()
): Promise<TProfileStatisticsResponse> {
  const since = getSinceIsoForWeekRange(referenceDate, weeks)
  const [workouts, startedAtTimestamps] = await Promise.all([
    getAllWorkoutsSinceForUser(db, userId, since),
    getAllWorkoutStartedAtForUser(db, userId),
  ])
  const chart = aggregateProfileStatistics(workouts, { weeks, referenceDate })
  const training = buildProfileTrainingMetrics(
    startedAtTimestamps,
    referenceDate,
    weeks
  )
  return { ...chart, ...training }
}

/** Profile calendar month highlights + day list. */
export async function getProfileCalendar(
  db: SupabaseClient,
  userId: string,
  year: number,
  month: number,
  timezoneOffsetMinutes: number
): Promise<TProfileCalendarResult> {
  const workouts = await getWorkoutsForMonthForUser(
    db,
    userId,
    year,
    month,
    timezoneOffsetMinutes
  )
  const grouped = groupWorkoutsByLocalDate(workouts)
  const days: Record<string, TProfileCalendarWorkout[]> = {}
  grouped.forEach((dayWorkouts, key) => {
    days[key] = dayWorkouts
  })
  return { year, month, workouts, days }
}

/** Body measurements history window (beyond get_latest_body_measurement). */
export async function listBodyMeasurements(
  db: SupabaseClient,
  userId: string,
  options: TListBodyMeasurementsOptions = {}
): Promise<TListBodyMeasurementsResult> {
  const limit = options.limit ?? DEFAULT_BODY_MEASUREMENTS_LIMIT
  const since = normalizeMeasuredOnBound(options.since)
  const until = normalizeMeasuredOnBound(options.until)

  let query = db
    .from('body_measurements')
    .select(BODY_MEASUREMENT_SELECT)
    .eq('user_id', userId)
    .order('measured_on', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1)

  if (since) query = query.gte('measured_on', since)
  if (until) query = query.lte('measured_on', until)
  if (options.cursorMeasuredOn && options.cursorId) {
    query = query.or(
      `measured_on.lt.${options.cursorMeasuredOn},and(measured_on.eq.${options.cursorMeasuredOn},id.lt.${options.cursorId})`
    )
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const page = paginateBodyMeasurements(
    (data ?? []) as TBodyMeasurementRow[],
    limit
  )
  return {
    measurements: page.measurements,
    next_cursor: page.nextCursor
      ? { measured_on: page.nextCursor.measuredOn, id: page.nextCursor.id }
      : null,
  }
}

/**
 * Blind spot analysis from backup (ungated v1 — full depth, C13).
 * No live Hevy; no Pro gate.
 */
export async function getBlindSpotAnalysis(
  db: SupabaseClient,
  userId: string,
  options: { exerciseTemplateIds?: string[] } = {}
) {
  const { data: templates, error: templatesError } = await db
    .from('hevy_exercise_templates')
    .select(HEVY_TEMPLATE_SELECT)
    .order('title', { ascending: true })

  if (templatesError || !templates?.length) {
    return { exercises: [] as ReturnType<typeof transformSessionsToExercise>[] }
  }

  const requestedIds = options.exerciseTemplateIds?.filter(Boolean) ?? []
  const typed = templates as THevyTemplateRow[]
  const orderedTemplates =
    requestedIds.length > 0
      ? requestedIds
          .map((id) => typed.find((template) => template.id === id))
          .filter((template): template is THevyTemplateRow => template != null)
      : typed

  const workouts = await getAllWorkoutsForUser(db, userId)
  const sessionsByTemplate = aggregateSessionsByTemplateId(workouts)

  // ponytail: omit empty templates to keep MCP payloads small; add all-templates when a host needs the full catalog
  const exercises = orderedTemplates
    .map((template) => {
      const sessions = sessionsByTemplate.get(template.id) ?? []
      if (sessions.length === 0) return null
      return transformSessionsToExercise(template, sessions, { isPro: true })
    })
    .filter((row): row is NonNullable<typeof row> => row != null)

  return { exercises }
}

async function getWorkoutsForUser(
  db: SupabaseClient,
  userId: string,
  options: TListWorkoutsOptions = {}
): Promise<{ workouts: TBrowseWorkoutRow[]; nextCursor: TWorkoutHistoryCursor | null }> {
  const limit = options.limit ?? DEFAULT_WORKOUT_HISTORY_LIMIT
  const canonicalExerciseIds = options.canonicalExerciseIds?.filter(Boolean) ?? []
  const useExerciseFilter = canonicalExerciseIds.length > 0

  let query = db
    .from('workouts')
    .select(useExerciseFilter ? WORKOUT_NESTED_SELECT_INNER : WORKOUT_NESTED_SELECT)
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1)

  if (options.since) query = query.gte('started_at', options.since)
  if (options.cursorStartedAt && options.cursorId) {
    query = query.or(
      `started_at.lt.${options.cursorStartedAt},and(started_at.eq.${options.cursorStartedAt},id.lt.${options.cursorId})`
    )
  }
  if (useExerciseFilter) {
    query = query.in(
      'workout_exercises.canonical_exercise_id',
      canonicalExerciseIds
    )
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const sorted = sortWorkoutNestedRows((data ?? []) as TBrowseWorkoutRow[])
  return paginateWorkoutBrowse(sorted, limit)
}

async function getAllWorkoutsSinceForUser(
  db: SupabaseClient,
  userId: string,
  since: string
): Promise<TBrowseWorkoutRow[]> {
  const pageSize = 100
  const all: TBrowseWorkoutRow[] = []
  let cursor: TWorkoutHistoryCursor | null = null

  for (;;) {
    const page = await getWorkoutsForUser(db, userId, {
      limit: pageSize,
      since,
      cursorStartedAt: cursor?.startedAt,
      cursorId: cursor?.id,
    })
    all.push(...page.workouts)
    if (!page.nextCursor) break
    cursor = page.nextCursor
  }
  return all
}

async function getAllWorkoutsForUser(
  db: SupabaseClient,
  userId: string
): Promise<TBrowseWorkoutRow[]> {
  const pageSize = 100
  const all: TBrowseWorkoutRow[] = []
  let cursor: TWorkoutHistoryCursor | null = null

  for (;;) {
    const page = await getWorkoutsForUser(db, userId, {
      limit: pageSize,
      cursorStartedAt: cursor?.startedAt,
      cursorId: cursor?.id,
    })
    all.push(...page.workouts)
    if (!page.nextCursor) break
    cursor = page.nextCursor
  }
  return all
}

async function getAllWorkoutStartedAtForUser(
  db: SupabaseClient,
  userId: string
): Promise<string[]> {
  const pageSize = 500
  const timestamps: string[] = []
  let cursor: TWorkoutHistoryCursor | null = null

  for (;;) {
    let query = db
      .from('workouts')
      .select('id, started_at')
      .eq('user_id', userId)
      .not('started_at', 'is', null)
      .order('started_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(pageSize + 1)

    if (cursor?.startedAt && cursor.id) {
      query = query.or(
        `started_at.lt.${cursor.startedAt},and(started_at.eq.${cursor.startedAt},id.lt.${cursor.id})`
      )
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)

    const rows = (data ?? []) as Array<{ id: string; started_at: string }>
    const hasMore = rows.length > pageSize
    const page = hasMore ? rows.slice(0, pageSize) : rows
    for (const row of page) {
      if (row.started_at) timestamps.push(row.started_at)
    }
    if (!hasMore) break
    const lastRow = page.at(-1)
    if (!lastRow) break
    cursor = { startedAt: lastRow.started_at, id: lastRow.id }
  }

  return timestamps
}

async function getWorkoutsForMonthForUser(
  db: SupabaseClient,
  userId: string,
  year: number,
  month: number,
  timezoneOffsetMinutes: number
): Promise<TProfileCalendarWorkout[]> {
  const { startIso, endIso } = getLocalMonthUtcBounds(
    year,
    month,
    timezoneOffsetMinutes
  )

  const { data, error } = await db
    .from('workouts')
    .select('id, title, started_at, ended_at')
    .eq('user_id', userId)
    .gte('started_at', startIso)
    .lt('started_at', endIso)
    .order('started_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as TProfileCalendarWorkout[]
}
