/**
 * Schema parse tests for exercise MCP tools (ADR 0033 / 02).
 */

import assert from 'node:assert/strict'

import {
  CreateCustomExerciseInput,
  ListExercisesInput,
  parseCreateCustomExercise,
  resolveListPagination,
} from './exercise-schema.ts'
import { errorResult } from './result.ts'

Deno.test('ListExercisesInput accepts empty object and applies defaults', () => {
  const parsed = ListExercisesInput.parse({})
  const { page, pageSize } = resolveListPagination(parsed)
  assert.equal(page, 1)
  assert.equal(pageSize, 50)
})

Deno.test('ListExercisesInput rejects page_size above max', () => {
  const result = ListExercisesInput.safeParse({ page_size: 101 })
  assert.equal(result.success, false)
})

Deno.test('parseCreateCustomExercise accepts valid body', () => {
  const parsed = parseCreateCustomExercise({
    title: 'Owner Custom Curl',
    exercise_type: 'weight_reps',
    equipment: 'dumbbell',
    primary_muscle_group: 'biceps',
  })
  assert.equal(parsed.ok, true)
  if (parsed.ok) {
    assert.equal(parsed.draft.title, 'Owner Custom Curl')
    assert.equal(parsed.draft.secondary_muscle_groups, null)
  }
})

Deno.test('parseCreateCustomExercise rejects invalid enum → errorResult message', () => {
  const parsed = parseCreateCustomExercise({
    title: 'Bad',
    exercise_type: 'not_a_type',
    equipment: 'dumbbell',
    primary_muscle_group: 'biceps',
  })
  assert.equal(parsed.ok, false)
  if (!parsed.ok) {
    const result = errorResult(parsed.error)
    assert.equal(result.isError, true)
    const first = result.content?.[0]
    assert.equal(first?.type, 'text')
  }
})

Deno.test('CreateCustomExerciseInput rejects empty title', () => {
  const result = CreateCustomExerciseInput.safeParse({
    title: '   ',
    exercise_type: 'weight_reps',
    equipment: 'dumbbell',
    primary_muscle_group: 'biceps',
  })
  assert.equal(result.success, false)
})
