/**
 * @module programs/reset-unstarted
 *
 * Test-user-only debug endpoint that resets one owned Proxima program to
 * unstarted: no Program–Hevy links, no matching Workout backups, no AI week
 * suggest cache. Prescription stays. Does not call Hevy.
 *
 * Depends on: @/utils/supabase/server, @/api/feature-limits, program-unstarted-reset
 * Used by: ProgramOverviewDebugReset
 */

import { NextResponse } from "next/server";

import { isTestUser } from "@/api/feature-limits";
import {
    ProgramUnstartedResetError,
    resetProgramToUnstarted,
} from "@/api/program-unstarted-reset";
import { createClient } from "@/utils/supabase/server";

/**
 * POST /api/programs/reset-unstarted
 *
 * Body: `{ programId: number }`
 * 200 `{ ok: true, deletedLinks, deletedWorkouts, deletedSuggestions }`,
 * 400 bad body, 401 signed out, 403 not a test user, 404 unknown/unowned program.
 */
export async function POST(request: Request) {
    try {
        const body = (await request.json().catch(() => null)) as
            | { programId?: unknown }
            | null;
        const programId = Number(body?.programId);

        if (!Number.isInteger(programId) || programId <= 0) {
            return NextResponse.json({ error: "programId required" }, { status: 400 });
        }

        const supabase = await createClient();
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!isTestUser(user)) {
            return NextResponse.json({ error: "Test users only" }, { status: 403 });
        }

        const result = await resetProgramToUnstarted(supabase, programId, user.id);
        return NextResponse.json({ ok: true, ...result });
    } catch (error) {
        if (error instanceof ProgramUnstartedResetError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        console.error("Error resetting program to unstarted:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
