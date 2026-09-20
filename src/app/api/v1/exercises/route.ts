/**
 * @module api/v1/exercises
 *
 * GET **Canonical exercises** for the Public API (ADR 0026 / 03). No key:
 * paginated globals. Valid **Proxima API key**: also that user's **Custom
 * movements**. Cookie session is ignored. POST is slice 4.
 *
 * Depends on: @/api/supabase-admin, @/lib/public-api/proxima-api-key,
 *   @/lib/public-api/canonical-exercises
 * Used by: Scalar Try It, third-party / agent callers
 */

import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/api/supabase-admin";
import { resolveProximaApiKeyUserId } from "@/lib/public-api/proxima-api-key";
import {
    listPublicApiExercises,
    parseExerciseListQuery,
} from "@/lib/public-api/canonical-exercises";

/**
 * List Canonical exercises
 * @description Paginated globals (`user_id` null). A valid **Proxima API key** also returns that user's **Custom movements**. Never another user's. No key required.
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
