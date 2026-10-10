// SPDX-License-Identifier: AGPL-3.0-only

/**
 * ADR 0035 / 0034 — Deno can resolve workspace packages.
 * Run: deno test --config deno.json tools/packages_smoke_test.ts
 */

import { assertEquals } from 'jsr:@std/assert@1'
import {
  getWeekStartKeyForTimestamp,
  normalizeMeasuredOnBound,
  takeKeysetPage,
} from '@proxima/athlete-read'
import { exerciseMatchKey, normalizeExerciseTitle } from '@proxima/exercise-identity'
import { sanitizeExcludedEquipment } from '@proxima/mutation-constraint-gate'
import { programOperationSchema } from '@proxima/program-mutation-schemas'

Deno.test('workspace packages resolve under Deno', () => {
  assertEquals(normalizeExerciseTitle('  Bench   Press '), 'bench press')
  assertEquals(exerciseMatchKey('Press (Bench)'), 'bench press')
  assertEquals(sanitizeExcludedEquipment(['none', 'Barbell']), ['Barbell'])
  assertEquals(programOperationSchema.safeParse({ op: 'nope' }).success, false)
  assertEquals(getWeekStartKeyForTimestamp('2024-06-10T09:00:00.000Z'), '2024-06-09')
  assertEquals(normalizeMeasuredOnBound('2024-08-14T12:00:00Z'), '2024-08-14')
  assertEquals(takeKeysetPage([1, 2, 3], 2).hasMore, true)
})
