/**
 * @module api/v1/exercises
 *
 * GET **Canonical exercises** for the Public API (ADR 0026 / 03–04). No key:
 * paginated globals. Valid **Proxima API key**: also that user's **Custom
 * exercises**. POST creates a **Custom exercise** for the key holder. Cookie
 * session is ignored.
 *
 * Depends on: @/api/supabase-admin, @/lib/public-api/proxima-api-key,
 *   @/lib/public-api/canonical-exercises, @/lib/public-api/custom-exercise,
 *   @/lib/public-api/public-api-rate-limit
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
import {
    checkPublicApiIpRateLimit,
    checkPublicApiWriteRateLimit,
    publicApiBlockedJson,
    publicApiRateLimitHeaders,
    type TPublicApiRateLimitResult,
} from "@/lib/public-api/public-api-rate-limit";

/**
 * List Canonical exercises
 * @description Paginated globals (`user_id` null). A valid **Proxima API key** also returns that user's **Custom exercises**. Never another user's. No key required.
 * @tag Exercises
 * @params PublicApiExerciseListQuery
 * @response 200:PublicApiExerciseList
 * @responseDescription A page of exercises the caller may read.
 * @add 400:PublicApiError
 * @add 401:PublicApiError
 * @add 429:PublicApiError
 * @add 503:PublicApiError
 * @operationId listExercises
 * @openapi
 */
export async function GET(request: Request) {
    try {
        const ipLimit = await checkPublicApiIpRateLimit(request);
        if (!ipLimit.allowed) {
            return blocked(ipLimit);
        }

        const admin = getServiceRoleClient();
        if (!admin) {
            return json({ error: "Service unavailable" }, 500, ipLimit);
        }

        const authorization = request.headers.get("authorization");
        let userId: string | null = null;
        if (authorization) {
            userId = await resolveProximaApiKeyUserId(admin, authorization);
            if (!userId) {
                return json({ error: "Unauthorized" }, 401, ipLimit);
            }
        }

        const parsed = parseExerciseListQuery(new URL(request.url).searchParams);
        if (!parsed.ok) {
            return json({ error: parsed.error }, 400, ipLimit);
        }

        const page = await listPublicApiExercises(admin, {
            userId,
            page: parsed.page,
            pageSize: parsed.pageSize,
        });
        if (!page) {
            return json({ error: "Failed to list exercises" }, 500, ipLimit);
        }

        return json(page, 200, ipLimit);
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
 * @add 429:PublicApiError
 * @add 503:PublicApiError
 * @auth proximaApiKey
 * @operationId createCustomExercise
 * @openapi
 */
export async function POST(request: Request) {
    try {
        const ipLimit = await checkPublicApiIpRateLimit(request);
        if (!ipLimit.allowed) {
            return blocked(ipLimit);
        }

        const admin = getServiceRoleClient();
        if (!admin) {
            return json({ error: "Service unavailable" }, 500, ipLimit);
        }

        const authorization = request.headers.get("authorization");
        if (!authorization) {
            return json({ error: "Unauthorized" }, 401, ipLimit);
        }

        const [userId, rawBody] = await Promise.all([
            resolveProximaApiKeyUserId(admin, authorization),
            request.json().catch(() => undefined),
        ]);
        if (!userId) {
            return json({ error: "Unauthorized" }, 401, ipLimit);
        }

        const writeLimit = await checkPublicApiWriteRateLimit(userId);
        if (!writeLimit.allowed) {
            return blocked(writeLimit);
        }

        if (rawBody === undefined) {
            return json({ error: "Invalid JSON" }, 422, writeLimit);
        }

        const parsed = parseCreateCustomExerciseBody(rawBody);
        if (!parsed.ok) {
            return json({ error: parsed.error }, 422, writeLimit);
        }

        const id = await createPublicApiCustomExercise(admin, userId, parsed.draft);
        return json({ id }, 200, writeLimit);
    } catch (error) {
        console.error("public-api exercises POST error:", error);
        return NextResponse.json({ error: "Failed to create exercise" }, { status: 500 });
    }
}

function json(body: unknown, status: number, rateLimit: TPublicApiRateLimitResult) {
    return NextResponse.json(body, {
        status,
        headers: publicApiRateLimitHeaders(rateLimit),
    });
}

function blocked(result: Extract<TPublicApiRateLimitResult, { allowed: false }>) {
    const response = publicApiBlockedJson(result);
    return NextResponse.json(response.body, {
        status: response.status,
        headers: response.headers,
    });
}
