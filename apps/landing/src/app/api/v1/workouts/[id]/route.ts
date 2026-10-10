/**
 * @module api/v1/workouts/[id]
 *
 * GET, PUT, and DELETE one history-only **Workout** by Proxima backup id
 * (ADR 0026 / 05). Key required. Missing or other user's row → 404. Cookie
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
    deletePublicApiWorkout,
    getPublicApiWorkout,
    parseReplaceWorkoutBody,
    replacePublicApiWorkout,
} from "@/lib/public-api/public-api-workout";
import {
    checkPublicApiIpRateLimit,
    checkPublicApiWriteRateLimit,
    publicApiBlockedJson,
    publicApiRateLimitHeaders,
    type TPublicApiRateLimitResult,
} from "@/lib/public-api/public-api-rate-limit";

type TRouteContext = {
    params: Promise<{ id: string }>;
};

/**
 * Get a Workout
 * @description Key required. Returns one Workout the key holder owns. Missing or another user's id is 404.
 * @tag Workouts
 * @pathParams PublicApiWorkoutId
 * @response 200:PublicApiWorkout
 * @add 401:PublicApiError
 * @add 404:PublicApiError
 * @add 429:PublicApiError
 * @add 503:PublicApiError
 * @auth proximaApiKey
 * @operationId getWorkout
 * @openapi
 */
export async function GET(request: Request, context: TRouteContext) {
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

        const [userId, { id }] = await Promise.all([
            resolveProximaApiKeyUserId(admin, authorization),
            context.params,
        ]);
        if (!userId) {
            return json({ error: "Unauthorized" }, 401, ipLimit);
        }

        const workout = await getPublicApiWorkout(admin, userId, id);
        if (!workout) {
            return json({ error: "Workout not found" }, 404, ipLimit);
        }
        return json(workout, 200, ipLimit);
    } catch (error) {
        console.error("public-api workouts GET error:", error);
        return NextResponse.json({ error: "Failed to load workout" }, { status: 500 });
    }
}

/**
 * Replace a Workout
 * @description Key required. Full-replaces title, times, description, exercises, and sets. source and external_id stay. routine_id stays null.
 * @tag Workouts
 * @pathParams PublicApiWorkoutId
 * @body PublicApiReplaceWorkout
 * @response 200:PublicApiWorkout
 * @add 401:PublicApiError
 * @add 404:PublicApiError
 * @add 422:PublicApiError
 * @add 429:PublicApiError
 * @add 503:PublicApiError
 * @auth proximaApiKey
 * @operationId replaceWorkout
 * @openapi
 */
export async function PUT(request: Request, context: TRouteContext) {
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

        const [userId, { id }, rawBody] = await Promise.all([
            resolveProximaApiKeyUserId(admin, authorization),
            context.params,
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

        const parsed = parseReplaceWorkoutBody(rawBody);
        if (!parsed.ok) {
            return json({ error: parsed.error }, 422, writeLimit);
        }

        const result = await replacePublicApiWorkout(admin, userId, id, parsed.draft);
        if (result.status === "replaced") {
            return json(result.workout, 200, writeLimit);
        }
        if (result.status === "not_found") {
            return json({ error: "Workout not found" }, 404, writeLimit);
        }
        if (result.status === "unknown_exercise") {
            return json({ error: result.error }, 422, writeLimit);
        }
        return json({ error: result.error }, 500, writeLimit);
    } catch (error) {
        console.error("public-api workouts PUT error:", error);
        return NextResponse.json({ error: "Failed to replace workout" }, { status: 500 });
    }
}

/**
 * Delete a Workout
 * @description Key required. Hard-deletes the Workout. Exercises and sets cascade.
 * @tag Workouts
 * @pathParams PublicApiWorkoutId
 * @response 204:empty
 * @add 401:PublicApiError
 * @add 404:PublicApiError
 * @add 429:PublicApiError
 * @add 503:PublicApiError
 * @auth proximaApiKey
 * @operationId deleteWorkout
 * @openapi
 */
export async function DELETE(request: Request, context: TRouteContext) {
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

        const [userId, { id }] = await Promise.all([
            resolveProximaApiKeyUserId(admin, authorization),
            context.params,
        ]);
        if (!userId) {
            return json({ error: "Unauthorized" }, 401, ipLimit);
        }

        const writeLimit = await checkPublicApiWriteRateLimit(userId);
        if (!writeLimit.allowed) {
            return blocked(writeLimit);
        }

        const result = await deletePublicApiWorkout(admin, userId, id);
        if (result.status === "deleted") {
            return new NextResponse(null, {
                status: 204,
                headers: publicApiRateLimitHeaders(writeLimit),
            });
        }
        if (result.status === "not_found") {
            return json({ error: "Workout not found" }, 404, writeLimit);
        }
        return json({ error: result.error }, 500, writeLimit);
    } catch (error) {
        console.error("public-api workouts DELETE error:", error);
        return NextResponse.json({ error: "Failed to delete workout" }, { status: 500 });
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
