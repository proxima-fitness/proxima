/**
 * @module api/v1/exercises
 *
 * GET **Canonical exercises** for the Public API (ADR 0026 / 03–04). No key:
 * paginated globals. Valid **Proxima API key**: also that user's **Custom
 * exercises**. POST creates a **Custom exercise** for the key holder. Cookie
 * session is ignored.
 *
 * Depends on: @/api/supabase-admin, @/lib/public-api/proxima-api-key,
 *   @/lib/public-api/canonical-exercises, @/lib/public-api/custom-exercise
 * Used by: Scalar Try It, third-party / agent callers
 */

import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/api/supabase-admin";
import { resolveProximaApiKeyUserId } from "@/lib/public-api/proxima-api-key";
import {
    listPublicApiExercises,
    parseExerciseListQuery,
} from "@/lib/public-api/canonical-exercises";
import {
    createPublicApiCustomExercise,
    parseCreateCustomExerciseBody,
} from "@/lib/public-api/custom-exercise";

/**
 * List Canonical exercises
 * @description Paginated globals (`user_id` null). A valid **Proxima API key** also returns that user's **Custom exercises**. Never another user's. No key required.
 * @tag Exercises
 * @params PublicApiExerciseListQuery
 * @response 200:PublicApiExerciseList
 * @responseDescription A page of exercises the caller may read.
 * @add 400:PublicApiError
 * @add 401:PublicApiError
 * @operationId listExercises
 * @openapi
 */
export async function GET(request: Request) {
    try {
        const admin = getServiceRoleClient();
        if (!admin) {
            return NextResponse.json({ error: "Service unavailable" }, { status: 500 });
        }

        const authorization = request.headers.get("authorization");
        let userId: string | null = null;
        if (authorization) {
            userId = await resolveProximaApiKeyUserId(admin, authorization);
            if (!userId) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
        }

        const parsed = parseExerciseListQuery(new URL(request.url).searchParams);
        if (!parsed.ok) {
            return NextResponse.json({ error: parsed.error }, { status: 400 });
        }

        const page = await listPublicApiExercises(admin, {
            userId,
            page: parsed.page,
            pageSize: parsed.pageSize,
        });
        if (!page) {
            return NextResponse.json({ error: "Failed to list exercises" }, { status: 500 });
        }

        return NextResponse.json(page);
    } catch (error) {
        console.error("public-api exercises GET error:", error);
        return NextResponse.json({ error: "Failed to list exercises" }, { status: 500 });
    }
}

/**
 * Create a Custom exercise
 * @description Key required. Required: title, exercise type, equipment, primary muscle. Optional: other muscles. Same enums as the in-app Hevy form. Duplicate normalized title for this user returns the existing id (200). Never inserts a global.
 * @tag Exercises
 * @body PublicApiCreateCustomExercise
 * @response 200:PublicApiCreatedExercise
 * @responseDescription Canonical exercise ID. Use as `canonical_exercise_id` on a Workout.
 * @add 401:PublicApiError
 * @add 422:PublicApiError
 * @auth proximaApiKey
 * @operationId createCustomExercise
 * @openapi
 */
export async function POST(request: Request) {
    try {
        const admin = getServiceRoleClient();
        if (!admin) {
            return NextResponse.json({ error: "Service unavailable" }, { status: 500 });
        }

        const authorization = request.headers.get("authorization");
        if (!authorization) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const [userId, rawBody] = await Promise.all([
            resolveProximaApiKeyUserId(admin, authorization),
            request.json().catch(() => undefined),
        ]);
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (rawBody === undefined) {
            return NextResponse.json({ error: "Invalid JSON" }, { status: 422 });
        }

        const parsed = parseCreateCustomExerciseBody(rawBody);
        if (!parsed.ok) {
            return NextResponse.json({ error: parsed.error }, { status: 422 });
        }

        const id = await createPublicApiCustomExercise(admin, userId, parsed.draft);
        return NextResponse.json({ id });
    } catch (error) {
        console.error("public-api exercises POST error:", error);
        return NextResponse.json({ error: "Failed to create exercise" }, { status: 500 });
    }
}
