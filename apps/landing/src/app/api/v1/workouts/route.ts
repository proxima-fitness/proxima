/**
 * @module api/v1/workouts
 *
 * POST a history-only **Workout** for the Public API (ADR 0026 / 05). Key
 * required. First-write-wins on `(user_id, source, external_id)`. Cookie
 * session is ignored.
 *
 * Depends on: @/api/supabase-admin, @/lib/public-api/proxima-api-key,
 *   @/lib/public-api/public-api-workout, @/lib/public-api/public-api-rate-limit
 * Used by: Scalar Try It, third-party / agent callers
 */

import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/api/supabase-admin";
import { resolveProximaApiKeyUserId } from "@/lib/public-api/proxima-api-key";
import {
    createPublicApiWorkout,
    parseCreateWorkoutBody,
} from "@/lib/public-api/public-api-workout";
import {
    checkPublicApiIpRateLimit,
    checkPublicApiWriteRateLimit,
    publicApiBlockedJson,
    publicApiRateLimitHeaders,
    type TPublicApiRateLimitResult,
} from "@/lib/public-api/public-api-rate-limit";

/**
 * Create a Workout
 * @description Key required. First-write-wins on source + external_id. Same identity + same body → 200 existing id. Same identity + different body → 409. Rejects hevy, unknown source, routine_id, empty exercises/sets, and unread canonical_exercise_id. Persists routine_id null so the row cannot participate in Day complete.
 * @tag Workouts
 * @body PublicApiCreateWorkout
 * @response 200:PublicApiCreatedWorkout
 * @responseDescription Proxima Workout backup id.
 * @add 401:PublicApiError
 * @add 409:PublicApiError
 * @add 422:PublicApiError
 * @add 429:PublicApiError
 * @add 503:PublicApiError
 * @auth proximaApiKey
 * @operationId createWorkout
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

        const parsed = parseCreateWorkoutBody(rawBody);
        if (!parsed.ok) {
            return json({ error: parsed.error }, 422, writeLimit);
        }

        const result = await createPublicApiWorkout(admin, userId, parsed.draft);
        if (result.status === "created" || result.status === "existing") {
            return json({ id: result.id }, 200, writeLimit);
        }
        if (result.status === "conflict") {
            return json({ error: "Workout already exists" }, 409, writeLimit);
        }
        if (result.status === "unknown_exercise") {
            return json({ error: result.error }, 422, writeLimit);
        }
        return json({ error: result.error }, 500, writeLimit);
    } catch (error) {
        console.error("public-api workouts POST error:", error);
        return NextResponse.json({ error: "Failed to create workout" }, { status: 500 });
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
