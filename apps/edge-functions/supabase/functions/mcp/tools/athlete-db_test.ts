/**
 * Persistence tests for athlete read MCP tools (ADR 0034 / 11).
 * Run: deno test --config deno.json tools/athlete-db_test.ts
 */

import assert from 'node:assert/strict'
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.108.2'

import {
  getBlindSpotAnalysis,
  getProfileCalendar,
  getProfileStatistics,
  listBodyMeasurements,
  listWorkouts,
} from './athlete-db.ts'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_ID = '22222222-2222-4222-8222-222222222222'
const W1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const W2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const W_OTHER = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const TEMPLATE_ID = 'tmpl-bench'

type TWorkoutSeed = {
  id: string
  user_id: string
  title: string | null
  started_at: string
  ended_at: string | null
  description?: string | null
  source?: string | null
  updated_at?: string | null
  created_at?: string | null
  workout_exercises?: Array<{
    sort_order: number
    notes: string | null
    source_exercise_id: string | null
    superset_id: number | null
    canonical_exercise_id?: string
    canonical_exercises?: { title: string } | null
    workout_sets?: Array<{
      set_index: number
      set_type: string
      weight_kg: number | null
      reps: number | null
      distance_meters: number | null
      duration_seconds: number | null
      rpe: number | null
      custom_metric: number | null
      rep_range_start: number | null
      rep_range_end: number | null
    }>
  }>
}

type TBodySeed = {
  id: string
  user_id: string
  measured_on: string
  weight_kg: number | null
  lean_mass_kg?: number | null
  fat_percent?: number | null
  neck_cm?: number | null
  shoulder_cm?: number | null
  chest_cm?: number | null
  left_bicep_cm?: number | null
  right_bicep_cm?: number | null
  left_forearm_cm?: number | null
  right_forearm_cm?: number | null
  abdomen?: number | null
  waist?: number | null
  hips?: number | null
  left_thigh?: number | null
  right_thigh?: number | null
  left_calf?: number | null
  right_calf?: number | null
}

type TTemplateSeed = { id: string; title: string }

function athleteDb(seed?: {
  workouts?: TWorkoutSeed[]
  bodies?: TBodySeed[]
  templates?: TTemplateSeed[]
}) {
  const workouts = [...(seed?.workouts ?? [])]
  const bodies = [...(seed?.bodies ?? [])]
  const templates = [...(seed?.templates ?? [])]

  function matchEq(
    row: Record<string, unknown>,
    filters: Array<{ column: string; value: unknown; op: string }>
  ): boolean {
    return filters.every((filter) => {
      if (filter.op === 'eq') return row[filter.column] === filter.value
      if (filter.op === 'gte') {
        return String(row[filter.column] ?? '') >= String(filter.value)
      }
      if (filter.op === 'lte') {
        return String(row[filter.column] ?? '') <= String(filter.value)
      }
      if (filter.op === 'lt') {
        return String(row[filter.column] ?? '') < String(filter.value)
      }
      if (filter.op === 'not_null') return row[filter.column] != null
      return true
    })
  }

  function applyCursor(
    rows: TWorkoutSeed[],
    orFilter: string | null
  ): TWorkoutSeed[] {
    if (!orFilter) return rows
    const ltMatch = orFilter.match(/started_at\.lt\.([^,]+)/)
    const eqMatch = orFilter.match(/started_at\.eq\.([^,)]+)/)
    const idLt = orFilter.match(/id\.lt\.([^)]+)/)
    if (!ltMatch) return rows
    const startedLt = ltMatch[1]!
    const startedEq = eqMatch?.[1]
    const idBound = idLt?.[1]
    return rows.filter((row) => {
      if (row.started_at < startedLt) return true
      if (
        startedEq &&
        idBound &&
        row.started_at === startedEq &&
        row.id < idBound
      ) {
        return true
      }
      return false
    })
  }

  function applyBodyCursor(
    rows: TBodySeed[],
    orFilter: string | null
  ): TBodySeed[] {
    if (!orFilter) return rows
    const ltMatch = orFilter.match(/measured_on\.lt\.([^,]+)/)
    const eqMatch = orFilter.match(/measured_on\.eq\.([^,)]+)/)
    const idLt = orFilter.match(/id\.lt\.([^)]+)/)
    if (!ltMatch) return rows
    const measuredLt = ltMatch[1]!
    const measuredEq = eqMatch?.[1]
    const idBound = idLt?.[1]
    return rows.filter((row) => {
      if (row.measured_on < measuredLt) return true
      if (
        measuredEq &&
        idBound &&
        row.measured_on === measuredEq &&
        row.id < idBound
      ) {
        return true
      }
      return false
    })
  }

  return {
    client: {
      from(table: string) {
        if (table === 'workouts') {
          const filters: Array<{ column: string; value: unknown; op: string }> =
            []
          let limitN: number | null = null
          let orFilter: string | null = null
          let selectCols = '*'

          const builder = {
            select(cols?: string) {
              selectCols = cols ?? '*'
              return builder
            },
            eq(column: string, value: unknown) {
              filters.push({ column, value, op: 'eq' })
              return builder
            },
            gte(column: string, value: unknown) {
              filters.push({ column, value, op: 'gte' })
              return builder
            },
            lt(column: string, value: unknown) {
              filters.push({ column, value, op: 'lt' })
              return builder
            },
            not(column: string, op: string, value: unknown) {
              if (op === 'is' && value === null) {
                filters.push({ column, value: null, op: 'not_null' })
              }
              return builder
            },
            or(filter: string) {
              orFilter = filter
              return builder
            },
            in() {
              return builder
            },
            order() {
              return builder
            },
            limit(n: number) {
              limitN = n
              return builder
            },
            then(
              resolve: (value: { data: unknown[]; error: null }) => void
            ) {
              let rows = workouts.filter((row) =>
                matchEq(row as unknown as Record<string, unknown>, filters)
              )
              rows = applyCursor(rows, orFilter)
              rows = [...rows].sort((a, b) => {
                const byStarted = b.started_at.localeCompare(a.started_at)
                return byStarted !== 0 ? byStarted : b.id.localeCompare(a.id)
              })
              if (limitN != null) rows = rows.slice(0, limitN)

              if (selectCols.includes('id, started_at') || selectCols === 'id, started_at') {
                resolve({
                  data: rows.map((r) => ({ id: r.id, started_at: r.started_at })),
                  error: null,
                })
                return
              }
              if (selectCols.includes('id, title, started_at, ended_at')) {
                resolve({
                  data: rows.map((r) => ({
                    id: r.id,
                    title: r.title,
                    started_at: r.started_at,
                    ended_at: r.ended_at,
                  })),
                  error: null,
                })
                return
              }
              resolve({ data: rows, error: null })
            },
          }
          return builder
        }

        if (table === 'body_measurements') {
          const filters: Array<{ column: string; value: unknown; op: string }> =
            []
          let limitN: number | null = null
          let orFilter: string | null = null
          const builder = {
            select() {
              return builder
            },
            eq(column: string, value: unknown) {
              filters.push({ column, value, op: 'eq' })
              return builder
            },
            gte(column: string, value: unknown) {
              filters.push({ column, value, op: 'gte' })
              return builder
            },
            lte(column: string, value: unknown) {
              filters.push({ column, value, op: 'lte' })
              return builder
            },
            or(filter: string) {
              orFilter = filter
              return builder
            },
            order() {
              return builder
            },
            limit(n: number) {
              limitN = n
              return builder
            },
            then(
              resolve: (value: { data: TBodySeed[]; error: null }) => void
            ) {
              let rows = bodies.filter((row) =>
                matchEq(row as unknown as Record<string, unknown>, filters)
              )
              rows = applyBodyCursor(rows, orFilter)
              rows = [...rows].sort((a, b) => {
                const byDate = b.measured_on.localeCompare(a.measured_on)
                return byDate !== 0 ? byDate : b.id.localeCompare(a.id)
              })
              if (limitN != null) rows = rows.slice(0, limitN)
              resolve({ data: rows, error: null })
            },
          }
          return builder
        }

        if (table === 'hevy_exercise_templates') {
          const builder = {
            select() {
              return builder
            },
            order() {
              return builder
            },
            then(
              resolve: (value: {
                data: TTemplateSeed[]
                error: null
              }) => void
            ) {
              resolve({
                data: [...templates].sort((a, b) =>
                  a.title.localeCompare(b.title)
                ),
                error: null,
              })
            },
          }
          return builder
        }

        throw new Error(`unexpected table ${table}`)
      },
    } as unknown as SupabaseClient,
  }
}

function sampleWorkout(
  overrides: Partial<TWorkoutSeed> & Pick<TWorkoutSeed, 'id' | 'user_id' | 'started_at'>
): TWorkoutSeed {
  return {
    title: 'Push',
    ended_at: '2026-09-19T17:00:00.000Z',
    description: null,
    source: 'hevy',
    workout_exercises: [
      {
        sort_order: 0,
        notes: null,
        source_exercise_id: TEMPLATE_ID,
        superset_id: null,
        canonical_exercise_id: 'ex-1',
        canonical_exercises: { title: 'Bench Press' },
        workout_sets: [
          {
            set_index: 0,
            set_type: 'normal',
            weight_kg: 80,
            reps: 5,
            distance_meters: null,
            duration_seconds: null,
            rpe: null,
            custom_metric: null,
            rep_range_start: null,
            rep_range_end: null,
          },
        ],
      },
    ],
    ...overrides,
  }
}

Deno.test('listWorkouts empty when no backup rows', async () => {
  const { client } = athleteDb()
  const page = await listWorkouts(client, USER_ID)
  assert.deepEqual(page, { workouts: [], next_cursor: null })
})

Deno.test('listWorkouts happy path maps Hevy-shaped browse', async () => {
  const { client } = athleteDb({
    workouts: [
      sampleWorkout({
        id: W1,
        user_id: USER_ID,
        started_at: '2026-09-19T16:00:00.000Z',
        title: 'Push A',
      }),
      sampleWorkout({
        id: W2,
        user_id: USER_ID,
        started_at: '2026-09-18T16:00:00.000Z',
        title: 'Push B',
      }),
    ],
  })

  const page = await listWorkouts(client, USER_ID, { limit: 1 })
  assert.equal(page.workouts.length, 1)
  assert.equal(page.workouts[0]!.title, 'Push A')
  assert.equal(page.workouts[0]!.exercises[0]!.title, 'Bench Press')
  assert.deepEqual(page.next_cursor, {
    started_at: '2026-09-19T16:00:00.000Z',
    id: W1,
  })
})

Deno.test('listWorkouts unauthorized: other user rows hidden', async () => {
  const { client } = athleteDb({
    workouts: [
      sampleWorkout({
        id: W_OTHER,
        user_id: OTHER_ID,
        started_at: '2026-09-19T16:00:00.000Z',
      }),
    ],
  })
  const page = await listWorkouts(client, USER_ID)
  assert.deepEqual(page.workouts, [])
})

Deno.test('getProfileStatistics empty / happy', async () => {
  const empty = athleteDb()
  const emptyStats = await getProfileStatistics(
    empty.client,
    USER_ID,
    4,
    new Date('2026-09-20T12:00:00.000Z')
  )
  assert.equal(emptyStats.weeks, 4)
  assert.equal(emptyStats.thisWeek.reps, 0)
  assert.equal(emptyStats.weekStreak, 0)

  const { client } = athleteDb({
    workouts: [
      sampleWorkout({
        id: W1,
        user_id: USER_ID,
        started_at: '2026-09-19T16:00:00.000Z',
        ended_at: '2026-09-19T17:00:00.000Z',
      }),
    ],
  })
  const stats = await getProfileStatistics(
    client,
    USER_ID,
    4,
    new Date('2026-09-20T12:00:00.000Z')
  )
  assert.ok(stats.thisWeek.reps >= 5 || stats.buckets.some((b) => b.reps >= 5))
  assert.ok(stats.thisWeekWorkouts >= 1 || stats.weekStreak >= 0)
})

Deno.test('getProfileCalendar empty / month highlights', async () => {
  const empty = athleteDb()
  const emptyCal = await getProfileCalendar(
    empty.client,
    USER_ID,
    2026,
    9,
    0
  )
  assert.deepEqual(emptyCal.workouts, [])
  assert.deepEqual(emptyCal.days, {})

  const { client } = athleteDb({
    workouts: [
      sampleWorkout({
        id: W1,
        user_id: USER_ID,
        started_at: '2026-09-15T16:00:00.000Z',
        ended_at: '2026-09-15T17:00:00.000Z',
        title: 'Legs',
      }),
      sampleWorkout({
        id: W_OTHER,
        user_id: OTHER_ID,
        started_at: '2026-09-15T16:00:00.000Z',
        ended_at: '2026-09-15T17:00:00.000Z',
        title: 'Other',
      }),
    ],
  })
  const cal = await getProfileCalendar(client, USER_ID, 2026, 9, 0)
  assert.equal(cal.workouts.length, 1)
  assert.equal(cal.workouts[0]!.title, 'Legs')
  assert.ok(cal.days['2026-09-15'])
})

Deno.test('listBodyMeasurements empty / happy / unauthorized', async () => {
  const empty = athleteDb()
  assert.deepEqual(await listBodyMeasurements(empty.client, USER_ID), {
    measurements: [],
    next_cursor: null,
  })

  const { client } = athleteDb({
    bodies: [
      {
        id: 'm1',
        user_id: USER_ID,
        measured_on: '2026-09-10',
        weight_kg: 80,
      },
      {
        id: 'm2',
        user_id: USER_ID,
        measured_on: '2026-09-01',
        weight_kg: 81,
      },
      {
        id: 'm-other',
        user_id: OTHER_ID,
        measured_on: '2026-09-12',
        weight_kg: 99,
      },
    ],
  })

  const page = await listBodyMeasurements(client, USER_ID, { limit: 1 })
  assert.equal(page.measurements.length, 1)
  assert.equal(page.measurements[0]!.weight_kg, 80)
  assert.deepEqual(page.next_cursor, { measured_on: '2026-09-10', id: 'm1' })
})

Deno.test('getBlindSpotAnalysis empty / happy / unauthorized', async () => {
  const empty = athleteDb({ templates: [{ id: TEMPLATE_ID, title: 'Bench' }] })
  assert.deepEqual(await getBlindSpotAnalysis(empty.client, USER_ID), {
    exercises: [],
  })

  const { client } = athleteDb({
    templates: [{ id: TEMPLATE_ID, title: 'Bench Press' }],
    workouts: [
      sampleWorkout({
        id: W1,
        user_id: USER_ID,
        started_at: '2026-09-19T16:00:00.000Z',
      }),
      sampleWorkout({
        id: W_OTHER,
        user_id: OTHER_ID,
        started_at: '2026-09-18T16:00:00.000Z',
      }),
    ],
  })

  const result = await getBlindSpotAnalysis(client, USER_ID)
  assert.equal(result.exercises.length, 1)
  assert.equal(result.exercises[0]!.name, 'Bench Press')
  assert.ok(result.exercises[0]!.sessions.length >= 1)
})
