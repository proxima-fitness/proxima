// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Zod contracts for Proxima MCP exercise tools — mirror of
 * proxima_landing `src/lib/public-api/openapi-schemas/exercises.ts` (ADR 0033 / 02).
 * Copy, don't import the Next app.
 */

import { z } from 'npm:zod@4'

export const DEFAULT_EXERCISE_PAGE = 1
export const DEFAULT_EXERCISE_PAGE_SIZE = 50
export const MAX_EXERCISE_PAGE_SIZE = 100

/** Hevy create-form exercise-type slugs. */
export const PUBLIC_API_EXERCISE_TYPES = [
  'weight_reps',
  'reps_only',
  'bodyweight_reps',
  'bodyweight_assisted_reps',
  'duration',
  'weight_duration',
  'distance_duration',
  'short_distance_weight',
] as const

/** Hevy create-form equipment slugs. */
export const PUBLIC_API_EQUIPMENT = [
  'none',
  'barbell',
  'dumbbell',
  'kettlebell',
  'machine',
  'plate',
  'resistance_band',
  'suspension',
  'other',
] as const

/** Hevy create-form muscle slugs. */
export const PUBLIC_API_MUSCLE_GROUPS = [
  'abdominals',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'quadriceps',
  'hamstrings',
  'calves',
  'glutes',
  'abductors',
  'adductors',
  'lats',
  'upper_back',
  'traps',
  'lower_back',
  'chest',
  'cardio',
  'neck',
  'full_body',
  'other',
] as const

export const ListExercisesInput = z.object({
  page: z.number().int().min(1).optional().describe('1-based page.'),
  page_size: z
    .number()
    .int()
    .min(1)
    .max(MAX_EXERCISE_PAGE_SIZE)
    .optional()
    .describe(`Results per page (1–${MAX_EXERCISE_PAGE_SIZE}).`),
})

export const PublicApiExercise = z.object({
  id: z.string().uuid(),
  title: z.string(),
  exercise_type: z.string().nullable(),
  equipment: z.string().nullable(),
  primary_muscle_group: z.string().nullable(),
  secondary_muscle_groups: z.array(z.string()).nullable(),
})

export const PublicApiExerciseList = z.object({
  exercises: z.array(PublicApiExercise),
  page: z.number().int(),
  page_size: z.number().int(),
  has_more: z.boolean(),
})

export const CreateCustomExerciseInput = z.object({
  title: z
    .string()
    .trim()
    .min(1)
    .describe('Display title. Duplicate normalized title for this user returns the existing id.'),
  exercise_type: z
    .enum(PUBLIC_API_EXERCISE_TYPES)
    .describe('Same slugs as the in-app Hevy create form.'),
  equipment: z
    .enum(PUBLIC_API_EQUIPMENT)
    .describe('Same slugs as the in-app Hevy create form (equipment_category).'),
  primary_muscle_group: z
    .enum(PUBLIC_API_MUSCLE_GROUPS)
    .describe('Same slugs as the in-app Hevy create form (muscle_group).'),
  secondary_muscle_groups: z
    .array(z.enum(PUBLIC_API_MUSCLE_GROUPS))
    .optional()
    .describe('Other muscles. Same slugs as primary.'),
})

export const CreatedExercise = z.object({
  id: z.string().uuid(),
})

export type TListExercisesInput = z.infer<typeof ListExercisesInput>
export type TCreateCustomExerciseInput = z.infer<typeof CreateCustomExerciseInput>
export type TPublicApiExercise = z.infer<typeof PublicApiExercise>
export type TPublicApiExerciseList = z.infer<typeof PublicApiExerciseList>

export type TCreateParse =
  | {
      ok: true
      draft: {
        title: string
        exercise_type: TCreateCustomExerciseInput['exercise_type']
        equipment: TCreateCustomExerciseInput['equipment']
        primary_muscle_group: TCreateCustomExerciseInput['primary_muscle_group']
        secondary_muscle_groups: TCreateCustomExerciseInput['primary_muscle_group'][] | null
      }
    }
  | { ok: false; error: string }

/**
 * Parses a create-custom-exercise body. Used by the tool handler so invalid
 * payloads return `errorResult` (not only SDK schema rejection).
 */
export function parseCreateCustomExercise(body: unknown): TCreateParse {
  const parsed = CreateCustomExerciseInput.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { ok: false, error: first?.message ?? 'Invalid request body' }
  }
  return {
    ok: true,
    draft: {
      title: parsed.data.title,
      exercise_type: parsed.data.exercise_type,
      equipment: parsed.data.equipment,
      primary_muscle_group: parsed.data.primary_muscle_group,
      secondary_muscle_groups: parsed.data.secondary_muscle_groups ?? null,
    },
  }
}

/** Resolves list pagination defaults to match Public API OpenAPI. */
export function resolveListPagination(input: TListExercisesInput): {
  page: number
  pageSize: number
} {
  return {
    page: input.page ?? DEFAULT_EXERCISE_PAGE,
    pageSize: input.page_size ?? DEFAULT_EXERCISE_PAGE_SIZE,
  }
}
