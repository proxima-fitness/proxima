/**
 * ADR 0035 slice 03 — Deno can resolve all three workspace packages.
 * Run: deno test --config deno.json tools/packages_smoke_test.ts
 */

import { assertEquals } from 'jsr:@std/assert@1'
import { exerciseMatchKey, normalizeExerciseTitle } from '@proxima/exercise-identity'
import { sanitizeExcludedEquipment } from '@proxima/mutation-constraint-gate'
import { programOperationSchema } from '@proxima/program-mutation-schemas'

Deno.test('workspace packages resolve under Deno', () => {
  assertEquals(normalizeExerciseTitle('  Bench   Press '), 'bench press')
  assertEquals(exerciseMatchKey('Press (Bench)'), 'bench press')
  assertEquals(sanitizeExcludedEquipment(['none', 'Barbell']), ['Barbell'])
  assertEquals(programOperationSchema.safeParse({ op: 'nope' }).success, false)
})
