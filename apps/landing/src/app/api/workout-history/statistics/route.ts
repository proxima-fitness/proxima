// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module workout-history/statistics
 *
 * Weekly Duration/Reps aggregates for profile statistics.
 *
 * Depends on: @/utils/supabase/server, api/workout-history-read
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getProfileStatisticsForUser } from "@/api/workout-history-read";

function parseWeeksParam(value: string | null): 4 | 12 {
    const parsed = value ? Number.parseInt(value, 10) : 12;
    return parsed === 4 ? 4 : 12;
}

/**
 * GET /api/workout-history/statistics - weekly Duration/Reps aggregates.
 *
 * Query: `weeks` - `12` (default) or `4`
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

        const weeks = parseWeeksParam(request.nextUrl.searchParams.get("weeks"));
        const statistics = await getProfileStatisticsForUser(supabase, user.id, weeks);

        return NextResponse.json(statistics satisfies TProfileStatisticsResponse);
    } catch (err) {
        console.error("workout-history statistics error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
