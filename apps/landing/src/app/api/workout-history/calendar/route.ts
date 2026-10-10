// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module workout-history/calendar
 *
 * Profile calendar month query - lightweight workout rows for day highlights.
 *
 * Depends on: @/utils/supabase/server, api/workout-history-read
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getWorkoutsForMonthForUser } from "@/api/workout-history-read";

function parseYearParam(value: string | null): number | null {
    if (!value) {
        return null;
    }
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1970 || parsed > 9999) {
        return null;
    }
    return parsed;
}

function parseMonthParam(value: string | null): number | null {
    if (!value) {
        return null;
    }
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 12) {
        return null;
    }
    return parsed;
}

function parseTimezoneOffsetParam(value: string | null): number | null {
    if (value == null || value === "") {
        return null;
    }
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < -840 || parsed > 840) {
        return null;
    }
    return parsed;
}

/**
 * GET /api/workout-history/calendar - workouts in one local calendar month.
 *
 * Query: `year`, `month` (1-12), `tzOffset` (`Date.getTimezoneOffset()` minutes)
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const params = request.nextUrl.searchParams;
        const year = parseYearParam(params.get("year"));
        const month = parseMonthParam(params.get("month"));
        const timezoneOffsetMinutes = parseTimezoneOffsetParam(params.get("tzOffset"));

        if (year == null || month == null || timezoneOffsetMinutes == null) {
            return NextResponse.json({ error: "Invalid calendar query" }, { status: 400 });
        }

        const workouts = await getWorkoutsForMonthForUser(
            supabase,
            user.id,
            year,
            month,
            timezoneOffsetMinutes,
        );

        return NextResponse.json({ workouts } satisfies TProfileCalendarResponse);
    } catch (err) {
        console.error("workout-history calendar error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
