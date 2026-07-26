/**
 * @module programs/week-suggest
 *
 * **AI week suggest** generate endpoint (ADR 0012 / 01). Lazy: the overview
 * panel calls it on open, never mark-complete or Export. Reads the latest
 * **Week complete** link, the prescription for weeks N and N+1, and week N's
 * logged sessions, then asks the model for a week N+1 change batch.
 *
 * No monthly LLM meter — company-borne cost (automatic panel open, not a
 * user-initiated chat turn). Results cache in `program_week_suggestions`
 * (one row per program + completed week); re-open / remount returns cache
 * without another model call. A week with no logged sessions is *not* cached:
 * the backup mirror may still be syncing, and a "no data logged" summary would
 * outlive the gap. Prescription writes live in ./apply (Sub-plan 3).
 *
 * Depends on: @/utils/supabase/server, program-hevy-links, program-prescription,
 *             program-week-suggestions, workout-history-read, ./input, ./generate
 * Used by: AiWeekSuggestPanel (Sub-plan 2)
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { getProgramHevyWeekLinks } from "@/api/program-hevy-links";
import {
    getPrescriptionWeekRoutines,
    getProgramPrescriptionMeta,
} from "@/api/program-prescription";
import {
    deleteProgramWeekSuggestion,
    getProgramWeekSuggestion,
    saveProgramWeekSuggestion,
} from "@/api/program-week-suggestions";
import {
    getAllWorkoutsSinceForUser,
    mapBackedUpWorkoutToHevyRoutine,
} from "@/api/workout-history-read";
import type { Json } from "@/hooks/supabase";
import { createClient } from "@/utils/supabase/server";
import { generateWeekSuggestion } from "./generate";
import {
    filterWorkoutsInWindow,
    normalizeWeekSuggestChanges,
    resolveWeekSuggestTarget,
    weekLogWindow,
    weekSuggestChangeSchema,
    type TWeekSuggestChange,
    type TWeekSuggestNotReadyCode,
    type TWeekSuggestResponse,
} from "./input";

/** One model round-trip plus a few reads — well under the chat route's budget. */
export const maxDuration = 60;

const cachedChangesSchema = z.array(weekSuggestChangeSchema);

function parseCachedChanges(raw: unknown): TWeekSuggestChange[] | null {
    const parsed = cachedChangesSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
}

function notReady(
    programId: number,
    code: TWeekSuggestNotReadyCode,
    message: string,
    weeks?: { basedOnWeek?: number; targetWeek?: number },
): NextResponse {
    const body: TWeekSuggestResponse = {
        status: "not_ready",
        programId,
        code,
        message,
        ...weeks,
    };
    return NextResponse.json(body);
}

function okResponse(cached: {
    programId: number;
    basedOnWeek: number;
    targetWeek: number;
    summary: string;
    changes: TWeekSuggestChange[];
    generatedAt: string;
}): NextResponse {
    const body: TWeekSuggestResponse = {
        status: "ok",
        programId: cached.programId,
        basedOnWeek: cached.basedOnWeek,
        targetWeek: cached.targetWeek,
        summary: cached.summary,
        changes: cached.changes,
        generatedAt: cached.generatedAt,
    };
    return NextResponse.json(body);
}

/**
 * POST /api/programs/week-suggest — suggest changes for week N+1.
 *
 * Body: `{ programId: number, isInLbs?: boolean }`.
 * 200 `{ status: "ok" | "not_ready", … }`, 400 bad body, 401 signed out,
 * 404 unknown program, 502 unusable model output.
 */
export async function POST(request: Request) {
    try {
        const body = (await request.json().catch(() => null)) as
            | { programId?: unknown; isInLbs?: unknown }
            | null;
        const programId = Number(body?.programId);

        if (!Number.isInteger(programId) || programId <= 0) {
            return NextResponse.json({ error: "programId required" }, { status: 400 });
        }

        const isInLbs = body?.isInLbs !== false;

        const supabase = await createClient();
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // RLS scopes links to the caller — no link, no suggestion for this program.
        const links = await getProgramHevyWeekLinks(programId, supabase);
        const meta = await getProgramPrescriptionMeta(supabase, programId);

        if (!meta) {
            return NextResponse.json({ error: "Program not found" }, { status: 404 });
        }

        const target = resolveWeekSuggestTarget(links, meta.programLength);

        if (!target.ready) {
            return notReady(programId, target.code, target.message, {
                basedOnWeek: target.basedOnWeek,
            });
        }

        const { basedOnWeek, targetWeek } = target;
        const completedLink = links.find((link) => link.nth_week === basedOnWeek);

        if (!completedLink) {
            return notReady(
                programId,
                "no_completed_week",
                "Mark the current week complete to get next-week suggestions.",
            );
        }

        const cached = await getProgramWeekSuggestion(supabase, programId, basedOnWeek);
        if (cached) {
            const changes = parseCachedChanges(cached.changes);
            if (changes) {
                return okResponse({ ...cached, changes });
            }
            // Corrupt cache → drop row so the new insert is first-write again.
            await deleteProgramWeekSuggestion(supabase, programId, basedOnWeek);
        }

        const [completedWeekPrescription, targetWeekPrescription] = await Promise.all([
            getPrescriptionWeekRoutines(supabase, programId, basedOnWeek),
            getPrescriptionWeekRoutines(supabase, programId, targetWeek),
        ]);

        if (targetWeekPrescription.length === 0) {
            return notReady(
                programId,
                "no_target_prescription",
                `This program has no week ${targetWeek} to change.`,
                { basedOnWeek, targetWeek },
            );
        }

        const logWindow = weekLogWindow(completedLink);
        const backedUpWorkouts = await getAllWorkoutsSinceForUser(
            supabase,
            user.id,
            logWindow.fetchSince,
        );
        const loggedWorkouts = filterWorkoutsInWindow(
            backedUpWorkouts.map((workout) => mapBackedUpWorkoutToHevyRoutine(workout)),
            logWindow,
        );

        // Without logs the model can only restate the week — and caching that
        // would freeze it even after the Hevy backup catches up. Say so instead.
        if (loggedWorkouts.length === 0) {
            return notReady(
                programId,
                "no_logged_sessions",
                `No logged sessions backed up for week ${basedOnWeek} yet. If you just finished training, give the Hevy sync a moment and reopen this.`,
                { basedOnWeek, targetWeek },
            );
        }

        let generated;
        try {
            generated = await generateWeekSuggestion({
                programTitle: meta.title,
                basedOnWeek,
                targetWeek,
                completedWeekPrescription,
                targetWeekPrescription,
                loggedWorkouts,
                isInLbs,
            });
        } catch (modelError) {
            console.error("week-suggest generation failed:", modelError);
            return NextResponse.json(
                { error: "Could not generate a suggestion right now." },
                { status: 502 },
            );
        }

        const { changes, dropped } = normalizeWeekSuggestChanges(
            generated.changes,
            targetWeek,
            targetWeekPrescription,
        );

        if (dropped > 0) {
            console.warn(
                `week-suggest dropped ${dropped} change(s) that did not resolve against week ${targetWeek}`,
            );
        }

        const generatedAt = new Date().toISOString();
        const saved = await saveProgramWeekSuggestion(supabase, {
            userId: user.id,
            programId,
            basedOnWeek,
            targetWeek,
            summary: generated.summary,
            changes: JSON.parse(JSON.stringify(changes)) as Json,
            generatedAt,
        });

        const savedChanges = parseCachedChanges(saved.changes) ?? changes;
        return okResponse({ ...saved, changes: savedChanges });
    } catch (error) {
        console.error("week-suggest route error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
