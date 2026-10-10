// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module lib/public-api/openapi-schemas/workouts
 *
 * Zod contracts for Public API history-only **Workouts** (ADR 0026 / 05).
 * `next-openapi-gen` scans this folder (`npm run openapi:generate`).
 *
 * Depends on: zod, @/lib/public-api/workout-source
 * Used by: POST/GET/PUT/DELETE /api/v1/workouts JSDoc, public-api-workout
 */

import { z } from "zod";
import { PUBLIC_API_WORKOUT_SOURCES } from "@/lib/public-api/workout-source";

export const PUBLIC_API_SET_TYPES = ["normal", "warmup", "dropset", "failure"] as const;

export const PublicApiWorkoutId = z.object({
    id: z.string().uuid().describe("Proxima Workout backup id."),
});

export const PublicApiWorkoutSet = z.object({
    set_type: z.enum(PUBLIC_API_SET_TYPES).describe("normal, warmup, dropset, or failure."),
    weight_kg: z.number().nullable().optional(),
    reps: z.number().nullable().optional(),
    duration_seconds: z.number().nullable().optional(),
    distance_meters: z.number().nullable().optional(),
    rpe: z.number().nullable().optional(),
    custom_metric: z.number().nullable().optional(),
    rep_range_start: z.number().nullable().optional(),
    rep_range_end: z.number().nullable().optional(),
});

export const PublicApiWorkoutExercise = z.object({
    canonical_exercise_id: z
        .string()
        .uuid()
        .describe("ID from GET /api/v1/exercises or POST /api/v1/exercises."),
    notes: z.string().optional().describe("Exercise-level notes."),
    sets: z.array(PublicApiWorkoutSet).min(1).describe("At least one set."),
});

function refineWorkoutTimes(
    data: { ended_at: string; started_at: string },
    ctx: z.RefinementCtx,
): void {
    const startedAt = Date.parse(data.started_at);
    const endedAt = Date.parse(data.ended_at);
    if (Number.isNaN(startedAt)) {
        ctx.addIssue({
            code: "custom",
            path: ["started_at"],
            message: "started_at must be a valid ISO 8601 datetime",
        });
    }
    if (Number.isNaN(endedAt)) {
        ctx.addIssue({
            code: "custom",
            path: ["ended_at"],
            message: "ended_at must be a valid ISO 8601 datetime",
        });
    }
    if (!Number.isNaN(startedAt) && !Number.isNaN(endedAt) && endedAt < startedAt) {
        ctx.addIssue({
            code: "custom",
            path: ["ended_at"],
            message: "ended_at must be at or after started_at",
        });
    }
}

export const PublicApiCreateWorkout = z
    .object({
        source: z
            .enum(PUBLIC_API_WORKOUT_SOURCES)
            .describe("Closed Workout source list. hevy is rejected."),
        external_id: z
            .string()
            .trim()
            .min(1)
            .describe("Caller identity for this session. Unique with source per athlete."),
        started_at: z.string().describe("ISO 8601 start."),
        ended_at: z.string().describe("ISO 8601 end. Must be at or after started_at."),
        title: z.string().trim().min(1),
        description: z.string().optional(),
        exercises: z
            .array(PublicApiWorkoutExercise)
            .min(1)
            .describe("At least one exercise."),
    })
    .superRefine(refineWorkoutTimes);

export const PublicApiReplaceWorkout = z
    .object({
        started_at: z.string().describe("ISO 8601 start."),
        ended_at: z.string().describe("ISO 8601 end. Must be at or after started_at."),
        title: z.string().trim().min(1),
        description: z.string().optional(),
        exercises: z.array(PublicApiWorkoutExercise).min(1),
    })
    .superRefine(refineWorkoutTimes);

export const PublicApiWorkout = z.object({
    id: z.string().uuid().describe("Proxima Workout backup id."),
    source: z.enum(PUBLIC_API_WORKOUT_SOURCES),
    external_id: z.string(),
    started_at: z.string(),
    ended_at: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    exercises: z.array(
        PublicApiWorkoutExercise.extend({
            notes: z.string().nullable(),
            sets: z.array(
                PublicApiWorkoutSet.extend({
                    weight_kg: z.number().nullable(),
                    reps: z.number().nullable(),
                    duration_seconds: z.number().nullable(),
                    distance_meters: z.number().nullable(),
                    rpe: z.number().nullable(),
                    custom_metric: z.number().nullable(),
                    rep_range_start: z.number().nullable(),
                    rep_range_end: z.number().nullable(),
                }),
            ),
        }),
    ),
});

export const PublicApiCreatedWorkout = z.object({
    id: z.string().uuid().describe("Proxima Workout backup id."),
});
