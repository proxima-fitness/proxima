/**
 * @module lib/public-api/openapi-schemas/exercises
 *
 * Zod contracts for the Public API exercise catalog. `next-openapi-gen`
 * scans this folder (`npm run openapi:generate`).
 *
 * Depends on: zod
 * Used by: GET /api/v1/exercises JSDoc, canonical-exercises types
 */

import { z } from "zod";

export const DEFAULT_EXERCISE_PAGE = 1;
export const DEFAULT_EXERCISE_PAGE_SIZE = 50;
export const MAX_EXERCISE_PAGE_SIZE = 100;

export const PublicApiExerciseListQuery = z.object({
    page: z.number().int().min(1).optional().describe("1-based page."),
    page_size: z
        .number()
        .int()
        .min(1)
        .max(MAX_EXERCISE_PAGE_SIZE)
        .optional()
        .describe(`Results per page (1–${MAX_EXERCISE_PAGE_SIZE}).`),
});

export const PublicApiExercise = z.object({
    id: z
        .string()
        .uuid()
        .describe("Canonical exercise ID. Use as `canonical_exercise_id` on a Workout."),
    title: z.string(),
    exercise_type: z.string().nullable(),
    equipment: z.string().nullable(),
    primary_muscle_group: z.string().nullable(),
    secondary_muscle_groups: z.array(z.string()).nullable(),
});

export const PublicApiExerciseList = z.object({
    exercises: z.array(PublicApiExercise),
    page: z.number().int(),
    page_size: z.number().int(),
    has_more: z.boolean(),
});

export const PublicApiError = z.object({
    error: z.string(),
});
