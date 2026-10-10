// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Persistence tests for workout MCP tools (ADR 0033 / 03) — first-write-wins + ownership.
 */

import assert from 'node:assert/strict'
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.108.2'

import { parseCreateWorkout, parseReplaceWorkout } from './workout-schema.ts'
import {
  createWorkout,
  deleteWorkout,
  getWorkout,
  replaceWorkout,
} from './workouts-db.ts'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_ID = '22222222-2222-4222-8222-222222222222'
const BENCH_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const CURL_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'

const VALID_BODY = {
  source: 'strong',
  external_id: 'strong-session-1',
  started_at: '2026-09-19T16:00:00.000Z',
  ended_at: '2026-09-19T17:00:00.000Z',
  title: 'Push',
  exercises: [
    {
      canonical_exercise_id: BENCH_ID,
      sets: [{ set_type: 'normal', weight_kg: 80, reps: 5 }],
    },
  ],
}

type TCanonicalRow = { id: string; user_id: string | null }
type TWorkoutRow = Record<string, unknown>
type TExerciseRow = Record<string, unknown>
type TSetRow = Record<string, unknown>

function workoutDb(seed?: {
  canonical?: TCanonicalRow[]
  workouts?: TWorkoutRow[]
  exercises?: TExerciseRow[]
  sets?: TSetRow[]
}) {
  const canonical = [
    ...(seed?.canonical ?? [
      { id: BENCH_ID, user_id: null },
      { id: CURL_ID, user_id: USER_ID },
    ]),
  ]
  const workouts = [...(seed?.workouts ?? [])]
  const exercises = [...(seed?.exercises ?? [])]
  const sets = [...(seed?.sets ?? [])]

  function cascadeDeleteWorkout(ids: Set<unknown>): void {
    const removedExercises = exercises.filter((row) => ids.has(row.workout_id))
    const exerciseIds = new Set(removedExercises.map((row) => row.id))
    for (let i = exercises.length - 1; i >= 0; i--) {
      if (ids.has(exercises[i].workout_id)) {
        exercises.splice(i, 1)
      }
    }
    for (let i = sets.length - 1; i >= 0; i--) {
      if (exerciseIds.has(sets[i].workout_exercise_id)) {
        sets.splice(i, 1)
      }
    }
  }

  return {
    workouts,
    exercises,
    sets,
    client: {
      from(table: string) {
        if (table === 'canonical_exercises') {
          const filters: Array<{ column: string; value: unknown; op: 'eq' | 'in' }> = []
          const builder = {
            select() {
              return builder
            },
            in(column: string, value: unknown[]) {
              filters.push({ column, value, op: 'in' })
              return builder
            },
            then(resolve: (value: { data: TCanonicalRow[]; error: null }) => void) {
              const rows = canonical.filter((row) =>
                filters.every((filter) =>
                  filter.op === 'in'
                    ? (filter.value as unknown[]).includes(
                      row[filter.column as keyof TCanonicalRow]
                    )
                    : row[filter.column as keyof TCanonicalRow] === filter.value
                )
              )
              resolve({ data: rows, error: null })
            },
          }
          return builder
        }

        if (table === 'workouts') {
          const filters: Array<{ column: string; value: unknown }> = []
          let deleting = false
          let updating: Record<string, unknown> | null = null
          const builder = {
            select() {
              return builder
            },
            eq(column: string, value: unknown) {
              filters.push({ column, value })
              return builder
            },
            async maybeSingle() {
              const match = workouts.find((row) =>
                filters.every((filter) => row[filter.column] === filter.value)
              )
              return { data: match ?? null, error: null }
            },
            async insert(row: TWorkoutRow) {
              const collision = workouts.find(
                (existing) =>
                  existing.user_id === row.user_id &&
                  existing.source === row.source &&
                  existing.external_id === row.external_id
              )
              if (collision) {
                return {
                  error: {
                    code: '23505',
                    message:
                      'duplicate key value violates unique constraint "workouts_user_source_external_id_key"',
                  },
                }
              }
              workouts.push(row)
              return { error: null }
            },
            update(patch: Record<string, unknown>) {
              updating = patch
              return builder
            },
            delete() {
              deleting = true
              return builder
            },
            async then(
              resolve: (value: {
                data: Array<{ id: unknown }> | null
                error: null
              }) => void
            ) {
              const matches = workouts.filter((row) =>
                filters.every((filter) => row[filter.column] === filter.value)
              )
              if (updating) {
                for (const row of matches) {
                  Object.assign(row, updating)
                }
                resolve({ data: matches.map((row) => ({ id: row.id })), error: null })
                return
              }
              if (deleting) {
                const ids = new Set(matches.map((row) => row.id))
                for (let i = workouts.length - 1; i >= 0; i--) {
                  if (ids.has(workouts[i].id)) {
                    workouts.splice(i, 1)
                  }
                }
                cascadeDeleteWorkout(ids)
                resolve({ data: matches.map((row) => ({ id: row.id })), error: null })
                return
              }
              resolve({ data: matches.map((row) => ({ id: row.id })), error: null })
            },
          }
          return builder
        }

        if (table === 'workout_exercises') {
          const filters: Array<{ column: string; value: unknown }> = []
          let deleting = false
          const builder = {
            select() {
              return builder
            },
            eq(column: string, value: unknown) {
              filters.push({ column, value })
              return builder
            },
            order() {
              return builder
            },
            async insert(rows: TExerciseRow | TExerciseRow[]) {
              const incoming = Array.isArray(rows) ? rows : [rows]
              exercises.push(...incoming)
              return { error: null }
            },
            delete() {
              deleting = true
              return builder
            },
            async then(resolve: (value: { data: TExerciseRow[]; error: null }) => void) {
              const matches = exercises.filter((row) =>
                filters.every((filter) => row[filter.column] === filter.value)
              )
              if (deleting) {
                const ids = new Set(matches.map((row) => row.id))
                for (let i = exercises.length - 1; i >= 0; i--) {
                  if (ids.has(exercises[i].id)) {
                    exercises.splice(i, 1)
                  }
                }
                for (let i = sets.length - 1; i >= 0; i--) {
                  if (ids.has(sets[i].workout_exercise_id)) {
                    sets.splice(i, 1)
                  }
                }
              }
              resolve({
                data: [...matches].sort(
                  (a, b) => Number(a.sort_order) - Number(b.sort_order)
                ),
                error: null,
              })
            },
          }
          return builder
        }

        if (table === 'workout_sets') {
          const filters: Array<{ column: string; value: unknown; op?: 'in' }> = []
          const builder = {
            select() {
              return builder
            },
            in(column: string, value: unknown[]) {
              filters.push({ column, value, op: 'in' })
              return builder
            },
            order() {
              return builder
            },
            async insert(rows: TSetRow | TSetRow[]) {
              const incoming = Array.isArray(rows) ? rows : [rows]
              sets.push(...incoming)
              return { error: null }
            },
            then(resolve: (value: { data: TSetRow[]; error: null }) => void) {
              const rows = sets.filter((row) =>
                filters.every((filter) =>
                  filter.op === 'in'
                    ? (filter.value as unknown[]).includes(row[filter.column])
                    : row[filter.column] === filter.value
                )
              )
              resolve({
                data: [...rows].sort((a, b) => Number(a.set_index) - Number(b.set_index)),
                error: null,
              })
            },
          }
          return builder
        }

        throw new Error(`Unexpected table: ${table}`)
      },
    } as unknown as SupabaseClient,
  }
}

Deno.test('createWorkout inserts history-only with routine_id null', async () => {
  const db = workoutDb()
  const parsed = parseCreateWorkout(VALID_BODY)
  assert.equal(parsed.ok, true)
  if (!parsed.ok) return

  const result = await createWorkout(db.client, USER_ID, parsed.draft)
  assert.equal(result.status, 'created')
  assert.equal(db.workouts.length, 1)
  assert.equal(db.workouts[0].routine_id, null)
  assert.equal(db.workouts[0].user_id, USER_ID)
})

Deno.test('createWorkout first-write-wins: same body → existing id', async () => {
  const db = workoutDb()
  const parsed = parseCreateWorkout(VALID_BODY)
  assert.equal(parsed.ok, true)
  if (!parsed.ok) return

  const first = await createWorkout(db.client, USER_ID, parsed.draft)
  const replay = parseCreateWorkout({
    ...VALID_BODY,
    started_at: '2026-09-19T16:00:00Z',
  })
  assert.equal(replay.ok, true)
  if (!replay.ok) return

  const second = await createWorkout(db.client, USER_ID, replay.draft)
  assert.equal(first.status, 'created')
  assert.equal(second.status, 'existing')
  if (first.status === 'created' && second.status === 'existing') {
    assert.equal(second.id, first.id)
  }
  assert.equal(db.workouts.length, 1)
})

Deno.test('createWorkout same identity different body → conflict', async () => {
  const db = workoutDb()
  const parsed = parseCreateWorkout(VALID_BODY)
  assert.equal(parsed.ok, true)
  if (!parsed.ok) return
  await createWorkout(db.client, USER_ID, parsed.draft)

  const changed = parseCreateWorkout({ ...VALID_BODY, title: 'Pull' })
  assert.equal(changed.ok, true)
  if (!changed.ok) return

  const result = await createWorkout(db.client, USER_ID, changed.draft)
  assert.deepEqual(result, { status: 'conflict' })
  assert.equal(db.workouts[0].title, 'Push')
})

Deno.test('get/replace/delete return not_found for other user', async () => {
  const db = workoutDb()
  const parsed = parseCreateWorkout(VALID_BODY)
  assert.equal(parsed.ok, true)
  if (!parsed.ok) return

  const created = await createWorkout(db.client, USER_ID, parsed.draft)
  assert.equal(created.status, 'created')
  if (created.status !== 'created') return

  assert.equal(await getWorkout(db.client, OTHER_ID, created.id), null)

  const replace = parseReplaceWorkout({
    started_at: '2026-09-19T16:00:00.000Z',
    ended_at: '2026-09-19T17:30:00.000Z',
    title: 'Push 2',
    exercises: [
      {
        canonical_exercise_id: CURL_ID,
        sets: [{ set_type: 'failure', reps: 12 }],
      },
    ],
  })
  assert.equal(replace.ok, true)
  if (!replace.ok) return

  assert.deepEqual(
    await replaceWorkout(db.client, OTHER_ID, created.id, replace.draft),
    { status: 'not_found' }
  )
  assert.deepEqual(await deleteWorkout(db.client, OTHER_ID, created.id), {
    status: 'not_found',
  })
  assert.equal(db.workouts.length, 1)

  const deleted = await deleteWorkout(db.client, USER_ID, created.id)
  assert.deepEqual(deleted, { status: 'deleted' })
  assert.equal(db.workouts.length, 0)
})
