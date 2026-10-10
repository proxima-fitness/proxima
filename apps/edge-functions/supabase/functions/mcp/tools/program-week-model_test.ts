// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Week builder clamp / paging / set patch (ADR 0034 / 06–07).
 * Run: deno test --config deno.json tools/program-week-model_test.ts
 */

import assert from 'node:assert/strict'

import type { TPrescriptionRoutine } from './programs-db.ts'
import {
  buildProgramWeekBuilder,
  clampWeekIndex,
  daysForWeek,
  patchBuilderSet,
  weekIndices,
} from './program-week-model.ts'

function routine(
  folder_id: number,
  order: string,
  title: string,
): TPrescriptionRoutine {
  return {
    id: `${folder_id}-${order}`,
    title,
    folder_id,
    notes: '',
    order,
    exercises: [
      {
        index: 0,
        title: 'Squat',
        notes: '',
        rest_seconds: null,
        exercise_template_id: 'sq',
        supersets_id: null,
        sets: [
          {
            index: 0,
            type: 'normal',
            weight_kg: 100,
            reps: 5,
            distance_meters: null,
            duration_seconds: null,
            rpe: null,
            custom_metric: null,
            rep_range: null,
          },
        ],
      },
    ],
  }
}

Deno.test('weekIndices sorts unique folder_ids', () => {
  assert.deepEqual(
    weekIndices([
      routine(2, '1', 'W3D1'),
      routine(0, '1', 'W1D1'),
      routine(2, '2', 'W3D2'),
      routine(0, '2', 'W1D2'),
    ]),
    [0, 2],
  )
})

Deno.test('clampWeekIndex bounds', () => {
  assert.equal(clampWeekIndex(-1, 4), 0)
  assert.equal(clampWeekIndex(99, 4), 3)
  assert.equal(clampWeekIndex(2, 4), 2)
  assert.equal(clampWeekIndex(0, 0), 0)
})

Deno.test('buildProgramWeekBuilder pages + full builder_routines', () => {
  const shell = buildProgramWeekBuilder({
    program_id: 9,
    title: 'Block A',
    week_index: 1,
    pending_op_count: 2,
    routines: [
      routine(0, '1', 'W1D1'),
      routine(1, '1', 'W2D1'),
      routine(1, '2', 'W2D2'),
    ],
  })
  assert.equal(shell.week_index, 1)
  assert.equal(shell.week_count, 2)
  assert.equal(shell.builder_routines.length, 3)
  assert.equal(shell.pending_proposal, true)
  assert.equal(shell.pending_op_count, 2)
  const days = daysForWeek(shell.builder_routines, shell.week_index)
  assert.equal(days.length, 2)
  assert.equal(days[0]?.title, 'W2D1')
  assert.equal(days[0]?.exercises[0]?.sets[0]?.reps, 5)
})

Deno.test('patchBuilderSet updates one set field', () => {
  const routines = buildProgramWeekBuilder({
    program_id: 1,
    title: 'T',
    week_index: 0,
    routines: [routine(0, '1', 'D1')],
  }).builder_routines
  const next = patchBuilderSet(routines, '0-1', 0, 0, 'rpe', 8)
  assert.equal(next[0]?.exercises[0]?.sets[0]?.rpe, 8)
  assert.equal(routines[0]?.exercises[0]?.sets[0]?.rpe, null)
})
