/**
 * Mutate propose / Accept / Save tests (ADR 0034 / 04).
 * Run: deno test --config deno.json tools/mutate-db_test.ts
 */

import assert from 'node:assert/strict'
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.108.2'

import { applyOperations } from './mutate-apply.ts'
import {
  acceptProgramMutation,
  clearPendingProposalsForTests,
  lockedFolderIdsFromLinks,
  proposeProgramMutation,
  saveProgram,
} from './mutate-db.ts'
import type { TBuilderRoutine } from './mutate-schema.ts'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_ID = '22222222-2222-4222-8222-222222222222'
const EXERCISE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const BAD_EQUIP_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

function sampleRoutine(
  overrides?: Partial<TBuilderRoutine>,
): TBuilderRoutine {
  return {
    id: '1',
    title: 'Day 1',
    folder_id: 0,
    notes: '',
    order: '1',
    exercises: [
      {
        index: 0,
        title: 'Squat',
        notes: '',
        rest_seconds: '120',
        exercise_template_id: EXERCISE_ID,
        supersets_id: null,
        sets: [
          {
            index: 0,
            type: 'normal',
            weight_kg: null,
            reps: 5,
            distance_meters: null,
            duration_seconds: null,
            rpe: 7,
            custom_metric: null,
            rep_range: null,
          },
        ],
      },
    ],
    ...overrides,
  }
}

Deno.test('applyOperations: fail-all leaves program unchanged', () => {
  const program = [sampleRoutine()]
  const result = applyOperations(program, [
    {
      op: 'update_set',
      folderIds: [0],
      dayOrder: 1,
      exerciseIndex: 0,
      setIndex: 0,
      set: { rpe: 9 },
    },
    {
      op: 'update_set',
      folderIds: [0],
      dayOrder: 1,
      exerciseIndex: 0,
      setIndex: 99,
      set: { rpe: 1 },
    },
  ])
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.program[0].exercises[0].sets[0].rpe, 7)
  assert.equal(result.failures[0].index, 1)
})

Deno.test('applyOperations: update_set happy path', () => {
  const program = [sampleRoutine()]
  const result = applyOperations(program, [
    {
      op: 'update_set',
      folderIds: [0],
      dayOrder: 1,
      exerciseIndex: 0,
      setIndex: 0,
      set: { rpe: 9, reps: 3 },
    },
  ])
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.program[0].exercises[0].sets[0].rpe, 9)
  assert.equal(result.program[0].exercises[0].sets[0].reps, 3)
})

Deno.test('lockedFolderIdsFromLinks: current + complete', () => {
  assert.deepEqual(
    lockedFolderIdsFromLinks([
      { nth_week: 1, completed_at: '2026-01-01' },
      { nth_week: 2, completed_at: null },
      { nth_week: 3, completed_at: null },
    ]),
    [0, 1],
  )
})

type TProgramRow = {
  id: number
  user_id: string
  title: string | null
  program_length?: number | null
  schedule_workouts?: unknown[]
}

type TSubRow = { user_id: string; program_id: number }
type TLinkRow = {
  program_id: number
  nth_week: number
  completed_at: string | null
}
type TConstraintRow = {
  user_id: string
  injuries: string[] | null
  excluded_equipment: string[] | null
  excluded_areas: string[] | null
}
type TTemplateRow = {
  id: string
  title: string
  equipment: string | null
  primary_muscle_group: string | null
}

type TScheduleRow = {
  id: string
  program_id: number
  nthWeek: number
  nthDay: number
  day_title: string
  day_notes: string
}

type TExerciseUpload = {
  schedule_id: string
  exercise_id: string
  reps: Array<number | null>
  rpe: Array<number | null> | null
  set_types: string[]
}

function mutateDb(seed?: {
  programs?: TProgramRow[]
  subscribers?: TSubRow[]
  links?: TLinkRow[]
  constraints?: TConstraintRow[]
  templates?: TTemplateRow[]
}) {
  const programs = [...(seed?.programs ?? [])]
  const subscribers = [...(seed?.subscribers ?? [])]
  const links = [...(seed?.links ?? [])]
  const constraints = [...(seed?.constraints ?? [])]
  const templates = [
    ...(seed?.templates ?? [
      {
        id: EXERCISE_ID,
        title: 'Squat',
        equipment: 'barbell',
        primary_muscle_group: 'quadriceps',
      },
      {
        id: BAD_EQUIP_ID,
        title: 'Smith Machine Squat',
        equipment: 'smith machine',
        primary_muscle_group: 'quadriceps',
      },
    ]),
  ]
  const scheduleRows: TScheduleRow[] = []
  const exerciseRows: TExerciseUpload[] = []
  type TProposalRow = {
    user_id: string
    program_id: number
    operations: unknown
  }
  const proposals: TProposalRow[] = []
  let nextProgramId = Math.max(0, ...programs.map((p) => p.id)) + 1

  const client = {
    from(table: string) {
      if (table === 'programs') {
        const filters: Array<{ column: string; value: unknown }> = []
        let updatePatch: Record<string, unknown> | null = null
        const builder = {
          select() {
            return builder
          },
          eq(column: string, value: unknown) {
            filters.push({ column, value })
            return builder
          },
          update(patch: Record<string, unknown>) {
            updatePatch = patch
            return builder
          },
          async maybeSingle() {
            const match = programs.find((row) =>
              filters.every(
                (filter) =>
                  (row as Record<string, unknown>)[filter.column] ===
                    filter.value,
              ),
            )
            return { data: match ?? null, error: null }
          },
          then(
            resolve: (value: { data: unknown; error: null }) => void,
          ) {
            if (updatePatch) {
              const match = programs.find((row) =>
                filters.every(
                  (filter) =>
                    (row as Record<string, unknown>)[filter.column] ===
                      filter.value,
                ),
              )
              if (match) Object.assign(match, updatePatch)
              resolve({ data: null, error: null })
              return
            }
            resolve({ data: null, error: null })
          },
        }
        return builder
      }

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
                  (row as Record<string, unknown>)[filter.column] ===
                    filter.value,
              ),
            )
            return { data: match ?? null, error: null }
          },
        }
        return builder
      }

      if (table === 'program_hevy_week_links') {
        const filters: Array<{ column: string; value: unknown }> = []
        const builder = {
          select() {
            return builder
          },
          eq(column: string, value: unknown) {
            filters.push({ column, value })
            return builder
          },
          then(
            resolve: (value: { data: TLinkRow[]; error: null }) => void,
          ) {
            const rows = links.filter((row) =>
              filters.every(
                (filter) =>
                  (row as Record<string, unknown>)[filter.column] ===
                    filter.value,
              ),
            )
            resolve({ data: rows, error: null })
          },
        }
        return builder
      }

      if (table === 'user_constraints') {
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
            const match = constraints.find((row) =>
              filters.every(
                (filter) =>
                  (row as Record<string, unknown>)[filter.column] ===
                    filter.value,
              ),
            )
            return { data: match ?? null, error: null }
          },
        }
        return builder
      }

      if (table === 'mcp_mutation_proposals') {
        const filters: Array<{ column: string; value: unknown }> = []
        let deleteMode = false
        const builder = {
          select() {
            return builder
          },
          eq(column: string, value: unknown) {
            filters.push({ column, value })
            return builder
          },
          upsert(
            row: TProposalRow,
            _opts?: { onConflict?: string },
          ) {
            const idx = proposals.findIndex(
              (p) =>
                p.user_id === row.user_id && p.program_id === row.program_id,
            )
            if (idx >= 0) proposals[idx] = row
            else proposals.push(row)
            return Promise.resolve({ data: row, error: null })
          },
          delete() {
            deleteMode = true
            return builder
          },
          async maybeSingle() {
            const match = proposals.find((row) =>
              filters.every(
                (filter) =>
                  (row as Record<string, unknown>)[filter.column] ===
                    filter.value,
              ),
            )
            return { data: match ?? null, error: null }
          },
          then(
            resolve: (value: {
              data: Array<{ program_id: number }> | null
              error: null
            }) => void,
          ) {
            if (deleteMode) {
              const kept: TProposalRow[] = []
              const removed: Array<{ program_id: number }> = []
              for (const row of proposals) {
                const hit = filters.every(
                  (filter) =>
                    (row as Record<string, unknown>)[filter.column] ===
                      filter.value,
                )
                if (hit) removed.push({ program_id: row.program_id })
                else kept.push(row)
              }
              proposals.length = 0
              proposals.push(...kept)
              resolve({ data: removed, error: null })
              return
            }
            resolve({ data: null, error: null })
          },
        }
        return builder
      }

      if (table === 'hevy_exercise_templates') {
        let inIds: string[] | null = null
        const builder = {
          select() {
            return builder
          },
          in(_column: string, ids: string[]) {
            inIds = ids
            return builder
          },
          limit() {
            return builder
          },
          then(
            resolve: (value: {
              data: Array<{ id: string } | TTemplateRow>
              error: null
            }) => void,
          ) {
            const rows = inIds
              ? templates.filter((t) => inIds!.includes(t.id))
              : templates
            resolve({ data: rows, error: null })
          },
        }
        return builder
      }

      if (table === 'schedule_workouts') {
        let deleteProgramId: number | null = null
        const builder = {
          delete() {
            return builder
          },
          eq(column: string, value: unknown) {
            if (column === 'program_id') {
              deleteProgramId = value as number
            }
            return builder
          },
          insert(rows: TScheduleRow[]) {
            for (const row of rows) scheduleRows.push(row)
            return Promise.resolve({ data: rows, error: null })
          },
          then(
            resolve: (value: { data: null; error: null }) => void,
          ) {
            if (deleteProgramId != null) {
              const keep = scheduleRows.filter(
                (row) => row.program_id !== deleteProgramId,
              )
              scheduleRows.length = 0
              scheduleRows.push(...keep)
              // also drop exercises for deleted schedules — simplified: clear all
              exerciseRows.length = 0
            }
            resolve({ data: null, error: null })
          },
        }
        return builder
      }

      if (table === 'program_workout_exercises') {
        return {
          insert(rows: TExerciseUpload[]) {
            exerciseRows.push(...rows)
            return Promise.resolve({ data: rows, error: null })
          },
        }
      }

      throw new Error(`Unexpected table ${table}`)
    },
  }

  return {
    client: client as unknown as SupabaseClient,
    scheduleRows,
    exerciseRows,
    programs,
    allocProgram(routines: TBuilderRoutine[]) {
      const id = nextProgramId++
      programs.push({
        id,
        user_id: USER_ID,
        title: 'Test',
        program_length: 2,
        schedule_workouts: routines.map((routine, index) => ({
          id: `sched-${index}`,
          nthWeek: Number(routine.folder_id) + 1,
          nthDay: Number(routine.order),
          day_title: routine.title,
          program_workout_exercises: routine.exercises.map((ex, exIndex) => ({
            id: `ex-${index}-${exIndex}`,
            created_at: `2026-01-0${exIndex + 1}`,
            reps: ex.sets.map((s) => s.reps),
            rpe: ex.sets.map((s) => s.rpe),
            weights: ex.sets.map((s) => s.weight_kg),
            set_types: ex.sets.map((s) => s.type),
            hevy_exercise_templates: {
              id: ex.exercise_template_id,
              title: ex.title,
            },
          })),
        })),
      })
      subscribers.push({ user_id: USER_ID, program_id: id })
      return id
    },
  }
}

Deno.test('propose: gate reject on excluded equipment', async () => {
  clearPendingProposalsForTests()
  const db = mutateDb({
    constraints: [{
      user_id: USER_ID,
      injuries: [],
      excluded_equipment: ['smith machine'],
      excluded_areas: [],
    }],
  })
  const programId = db.allocProgram([sampleRoutine()])

  const result = await proposeProgramMutation(db.client, USER_ID, {
    program_id: programId,
    operations: [{
      op: 'insert_exercise',
      folderIds: [0],
      dayOrder: 1,
      exerciseIndex: 1,
      exercise: {
        exercise_template_id: BAD_EQUIP_ID,
        title: 'Smith Machine Squat',
        rest_seconds: '90',
        sets: [{
          type: 'normal',
          reps: 8,
          weight_kg: null,
          rpe: 7,
          distance_meters: null,
          duration_seconds: null,
          custom_metric: null,
          rep_range: null,
        }],
      },
    }],
  })

  assert.equal(result.status, 'error')
  if (result.status !== 'error') return
  assert.match(result.error, /Mutation constraint gate/)
})

Deno.test('propose → Accept without builder errors; pending kept', async () => {
  clearPendingProposalsForTests()
  const db = mutateDb()
  const programId = db.allocProgram([sampleRoutine()])

  const proposed = await proposeProgramMutation(db.client, USER_ID, {
    program_id: programId,
    operations: [{
      op: 'update_set',
      folderIds: [0],
      dayOrder: 1,
      exerciseIndex: 0,
      setIndex: 0,
      set: { rpe: 9 },
    }],
  })
  assert.equal(proposed.status, 'ok')

  const accepted = await acceptProgramMutation(db.client, USER_ID, {
    program_id: programId,
  })
  assert.equal(accepted.status, 'error')
  if (accepted.status !== 'error') return
  assert.match(accepted.error, /MCP App|builder/)

  // Still pending — Accept with builder works
  const accepted2 = await acceptProgramMutation(db.client, USER_ID, {
    program_id: programId,
    builder_routines: [sampleRoutine()],
  })
  assert.equal(accepted2.status, 'ok')
  if (accepted2.status !== 'ok') return
  assert.equal(accepted2.builder_routines[0].exercises[0].sets[0].rpe, 9)
})

Deno.test('propose → Accept → Save → read sees update_set', async () => {
  clearPendingProposalsForTests()
  const week1 = sampleRoutine({ folder_id: 0 })
  const week2 = sampleRoutine({ folder_id: 1, id: '2', title: 'W2' })

  const programs: TProgramRow[] = []
  const subscribers: TSubRow[] = []
  const links: TLinkRow[] = []
  const scheduleRows: TScheduleRow[] = []
  const exerciseRows: TExerciseUpload[] = []
  const proposals: Array<{
    user_id: string
    program_id: number
    operations: unknown
  }> = []
  const templates: TTemplateRow[] = [{
    id: EXERCISE_ID,
    title: 'Squat',
    equipment: 'barbell',
    primary_muscle_group: 'quadriceps',
  }]

  const programId = 42
  programs.push({
    id: programId,
    user_id: USER_ID,
    title: 'Test',
    program_length: 2,
    schedule_workouts: [week1, week2].map((routine, index) => ({
      id: `sched-${index}`,
      nthWeek: Number(routine.folder_id) + 1,
      nthDay: Number(routine.order),
      day_title: routine.title,
      program_workout_exercises: routine.exercises.map((ex, exIndex) => ({
        id: `ex-${index}-${exIndex}`,
        created_at: `2026-01-0${exIndex + 1}`,
        reps: ex.sets.map((s) => s.reps),
        rpe: ex.sets.map((s) => s.rpe),
        weights: ex.sets.map((s) => s.weight_kg),
        set_types: ex.sets.map((s) => s.type),
        hevy_exercise_templates: {
          id: ex.exercise_template_id,
          title: ex.title,
        },
      })),
    })),
  })
  subscribers.push({ user_id: USER_ID, program_id: programId })

  const client = {
    from(table: string) {
      if (table === 'programs') {
        const filters: Array<{ column: string; value: unknown }> = []
        let updatePatch: Record<string, unknown> | null = null
        const builder = {
          select(_cols?: string) {
            return builder
          },
          eq(column: string, value: unknown) {
            filters.push({ column, value })
            return builder
          },
          update(patch: Record<string, unknown>) {
            updatePatch = patch
            return builder
          },
          async maybeSingle() {
            const match = programs.find((row) =>
              filters.every(
                (filter) =>
                  (row as Record<string, unknown>)[filter.column] ===
                    filter.value,
              ),
            )
            return { data: match ?? null, error: null }
          },
          then(resolve: (v: { data: null; error: null }) => void) {
            if (updatePatch) {
              const match = programs.find((row) =>
                filters.every(
                  (filter) =>
                    (row as Record<string, unknown>)[filter.column] ===
                      filter.value,
                ),
              )
              if (match) Object.assign(match, updatePatch)
            }
            resolve({ data: null, error: null })
          },
        }
        return builder
      }
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
                  (row as Record<string, unknown>)[filter.column] ===
                    filter.value,
              ),
            )
            return { data: match ?? null, error: null }
          },
        }
        return builder
      }
      if (table === 'program_hevy_week_links') {
        const builder = {
          select() {
            return builder
          },
          eq() {
            return builder
          },
          then(resolve: (v: { data: TLinkRow[]; error: null }) => void) {
            resolve({ data: links, error: null })
          },
        }
        return builder
      }
      if (table === 'user_constraints') {
        const builder = {
          select() {
            return builder
          },
          eq() {
            return builder
          },
          async maybeSingle() {
            return { data: null, error: null }
          },
        }
        return builder
      }
      if (table === 'hevy_exercise_templates') {
        const builder = {
          select() {
            return builder
          },
          in() {
            return builder
          },
          limit() {
            return builder
          },
          then(
            resolve: (v: { data: TTemplateRow[]; error: null }) => void,
          ) {
            resolve({ data: templates, error: null })
          },
        }
        return builder
      }
      if (table === 'schedule_workouts') {
        const builder = {
          delete() {
            return builder
          },
          eq() {
            return builder
          },
          insert(rows: TScheduleRow[]) {
            scheduleRows.push(...rows)
            return Promise.resolve({ data: rows, error: null })
          },
          then(resolve: (v: { data: null; error: null }) => void) {
            scheduleRows.length = 0
            exerciseRows.length = 0
            resolve({ data: null, error: null })
          },
        }
        return builder
      }
      if (table === 'program_workout_exercises') {
        return {
          insert(rows: TExerciseUpload[]) {
            exerciseRows.push(...rows)
            return Promise.resolve({ data: rows, error: null })
          },
        }
      }
      if (table === 'mcp_mutation_proposals') {
        const filters: Array<{ column: string; value: unknown }> = []
        let deleteMode = false
        const builder = {
          select() {
            return builder
          },
          eq(column: string, value: unknown) {
            filters.push({ column, value })
            return builder
          },
          upsert(row: {
            user_id: string
            program_id: number
            operations: unknown
          }) {
            const idx = proposals.findIndex(
              (p) =>
                p.user_id === row.user_id && p.program_id === row.program_id,
            )
            if (idx >= 0) proposals[idx] = row
            else proposals.push(row)
            return Promise.resolve({ data: row, error: null })
          },
          delete() {
            deleteMode = true
            return builder
          },
          async maybeSingle() {
            const match = proposals.find((row) =>
              filters.every(
                (filter) =>
                  (row as Record<string, unknown>)[filter.column] ===
                    filter.value,
              ),
            )
            return { data: match ?? null, error: null }
          },
          then(
            resolve: (v: {
              data: Array<{ program_id: number }> | null
              error: null
            }) => void,
          ) {
            if (deleteMode) {
              const removed = proposals.filter((row) =>
                filters.every(
                  (filter) =>
                    (row as Record<string, unknown>)[filter.column] ===
                      filter.value,
                ),
              )
              const keep = proposals.filter((row) =>
                !filters.every(
                  (filter) =>
                    (row as Record<string, unknown>)[filter.column] ===
                      filter.value,
                ),
              )
              proposals.length = 0
              proposals.push(...keep)
              resolve({
                data: removed.map((r) => ({ program_id: r.program_id })),
                error: null,
              })
              return
            }
            resolve({ data: null, error: null })
          },
        }
        return builder
      }
      throw new Error(`Unexpected table ${table}`)
    },
  } as unknown as SupabaseClient

  const proposed = await proposeProgramMutation(client, USER_ID, {
    program_id: programId,
    operations: [{
      op: 'update_set',
      folderIds: [1],
      dayOrder: 1,
      exerciseIndex: 0,
      setIndex: 0,
      set: { rpe: 8 },
    }],
  })
  assert.equal(proposed.status, 'ok')

  const accepted = await acceptProgramMutation(client, USER_ID, {
    program_id: programId,
    builder_routines: [week1, week2],
  })
  assert.equal(accepted.status, 'ok')
  if (accepted.status !== 'ok') return
  assert.equal(accepted.builder_routines[1].exercises[0].sets[0].rpe, 8)

  const saved = await saveProgram(client, USER_ID, {
    program_id: programId,
    builder_routines: accepted.builder_routines,
  })
  assert.equal(saved.status, 'ok')
  assert.ok(exerciseRows.length >= 1)
  const week2Ex = exerciseRows.find((row) =>
    scheduleRows.some(
      (s) => s.id === row.schedule_id && s.nthWeek === 2,
    )
  )
  assert.ok(week2Ex)
  assert.deepEqual(week2Ex!.rpe, [8])

  // Owner-only: other user cannot propose
  const stolen = await proposeProgramMutation(client, OTHER_ID, {
    program_id: programId,
    operations: [{
      op: 'update_set',
      folderIds: [1],
      dayOrder: 1,
      exerciseIndex: 0,
      setIndex: 0,
      set: { rpe: 1 },
    }],
  })
  assert.equal(stolen.status, 'error')
})

Deno.test('Save refuses locked Current week edit', async () => {
  clearPendingProposalsForTests()
  const week1 = sampleRoutine({ folder_id: 0 })
  const week2 = sampleRoutine({ folder_id: 1, id: '2' })
  const programId = 7
  const programs: TProgramRow[] = [{
    id: programId,
    user_id: USER_ID,
    title: 'Locked',
    program_length: 2,
    schedule_workouts: [week1, week2].map((routine, index) => ({
      id: `sched-${index}`,
      nthWeek: Number(routine.folder_id) + 1,
      nthDay: 1,
      day_title: routine.title,
      program_workout_exercises: routine.exercises.map((ex) => ({
        id: 'e',
        created_at: '2026-01-01',
        reps: ex.sets.map((s) => s.reps),
        rpe: ex.sets.map((s) => s.rpe),
        weights: null,
        set_types: ex.sets.map((s) => s.type),
        hevy_exercise_templates: {
          id: ex.exercise_template_id,
          title: ex.title,
        },
      })),
    })),
  }]
  const subscribers: TSubRow[] = [{
    user_id: USER_ID,
    program_id: programId,
  }]
  const links: TLinkRow[] = [{
    program_id: programId,
    nth_week: 1,
    completed_at: null,
  }]

  const client = {
    from(table: string) {
      if (table === 'programs') {
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
            const match = programs.find((row) =>
              filters.every(
                (filter) =>
                  (row as Record<string, unknown>)[filter.column] ===
                    filter.value,
              ),
            )
            return { data: match ?? null, error: null }
          },
        }
        return builder
      }
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
                  (row as Record<string, unknown>)[filter.column] ===
                    filter.value,
              ),
            )
            return { data: match ?? null, error: null }
          },
        }
        return builder
      }
      if (table === 'program_hevy_week_links') {
        const builder = {
          select() {
            return builder
          },
          eq() {
            return builder
          },
          then(resolve: (v: { data: TLinkRow[]; error: null }) => void) {
            resolve({ data: links, error: null })
          },
        }
        return builder
      }
      throw new Error(`Unexpected table ${table}`)
    },
  } as unknown as SupabaseClient

  const editedWeek1 = sampleRoutine({
    folder_id: 0,
    exercises: [{
      ...week1.exercises[0],
      sets: [{ ...week1.exercises[0].sets[0], rpe: 10 }],
    }],
  })

  const saved = await saveProgram(client, USER_ID, {
    program_id: programId,
    builder_routines: [editedWeek1, week2],
  })
  assert.equal(saved.status, 'error')
  if (saved.status !== 'error') return
  assert.match(saved.error, /Edit program lock/)

  // Propose targeting current week also fails
  const proposed = await proposeProgramMutation(client, USER_ID, {
    program_id: programId,
    operations: [{
      op: 'update_set',
      folderIds: [0],
      dayOrder: 1,
      exerciseIndex: 0,
      setIndex: 0,
      set: { rpe: 10 },
    }],
  })
  assert.equal(proposed.status, 'error')
  if (proposed.status !== 'error') return
  assert.match(proposed.error, /Edit program lock/)
})
