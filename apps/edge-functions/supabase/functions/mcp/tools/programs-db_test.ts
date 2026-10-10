// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Persistence tests for program MCP list/read (ADR 0034 / 01).
 * Run: deno test --config deno.json tools/programs-db_test.ts
 */

import assert from 'node:assert/strict'
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.108.2'

import { listPrograms, mapDaysToRoutines, readProgram } from './programs-db.ts'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_ID = '22222222-2222-4222-8222-222222222222'

type TSubRow = { user_id: string; program_id: number }
type TProgramRow = {
  id: number
  title: string | null
  program_length?: number | null
  schedule_workouts?: unknown[]
}

function programDb(seed?: {
  subscribers?: TSubRow[]
  programs?: TProgramRow[]
}) {
  const subscribers = [...(seed?.subscribers ?? [])]
  const programs = [...(seed?.programs ?? [])]

  return {
    client: {
      from(table: string) {
        if (table === 'program_subscribers') {
          const filters: Array<{ column: string; value: unknown }> = []
          const builder = {
            select() {
              return builder
            },
            eq(column: string, value: unknown) {
              filters.push({ column, value })
              return builder
            },
            async maybeSingle() {
              const match = subscribers.find((row) =>
                filters.every(
                  (filter) =>
                    row[filter.column as keyof TSubRow] === filter.value
                )
              )
              return { data: match ?? null, error: null }
            },
            then(
              resolve: (value: { data: TSubRow[]; error: null }) => void
            ) {
              const rows = subscribers.filter((row) =>
                filters.every(
                  (filter) =>
                    row[filter.column as keyof TSubRow] === filter.value
                )
              )
              resolve({ data: rows, error: null })
            },
          }
          return builder
        }

        if (table === 'programs') {
          const filters: Array<{ column: string; value: unknown; op: 'eq' | 'in' }> =
            []
          let orderAsc = false
          const builder = {
            select() {
              return builder
            },
            eq(column: string, value: unknown) {
              filters.push({ column, value, op: 'eq' })
              return builder
            },
            in(column: string, value: unknown[]) {
              filters.push({ column, value, op: 'in' })
              return builder
            },
            order(_column: string, opts?: { ascending?: boolean }) {
              orderAsc = opts?.ascending !== false
              return builder
            },
            async maybeSingle() {
              const match = programs.find((row) =>
                filters.every((filter) =>
                  filter.op === 'in'
                    ? (filter.value as unknown[]).includes(
                      row[filter.column as keyof TProgramRow]
                    )
                    : row[filter.column as keyof TProgramRow] === filter.value
                )
              )
              return { data: match ?? null, error: null }
            },
            then(
              resolve: (value: {
                data: Array<{ id: number; title: string | null }>
                error: null
              }) => void
            ) {
              let rows = programs.filter((row) =>
                filters.every((filter) =>
                  filter.op === 'in'
                    ? (filter.value as unknown[]).includes(
                      row[filter.column as keyof TProgramRow]
                    )
                    : row[filter.column as keyof TProgramRow] === filter.value
                )
              )
              if (orderAsc) {
                rows = [...rows].sort((a, b) => a.id - b.id)
              }
              resolve({
                data: rows.map((row) => ({ id: row.id, title: row.title })),
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

Deno.test('listPrograms returns empty when no Join rows', async () => {
  const { client } = programDb()
  const programs = await listPrograms(client, USER_ID)
  assert.deepEqual(programs, [])
})

Deno.test('listPrograms returns Joined program ids and titles', async () => {
  const { client } = programDb({
    subscribers: [
      { user_id: USER_ID, program_id: 2 },
      { user_id: USER_ID, program_id: 1 },
      { user_id: OTHER_ID, program_id: 9 },
    ],
    programs: [
      { id: 1, title: 'Push Pull' },
      { id: 2, title: 'Hypertrophy' },
      { id: 9, title: 'Other user' },
    ],
  })

  const programs = await listPrograms(client, USER_ID)
  assert.deepEqual(programs, [
    { id: 1, title: 'Push Pull', joined: true },
    { id: 2, title: 'Hypertrophy', joined: true },
  ])
})

Deno.test('readProgram returns not_found when program_id missing from Join', async () => {
  const { client } = programDb({
    programs: [{ id: 1, title: 'Hidden', program_length: 4, schedule_workouts: [] }],
  })
  const result = await readProgram(client, USER_ID, 1)
  assert.equal(result.status, 'not_found')
})

Deno.test('readProgram happy path maps prescription grid', async () => {
  const { client } = programDb({
    subscribers: [{ user_id: USER_ID, program_id: 7 }],
    programs: [
      {
        id: 7,
        title: 'Block A',
        program_length: 2,
        schedule_workouts: [
          {
            id: 'd2',
            nthWeek: 1,
            nthDay: 2,
            day_title: 'Lower',
            program_workout_exercises: [
              {
                id: 'ex-b',
                created_at: '2026-07-01T00:00:01.000Z',
                reps: [5],
                weights: [100],
                hevy_exercise_templates: { id: 'tpl-squat', title: 'Squat' },
              },
              {
                id: 'ex-a',
                created_at: '2026-07-01T00:00:00.000Z',
                reps: [8],
                weights: [60],
                hevy_exercise_templates: { id: 'tpl-rdl', title: 'RDL' },
              },
            ],
          },
          {
            id: 'd1',
            nthWeek: 1,
            nthDay: 1,
            day_title: null,
            program_workout_exercises: [],
          },
        ],
      },
    ],
  })

  const result = await readProgram(client, USER_ID, 7)
  assert.equal(result.status, 'ok')
  if (result.status !== 'ok') return

  assert.equal(result.program.id, 7)
  assert.equal(result.program.title, 'Block A')
  assert.equal(result.program.program_length, 2)
  assert.equal(result.program.routines.length, 2)
  assert.equal(result.program.routines[0].order, '1')
  assert.equal(result.program.routines[0].folder_id, 0)
  assert.equal(result.program.routines[0].title, 'Day 1')
  assert.equal(result.program.routines[1].title, '2 - Lower')
  assert.deepEqual(
    result.program.routines[1].exercises.map((ex) => ex.title),
    ['RDL', 'Squat']
  )
  assert.equal(result.program.routines[1].exercises[0].sets[0].reps, 8)
})

Deno.test('mapDaysToRoutines uses 0-based folder_id from nthWeek', () => {
  const routines = mapDaysToRoutines([
    {
      id: 'w2d1',
      nthWeek: 2,
      nthDay: 1,
      day_title: 'A',
      program_workout_exercises: [],
    },
  ])
  assert.equal(routines[0]?.folder_id, 1)
  assert.equal(routines[0]?.order, '1')
})
