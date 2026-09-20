/**
 * @module lib/public-api/custom-exercise
 *
 * POST **Custom exercise** for the Public API (ADR 0026 / 04). Validates the
 * Hevy-form contract, then mints via `mintCustomMovement` with the key holder's
 * `user_id` and a service-role client. Never inserts a global (`user_id` null).
 *
 * Depends on: zod, @/api/custom-movements, @/lib/public-api/openapi-schemas/exercises
 * Used by: POST /api/v1/exercises
 */

import {
    mintCustomMovement,
    type TCustomMovementDraft,
} from "@/api/custom-movements";
import type { TPublicApiExerciseDb } from "./canonical-exercises";
import { PublicApiCreateCustomExercise } from "./openapi-schemas/exercises";

export type TCreateCustomExerciseParse =
    | { ok: true; draft: TCustomMovementDraft }
    | { ok: false; error: string };

/**
 * Parses a POST /api/v1/exercises body into a mint draft.
 *
 * @param body - JSON value from the request
 */
export function parseCreateCustomExerciseBody(
    body: unknown,
): TCreateCustomExerciseParse {
    const parsed = PublicApiCreateCustomExercise.safeParse(body);
    if (!parsed.success) {
        const first = parsed.error.issues[0];
        return { ok: false, error: first?.message ?? "Invalid request body" };
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
    };
}

/**
 * Mints — or finds — this athlete's **Custom exercise**.
 *
 * @param db - Service-role client
 * @param userId - Resolved **Proxima API key** owner; never null
 * @param draft - Validated create body
 */
export async function createPublicApiCustomExercise(
    db: TPublicApiExerciseDb,
    userId: string,
    draft: TCustomMovementDraft,
): Promise<string> {
    return mintCustomMovement(userId, draft, db);
}
