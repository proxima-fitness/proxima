/**
 * @module lib/public-api/canonical-exercises
 *
 * Paginated **Canonical exercise** catalog for the Public API (ADR 0026 / 03).
 * Globals (`user_id` null) are world-readable. A resolved **Proxima API key**
 * also includes that athlete's **Custom exercises**. Another user's rows never
 * appear. Response objects omit `user_id`.
 *
 * Depends on: @supabase/supabase-js, zod, @/hooks/supabase
 * Used by: GET /api/v1/exercises, next-openapi-gen
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import type { Database } from "@/hooks/supabase";
import {
    DEFAULT_EXERCISE_PAGE,
    DEFAULT_EXERCISE_PAGE_SIZE,
    MAX_EXERCISE_PAGE_SIZE,
    PublicApiExercise,
    PublicApiExerciseList,
} from "./openapi-schemas/exercises";

export {
    DEFAULT_EXERCISE_PAGE,
    DEFAULT_EXERCISE_PAGE_SIZE,
    MAX_EXERCISE_PAGE_SIZE,
};

export type TPublicApiExerciseDb = SupabaseClient<Database>;
export type TPublicApiExercise = z.infer<typeof PublicApiExercise>;
export type TPublicApiExerciseList = z.infer<typeof PublicApiExerciseList>;

export type TExerciseListQuery =
    | { ok: true; page: number; pageSize: number }
    | { ok: false; error: string };

const CATALOG_COLUMNS =
    "id, title, exercise_type, equipment, primary_muscle_group, secondary_muscle_groups, user_id" as const;

type TCatalogRow = {
    id: string;
    title: string;
    exercise_type: string | null;
    equipment: string | null;
    primary_muscle_group: string | null;
    secondary_muscle_groups: string[] | null;
    user_id: string | null;
};

/**
 * Reads `page` (1-based) and `page_size` from the catalog query string.
 *
 * @param searchParams - URL search params from GET /api/v1/exercises
 */
export function parseExerciseListQuery(
    searchParams: URLSearchParams,
): TExerciseListQuery {
    const page = parsePositiveInt(
        searchParams.get("page"),
        DEFAULT_EXERCISE_PAGE,
    );
    if (page === null) {
        return { ok: false, error: "page must be a positive integer" };
    }

    const pageSize = parseBoundedInt(
        searchParams.get("page_size"),
        DEFAULT_EXERCISE_PAGE_SIZE,
        MAX_EXERCISE_PAGE_SIZE,
    );
    if (pageSize === null) {
        return {
            ok: false,
            error: `page_size must be an integer from 1 to ${MAX_EXERCISE_PAGE_SIZE}`,
        };
    }

    return { ok: true, page, pageSize };
}

/**
 * Lists globals, plus the key holder's **Custom exercises** when `userId` is set.
 *
 * @param db - Service-role client (RLS bypass; visibility is applied here)
 * @param options.userId - Resolved key owner, or null for an unauthenticated GET
 * @param options.page - 1-based page
 * @param options.pageSize - Page length (caller already clamped)
 */
export async function listPublicApiExercises(
    db: TPublicApiExerciseDb,
    options: { userId: string | null; page: number; pageSize: number },
): Promise<TPublicApiExerciseList | null> {
    const from = (options.page - 1) * options.pageSize;
    const to = from + options.pageSize;

    let query = db
        .from("canonical_exercises")
        .select(CATALOG_COLUMNS)
        .order("title", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to);

    if (options.userId) {
        query = query.or(`user_id.is.null,user_id.eq.${options.userId}`);
    } else {
        query = query.is("user_id", null);
    }

    const { data, error } = await query;
    if (error || !data) {
        return null;
    }

    const rows = data as TCatalogRow[];
    const hasMore = rows.length > options.pageSize;
    const pageRows = hasMore ? rows.slice(0, options.pageSize) : rows;

    return {
        exercises: pageRows.map(toPublicApiExercise),
        page: options.page,
        page_size: options.pageSize,
        has_more: hasMore,
    };
}

function toPublicApiExercise(row: TCatalogRow): TPublicApiExercise {
    return {
        id: row.id,
        title: row.title,
        exercise_type: row.exercise_type,
        equipment: row.equipment,
        primary_muscle_group: row.primary_muscle_group,
        secondary_muscle_groups: row.secondary_muscle_groups,
    };
}

function parsePositiveInt(raw: string | null, fallback: number): number | null {
    if (raw == null || raw === "") {
        return fallback;
    }
    if (!/^[1-9]\d*$/.test(raw)) {
        return null;
    }
    return Number.parseInt(raw, 10);
}

function parseBoundedInt(
    raw: string | null,
    fallback: number,
    max: number,
): number | null {
    const value = parsePositiveInt(raw, fallback);
    if (value === null || value > max) {
        return null;
    }
    return value;
}
