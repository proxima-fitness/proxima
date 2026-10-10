// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Zod inputs for MCP program mutate / Accept / Save (ADR 0034 / 04).
 * Agent-exposed op subset from @proxima/program-mutation-schemas.
 *
 * Ops: insert_exercise, edit_exercise, swap_exercise_template, delete_exercise,
 * update_set, edit_day_title, add_day_notes, add_exercise_notes, delete_day,
 * add_day, delete_week, create_superset, remove_from_superset.
 */

import { z } from 'zod'
import {
  addDayNotesSchema,
  addDaySchema,
  addExerciseNotesSchema,
  createSupersetSchema,
  deleteDaySchema,
  deleteExerciseSchema,
  deleteWeekSchema,
  editDayTitleSchema,
  editExerciseSchema,
  insertExerciseSchema,
  normalizeAgentOperationInput,
  removeFromSupersetSchema,
  swapExerciseTemplateSchema,
  updateSetSchema,
} from '@proxima/program-mutation-schemas'

export const agentProgramOperationSchema = z.discriminatedUnion('op', [
  insertExerciseSchema,
  editExerciseSchema,
  swapExerciseTemplateSchema,
  deleteExerciseSchema,
  updateSetSchema,
  editDayTitleSchema,
  addDayNotesSchema,
  addExerciseNotesSchema,
  deleteDaySchema,
  addDaySchema,
  deleteWeekSchema,
  createSupersetSchema,
  removeFromSupersetSchema,
])

export type TAgentProgramOperation = z.infer<typeof agentProgramOperationSchema>

const builderSetSchema = z.object({
  index: z.number().int().nonnegative(),
  type: z.string(),
  weight_kg: z.number().nullable(),
  reps: z.number().nullable(),
  distance_meters: z.number().nullable(),
  duration_seconds: z.number().nullable(),
  rpe: z.number().nullable(),
  custom_metric: z.number().nullable(),
  rep_range: z
    .object({ start: z.number(), end: z.number() })
    .nullable(),
})

const builderExerciseSchema = z.object({
  index: z.number().int().nonnegative(),
  title: z.string(),
  notes: z.string(),
  rest_seconds: z.string().nullable(),
  exercise_template_id: z.string(),
  supersets_id: z.number().nullable(),
  sets: z.array(builderSetSchema),
})

export const builderRoutineSchema = z.object({
  id: z.string(),
  title: z.string(),
  folder_id: z.number().int().nonnegative(),
  notes: z.string(),
  order: z.string(),
  exercises: z.array(builderExerciseSchema),
})

export type TBuilderRoutine = z.infer<typeof builderRoutineSchema>

export const MutateProgramInput = z.object({
  program_id: z.number().int().positive(),
  operations: z
    .array(z.preprocess(normalizeAgentOperationInput, agentProgramOperationSchema))
    .min(1)
    .describe(
      'Ordered Program mutation batch. Fail-all: if any op is invalid, nothing is proposed.',
    ),
})

export type TMutateProgramInput = z.infer<typeof MutateProgramInput>

export const AcceptProgramMutationInput = z.object({
  program_id: z.number().int().positive(),
  builder_routines: z
    .array(builderRoutineSchema)
    .optional()
    .describe(
      'Current MCP App / builder in-memory grid. Omit when App is closed — Accept errors and does not write the prescription.',
    ),
})

export type TAcceptProgramMutationInput = z.infer<
  typeof AcceptProgramMutationInput
>

export const RejectProgramMutationInput = z.object({
  program_id: z.number().int().positive(),
})

export type TRejectProgramMutationInput = z.infer<
  typeof RejectProgramMutationInput
>

export const SaveProgramInput = z.object({
  program_id: z.number().int().positive(),
  builder_routines: z
    .array(builderRoutineSchema)
    .min(1)
    .describe(
      'Builder grid to persist as the Program prescription (Edit program Save).',
    ),
})

export type TSaveProgramInput = z.infer<typeof SaveProgramInput>
