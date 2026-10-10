/**
 * Persistence tests for Agentic memory MCP tools (ADR 0034 / 02).
 * Run: deno test --config deno.json tools/memory-db_test.ts
 */

import assert from 'node:assert/strict'
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.108.2'

import {
  getConstraintProfile,
  getLatestBodyMeasurement,
  getTrainingProfile,
  patchStringArray,
  updateConstraintProfile,
  updateTrainingProfile,
} from './memory-db.ts'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_ID = '22222222-2222-4222-8222-222222222222'

type TConstraintSeed = {
  user_id: string
  injuries: string[]
  excluded_equipment: string[]
  excluded_areas: string[]
  preferences: Record<string, string>
  raw_statements: string[]
}

type TTrainingSeed = {
  user_id: string
  age: number | null
  sex: string | null
  height_cm: number | null
  experience_level: string | null
  physique_phase: string | null
  training_focus: string | null
  activity_level: string | null
  session_duration_min: number | null
}

type TBodySeed = {
  user_id: string
  id: string
  measured_on: string
  weight_kg: number | null
}

function memoryDb(seed?: {
  constraints?: TConstraintSeed[]
  training?: TTrainingSeed[]
  bodies?: TBodySeed[]
}) {
  const constraints = [...(seed?.constraints ?? [])]
  const training = [...(seed?.training ?? [])]
  const bodies = [...(seed?.bodies ?? [])]
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = []

  return {
    rpcCalls,
    client: {
      from(table: string) {
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
                    row[filter.column as keyof TConstraintSeed] === filter.value
                )
              )
              return { data: match ?? null, error: null }
            },
            async upsert(
              row: {
                user_id: string
                injuries: string[]
                excluded_equipment: string[]
                excluded_areas: string[]
                preferences: Record<string, string>
              },
              _opts?: { onConflict?: string }
            ) {
              const idx = constraints.findIndex((r) => r.user_id === row.user_id)
              const next: TConstraintSeed = {
                user_id: row.user_id,
                injuries: row.injuries,
                excluded_equipment: row.excluded_equipment,
                excluded_areas: row.excluded_areas,
                preferences: row.preferences,
                raw_statements:
                  idx >= 0 ? constraints[idx]!.raw_statements : [],
              }
              if (idx >= 0) constraints[idx] = next
              else constraints.push(next)
              return { data: next, error: null }
            },
          }
          return builder
        }

        if (table === 'user_training_profile') {
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
              const match = training.find((row) =>
                filters.every(
                  (filter) =>
                    row[filter.column as keyof TTrainingSeed] === filter.value
                )
              )
              return { data: match ?? null, error: null }
            },
            async upsert(
              row: TTrainingSeed,
              _opts?: { onConflict?: string }
            ) {
              const idx = training.findIndex((r) => r.user_id === row.user_id)
              if (idx >= 0) training[idx] = row
              else training.push(row)
              return { data: row, error: null }
            },
          }
          return builder
        }

        if (table === 'body_measurements') {
          const filters: Array<{ column: string; value: unknown }> = []
          const orders: Array<{ column: string; ascending: boolean }> = []
          const builder = {
            select() {
              return builder
            },
            eq(column: string, value: unknown) {
              filters.push({ column, value })
              return builder
            },
            order(column: string, opts?: { ascending?: boolean }) {
              orders.push({
                column,
                ascending: opts?.ascending !== false,
              })
              return builder
            },
            limit(_n: number) {
              return builder
            },
            async maybeSingle() {
              let rows = bodies.filter((row) =>
                filters.every(
                  (filter) =>
                    row[filter.column as keyof TBodySeed] === filter.value
                )
              )
              for (const ord of [...orders].reverse()) {
                rows = [...rows].sort((a, b) => {
                  const av = a[ord.column as keyof TBodySeed]
                  const bv = b[ord.column as keyof TBodySeed]
                  if (av === bv) return 0
                  if (av == null) return 1
                  if (bv == null) return -1
                  const cmp = av < bv ? -1 : 1
                  return ord.ascending ? cmp : -cmp
                })
              }
              const match = rows[0] ?? null
              return {
                data: match
                  ? {
                    measured_on: match.measured_on,
                    weight_kg: match.weight_kg,
                    lean_mass_kg: null,
                    fat_percent: null,
                    neck_cm: null,
                    shoulder_cm: null,
                    chest_cm: null,
                    left_bicep_cm: null,
                    right_bicep_cm: null,
                    left_forearm_cm: null,
                    right_forearm_cm: null,
                    abdomen: null,
                    waist: null,
                    hips: null,
                    left_thigh: null,
                    right_thigh: null,
                    left_calf: null,
                    right_calf: null,
                  }
                  : null,
                error: null,
              }
            },
          }
          return builder
        }

        throw new Error(`unexpected table ${table}`)
      },
      async rpc(name: string, args: Record<string, unknown>) {
        rpcCalls.push({ name, args })
        if (name === 'append_raw_statement') {
          const userId = args.p_user_id as string
          const statement = args.p_statement as string
          const row = constraints.find((r) => r.user_id === userId)
          if (row) row.raw_statements.push(statement)
          return { data: null, error: null }
        }
        return { data: null, error: { message: `unknown rpc ${name}` } }
      },
    } as unknown as SupabaseClient,
  }
}

Deno.test('getConstraintProfile returns null when empty', async () => {
  const { client } = memoryDb()
  assert.equal(await getConstraintProfile(client, USER_ID), null)
})

Deno.test('getConstraintProfile ignores other user rows', async () => {
  const { client } = memoryDb({
    constraints: [
      {
        user_id: OTHER_ID,
        injuries: ['knee'],
        excluded_equipment: [],
        excluded_areas: [],
        preferences: {},
        raw_statements: [],
      },
    ],
  })
  assert.equal(await getConstraintProfile(client, USER_ID), null)
})

Deno.test('updateConstraintProfile round-trip + rawStatement', async () => {
  const { client, rpcCalls } = memoryDb()

  const skipped = await updateConstraintProfile(client, USER_ID, {})
  assert.equal(skipped.status, 'skipped')

  const updated = await updateConstraintProfile(client, USER_ID, {
    addInjuries: ['shoulder pain'],
    addExcludedEquipment: ['cable', 'none'],
    preferences: { splitType: 'ppl' },
    rawStatement: 'my shoulder hurts',
  })
  assert.equal(updated.status, 'ok')
  if (updated.status !== 'ok') return

  assert.deepEqual(updated.profile.injuries, ['shoulder pain'])
  assert.deepEqual(updated.profile.excludedEquipment, ['cable'])
  assert.equal(updated.profile.preferences.splitType, 'ppl')
  assert.deepEqual(updated.profile.rawStatements, ['my shoulder hurts'])
  assert.equal(rpcCalls[0]?.name, 'append_raw_statement')

  const read = await getConstraintProfile(client, USER_ID)
  assert.deepEqual(read?.injuries, ['shoulder pain'])
  assert.deepEqual(read?.rawStatements, ['my shoulder hurts'])
})

Deno.test('patchStringArray splits CSV add blobs', () => {
  assert.deepEqual(patchStringArray(['knee'], ['hip, ankle'], ['KNEE']), [
    'hip',
    'ankle',
  ])
})

Deno.test('getTrainingProfile empty / update round-trip', async () => {
  const { client } = memoryDb()
  assert.equal(await getTrainingProfile(client, USER_ID), null)

  const skipped = await updateTrainingProfile(client, USER_ID, {})
  assert.equal(skipped.status, 'skipped')

  const updated = await updateTrainingProfile(client, USER_ID, {
    age: 32,
    sex: 'male',
    experienceLevel: 'intermediate',
    sessionDurationMin: 45,
  })
  assert.equal(updated.status, 'ok')
  if (updated.status !== 'ok') return
  assert.equal(updated.profile.age, 32)
  assert.equal(updated.profile.sessionDurationMin, 50)

  const read = await getTrainingProfile(client, USER_ID)
  assert.equal(read?.age, 32)
  assert.equal(read?.sex, 'male')
  assert.equal(read?.experienceLevel, 'intermediate')
})

Deno.test('getLatestBodyMeasurement empty / newest wins', async () => {
  const empty = memoryDb()
  assert.equal(await getLatestBodyMeasurement(empty.client, USER_ID), null)

  const { client } = memoryDb({
    bodies: [
      {
        user_id: USER_ID,
        id: 'a',
        measured_on: '2026-01-01',
        weight_kg: 80,
      },
      {
        user_id: USER_ID,
        id: 'b',
        measured_on: '2026-03-01',
        weight_kg: 78,
      },
      {
        user_id: OTHER_ID,
        id: 'c',
        measured_on: '2026-04-01',
        weight_kg: 90,
      },
    ],
  })
  const latest = await getLatestBodyMeasurement(client, USER_ID)
  assert.equal(latest?.measured_on, '2026-03-01')
  assert.equal(latest?.weight_kg, 78)
})
