/**
 * @module programs/week-suggest/apply
 *
 * **AI week suggest** apply endpoint (ADR 0012 / 03). Writes the cached
 * suggestion for the latest **Week complete** into the **Program prescription**
 * for week N+1 only. Skip is the absence of this call — nothing to undo.
 *
 * The client sends the program (and the week it is looking at); the changes
 * come from `program_week_suggestions`, never from the request body, so the
 * write is exactly what the panel showed. The target week is re-resolved from
 * Program–Hevy links per call: once week N+1 is exported it belongs to Edit
 * current week (ADR 0009), and apply refuses it.
 *
 * A tease row (`llm_consumed=false`) with remaining LLM = 0 is 402
 * `usage_cap` / `monthly_llm_requests` and does not write (ADR 0015). After
 * unlock, apply reads the cached full changes.
 *
 * No Week Export here — pushing week N+1 to Hevy stays explicit.
 *
 * Depends on: @/utils/supabase/server, program-hevy-links, program-prescription,
 *             program-prescription-write, program-week-suggestions, ../input,
 *             @/lib/server-feature-limits
 * Used by: AiWeekSuggestApply (Program overview)
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { getProgramHevyWeekLinks } from "@/api/program-hevy-links";
import { getProgramPrescriptionMeta } from "@/api/program-prescription";
import {
    applyWeekSetUpdates,
    type TPrescriptionWriteOperation,
} from "@/api/program-prescription-write";
import { getProgramWeekSuggestion } from "@/api/program-week-suggestions";
import {
    getServerMyFeatureLimits,
    usageCapResponse,
} from "@/lib/server-feature-limits";
import { createClient } from "@/utils/supabase/server";
import {
    resolveWeekSuggestTarget,
    snapWeekSuggestWeights,
    weekSuggestChangeSchema,
    type TWeekSuggestApplyResponse,
    type TWeekSuggestNotReadyCode,
} from "../input";

const cachedChangesSchema = z.array(weekSuggestChangeSchema);

function notReady(
    programId: number,
    code: TWeekSuggestNotReadyCode,
    message: string,
    weeks?: { basedOnWeek?: number; targetWeek?: number },
): NextResponse {
    const body: TWeekSuggestApplyResponse = {
        status: "not_ready",
        programId,
        code,
        message,
        ...weeks,
    };
    return NextResponse.json(body);
}

/**
 * POST /api/programs/week-suggest/apply — write week N+1's suggested changes.
 *
 * Body: `{ programId: number, targetWeek?: number, isInLbs?: boolean }`
 * (`targetWeek` is the week the open panel showed; a mismatch means the panel
 * is stale. `isInLbs` snaps weights to clean plate steps before write.)
 * 200 `{ status: "applied" | "not_ready", … }`, 400 bad body, 401 signed out,
 * 404 unknown program, 409 stale panel or nothing generated yet, 402 tease
 * row while remaining LLM is 0.
 */
export async function POST(request: Request) {
    try {
        const body = (await request.json().catch(() => null)) as
            | { programId?: unknown; targetWeek?: unknown; isInLbs?: unknown }
            | null;
        const programId = Number(body?.programId);

        if (!Number.isInteger(programId) || programId <= 0) {
            return NextResponse.json({ error: "programId required" }, { status: 400 });
        }

        const expectedWeek =
            body?.targetWeek == null ? null : Number(body.targetWeek);

        if (expectedWeek != null && !Number.isInteger(expectedWeek)) {
            return NextResponse.json({ error: "targetWeek invalid" }, { status: 400 });
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

        // A panel left open across a Week complete / Week Export would otherwise
        // write last week's suggestion into the wrong week.
        if (expectedWeek != null && expectedWeek !== targetWeek) {
            return NextResponse.json(
                {
                    error: "stale_suggestion",
                    message: `This suggestion was for week ${expectedWeek}; week ${targetWeek} is next now.`,
                    targetWeek,
                },
                { status: 409 },
            );
        }

        const cached = await getProgramWeekSuggestion(supabase, programId, basedOnWeek);

        if (!cached) {
            return NextResponse.json(
                {
                    error: "no_suggestion",
                    message: "Open the suggestion again before applying it.",
                },
                { status: 409 },
            );
        }

        if (cached.llmConsumed === false) {
            const limits = await getServerMyFeatureLimits(supabase, user);
            if (limits?.remaining_llm_requests === 0) {
                return usageCapResponse({
                    feature: "monthly_llm_requests",
                    resets_on: limits.resets_on,
                });
            }
        }

        const parsed = cachedChangesSchema.safeParse(cached.changes);

        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: "unreadable_suggestion",
                    message: "Couldn't read the stored suggestion. Generate it again.",
                },
                { status: 409 },
            );
        }

        const operations: TPrescriptionWriteOperation[] = snapWeekSuggestWeights(
            parsed.data,
            isInLbs,
        ).map((change) => change.operation);

        const result = await applyWeekSetUpdates(supabase, {
            programId,
            targetWeek,
            operations,
        });

        if (result.skipped > 0) {
            console.warn(
                `week-suggest apply skipped ${result.skipped} change(s) for program ${programId} week ${targetWeek}`,
            );
        }

        const response: TWeekSuggestApplyResponse = {
            status: "applied",
            programId,
            targetWeek,
            applied: result.applied,
            skipped: result.skipped,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error("week-suggest apply route error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
