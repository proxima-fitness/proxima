// SPDX-License-Identifier: AGPL-3.0-only

/**
 * First-build persist tests (ADR 0034 / 03).
 * Run: deno test --config deno.json tools/build-db_test.ts
 */

import assert from 'node:assert/strict'
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.108.2'

import { buildProgram, plateAndStamp } from './build-db.ts'
import type { TBuildProgramInput } from './build-schema.ts'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const EXERCISE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

const FOUR_WEEK_INPUT: TBuildProgramInput = {
  title: 'MCP Strength',
  durationWeeks: 4,
  goal: 'Strength',
  daysPerWeek: 1,
  blocks: [
    { name: 'Accumulation', weeks: [1, 2, 3], intent: 'Volume' },
    { name: 'Deload', weeks: [4], intent: 'Unload' },
  ],
  periodizationWave: {
    weeks: [
      { week: 1, main: { rpeDelta: 0, setCountDelta: 0 } },
      { week: 2, main: { rpeDelta: 1, setCountDelta: 0 } },
      { week: 3, main: { rpeDelta: 1, setCountDelta: 1 } },
      {
        week: 4,
        main: { rpeDelta: -2, setCountDelta: 0 },
        accessory: { rpeDelta: -1, setCountDelta: 0 },
      },
    ],
  },
  totalDays: 1,
  routines: [
    {
      dayNumber: 1,
      title: 'Full Body',
      notes: '',
      exercises: [
        {
          exercise_template_id: EXERCISE_ID,
          title: 'Squat',
          notes: '',
          rest_seconds: '120',
          supersets_id: null,
          role: 'main',
          sets: [
            {
              type: 'normal',
              reps: 5,
              rep_range: null,
              rpe: 7,
            },
            {
              type: 'normal',
              reps: 5,
              rep_range: null,
              rpe: 7,
            },
            {
              type: 'normal',
              reps: 5,
              rep_range: null,
              rpe: 7,
            },
          ],
        },
      ],
    },
  ],
}

Deno.test('plateAndStamp: length weeks and main RPE deltas', () => {
  const stamped = plateAndStamp(FOUR_WEEK_INPUT)
  assert.equal(stamped.ok, true)
  if (!stamped.ok) return

  assert.equal(stamped.program.length, 4)
  assert.deepEqual(
    stamped.program.map((r) => r.folder_id),
    [0, 1, 2, 3]
  )

  const week1Rpe = stamped.program[0].exercises[0].sets[0].rpe
  const week2Rpe = stamped.program[1].exercises[0].sets[0].rpe
  const week3Sets = stamped.program[2].exercises[0].sets.length
  const week4Rpe = stamped.program[3].exercises[0].sets[0].rpe

  assert.equal(week1Rpe, 7)
  assert.equal(week2Rpe, 8)
  assert.equal(week3Sets, 4)
  assert.equal(week4Rpe, 5)
})

type TProgramRow = {
  id: number
  user_id: string
  title: string
  program_length: number
  prompt: string
  mesocycle_blocks: unknown
}

type TScheduleRow = {
  id: string
  nthWeek: number
  nthDay: number
  day_title: string
  program_id: number
}

type TExerciseInsert = {
  schedule_id: string
  exercise_id: string
  reps: Array<number | null> | null
  rpe: Array<number | null> | null
}

type TSubRow = { id: string; user_id: string; program_id: number }

function buildDb(opts?: { rejectProgramInsert?: boolean; authUserId?: string }) {
  const authUserId = opts?.authUserId ?? USER_ID
  const programs: TProgramRow[] = []
  const schedules: TScheduleRow[] = []
  const exercises: TExerciseInsert[] = []
  const subscribers: TSubRow[] = []
  let nextProgramId = 1

  return {
    programs,
    schedules,
    exercises,
    subscribers,
    client: {
      from(table: string) {
        if (table === 'programs') {
          return {
            insert(rows: TProgramRow[]) {
              const row = rows[0]
              if (opts?.rejectProgramInsert || row.user_id !== authUserId) {
                return {
                  select() {
                    return {
                      async single() {
                        return {
                          data: null,
                          error: {
                            message: 'new row violates row-level security policy',
                            code: '42501',
                          },
                        }
                      },
                    }
                  },
                }
              }
              const inserted = { ...row, id: nextProgramId++ }
              programs.push(inserted)
              return {
                select() {
                  return {
                    async single() {
                      return { data: { id: inserted.id }, error: null }
                    },
                  }
                },
              }
            },
          }
        }

        if (table === 'schedule_workouts') {
          return {
            async insert(rows: TScheduleRow[]) {
              schedules.push(...rows)
              return { error: null }
            },
          }
        }

        if (table === 'hevy_exercise_templates') {
          return {
            select() {
              return {
                limit() {
                  return {
                    then(
                      resolve: (value: {
                        data: Array<{
                          id: string
                          title: string
                          normalized_title: string
                        }>
                        error: null
                      }) => void
                    ) {
                      resolve({
                        data: [
                          {
                            id: EXERCISE_ID,
                            title: 'Squat',
                            normalized_title: 'squat',
                          },
                        ],
                        error: null,
                      })
                    },
                  }
                },
              }
            },
          }
        }

        if (table === 'program_workout_exercises') {
          return {
            async insert(rows: TExerciseInsert[]) {
              exercises.push(...rows)
              return { error: null }
            },
          }
        }

        if (table === 'program_subscribers') {
          return {
            async insert(rows: TSubRow[]) {
              subscribers.push(...rows)
              return { error: null }
            },
          }
        }

        throw new Error(`unexpected table ${table}`)
      },
    } as unknown as SupabaseClient,
  }
}

Deno.test('buildProgram: persists full length and Joins owner', async () => {
  const db = buildDb()
  const result = await buildProgram(db.client, USER_ID, FOUR_WEEK_INPUT)

  assert.equal(result.status, 'ok')
  if (result.status !== 'ok') return

  assert.equal(result.program_id, 1)
  assert.equal(result.program_length, 4)
  assert.equal(result.title, 'MCP Strength')

  assert.equal(db.programs.length, 1)
  assert.equal(db.programs[0].user_id, USER_ID)
  assert.equal(db.programs[0].program_length, 4)
  assert.equal(db.schedules.length, 4)
  assert.deepEqual(
    db.schedules.map((s) => s.nthWeek).sort((a, b) => a - b),
    [1, 2, 3, 4]
  )
  assert.equal(db.exercises.length, 4)
  assert.equal(db.subscribers.length, 1)
  assert.equal(db.subscribers[0].user_id, USER_ID)
  assert.equal(db.subscribers[0].program_id, 1)

  const week2 = db.exercises.find((ex) => {
    const schedule = db.schedules.find((s) => s.id === ex.schedule_id)
    return schedule?.nthWeek === 2
  })
  assert.ok(week2)
  assert.equal(week2!.rpe?.[0], 8)
})

Deno.test('buildProgram: rejects unauthorized program insert', async () => {
  const db = buildDb({ rejectProgramInsert: true })
  const result = await buildProgram(db.client, USER_ID, FOUR_WEEK_INPUT)

  assert.equal(result.status, 'error')
  if (result.status !== 'error') return
  assert.match(result.error, /row-level security|42501/i)
  assert.equal(db.programs.length, 0)
  assert.equal(db.subscribers.length, 0)
})
