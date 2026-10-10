/**
 * @module lib/public-api/openapi-schemas/exercises
 *
 * Zod contracts for the Public API exercise catalog and **Custom exercise**
 * create. `next-openapi-gen` scans this folder (`npm run openapi:generate`).
 * Create enums match the in-app Hevy form (`HevyCreateCustomExerciseView`).
 *
 * Depends on: zod, hevy-create-custom-exercise-options, hevy-muscle-group-labels
 * Used by: GET/POST /api/v1/exercises JSDoc, canonical-exercises,
 *   custom-exercise
 */

import { z } from "zod";
import {
    HEVY_EQUIPMENT_ORDER,
    HEVY_EXERCISE_TYPE_ORDER,
} from "@/components/program-builder/hevy/hevy-create-custom-exercise-options";
import { HEVY_MUSCLE_GROUP_ORDER } from "@/components/program-builder/hevy/hevy-muscle-group-labels";

export const DEFAULT_EXERCISE_PAGE = 1;
export const DEFAULT_EXERCISE_PAGE_SIZE = 50;
export const MAX_EXERCISE_PAGE_SIZE = 100;

type THevyExerciseType = THevyPostExerciseTemplate["exercise_type"];
type THevyEquipment = THevyPostExerciseTemplate["equipment_category"];
type THevyMuscle = THevyPostExerciseTemplate["muscle_group"];

/** Hevy create-form exercise-type slugs (`HEVY_EXERCISE_TYPE_ORDER`). */
export const PUBLIC_API_EXERCISE_TYPES = HEVY_EXERCISE_TYPE_ORDER;

/** Hevy create-form equipment slugs (`HEVY_EQUIPMENT_ORDER`). */
export const PUBLIC_API_EQUIPMENT = HEVY_EQUIPMENT_ORDER;

/** Hevy create-form muscle slugs (`HEVY_MUSCLE_GROUP_ORDER`). */
export const PUBLIC_API_MUSCLE_GROUPS = HEVY_MUSCLE_GROUP_ORDER;

type TMissing<TUnion, TList extends readonly string[]> = Exclude<TUnion, TList[number]>;
type THevyFormEnumsCovered = [
    TMissing<THevyExerciseType, typeof PUBLIC_API_EXERCISE_TYPES>,
    TMissing<THevyEquipment, typeof PUBLIC_API_EQUIPMENT>,
    TMissing<THevyMuscle, typeof PUBLIC_API_MUSCLE_GROUPS>,
] extends [never, never, never]
    ? true
    : never;
const hevyFormEnumsCovered: THevyFormEnumsCovered = true;
void hevyFormEnumsCovered;

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

export const PublicApiCreateCustomExercise = z.object({
    title: z.string().trim().min(1).describe("Display title. Duplicate normalized title for this user returns the existing id."),
    exercise_type: z
        .enum(PUBLIC_API_EXERCISE_TYPES)
        .describe("Same slugs as the in-app Hevy create form."),
    equipment: z
        .enum(PUBLIC_API_EQUIPMENT)
        .describe("Same slugs as the in-app Hevy create form (`equipment_category`)."),
    primary_muscle_group: z
        .enum(PUBLIC_API_MUSCLE_GROUPS)
        .describe("Same slugs as the in-app Hevy create form (`muscle_group`)."),
    secondary_muscle_groups: z
        .array(z.enum(PUBLIC_API_MUSCLE_GROUPS))
        .optional()
        .describe("Other muscles. Same slugs as primary."),
});

export const PublicApiCreatedExercise = z.object({
    id: z
        .string()
        .uuid()
        .describe("Canonical exercise ID. Use as `canonical_exercise_id` on a Workout."),
});
