// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Schema parse tests for workout MCP tools (ADR 0033 / 03) — C4/C5.
 */

import assert from 'node:assert/strict'

import { errorResult } from './result.ts'
import {
  HEVY_RESERVED_SOURCE,
  parseCreateWorkout,
  parseReplaceWorkout,
  PUBLIC_API_WORKOUT_SOURCES,
} from './workout-schema.ts'

const BENCH_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

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

Deno.test('PUBLIC_API_WORKOUT_SOURCES excludes hevy', () => {
  assert.equal(PUBLIC_API_WORKOUT_SOURCES.includes(HEVY_RESERVED_SOURCE as never), false)
  assert.ok(PUBLIC_API_WORKOUT_SOURCES.includes('manual'))
  assert.ok(PUBLIC_API_WORKOUT_SOURCES.includes('strong'))
})

Deno.test('parseCreateWorkout rejects hevy → errorResult', () => {
  const parsed = parseCreateWorkout({ ...VALID_BODY, source: 'hevy' })
  assert.equal(parsed.ok, false)
  if (!parsed.ok) {
    assert.match(parsed.error, /hevy/i)
    assert.equal(errorResult(parsed.error).isError, true)
  }
})

Deno.test('parseCreateWorkout rejects unknown source and routine_id', () => {
  assert.equal(parseCreateWorkout({ ...VALID_BODY, source: 'other' }).ok, false)
  assert.equal(parseCreateWorkout({ ...VALID_BODY, routine_id: null }).ok, false)
  assert.equal(parseCreateWorkout({ ...VALID_BODY, routine_id: 'r1' }).ok, false)
})

Deno.test('parseCreateWorkout accepts a valid history body', () => {
  const parsed = parseCreateWorkout(VALID_BODY)
  assert.equal(parsed.ok, true)
  if (parsed.ok) {
    assert.equal(parsed.draft.source, 'strong')
    assert.equal(parsed.draft.title, 'Push')
  }
})

Deno.test('parseReplaceWorkout rejects source, external_id, routine_id', () => {
  const { source: _s, external_id: _e, ...mutable } = VALID_BODY
  assert.equal(parseReplaceWorkout(mutable).ok, true)
  assert.equal(parseReplaceWorkout(VALID_BODY).ok, false)
  assert.equal(parseReplaceWorkout({ ...mutable, routine_id: null }).ok, false)
})
