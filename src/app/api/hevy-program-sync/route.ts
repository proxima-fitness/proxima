/**
 * @module hevy-program-sync
 *
 * On-demand Hevy program sync for the authenticated user (ADR 0011).
 * Gates on Hevy workout count vs last_hevy_program_sync_count, then invokes
 * the hevy-program-sync edge function. No midnight cron.
 *
 * Also reconciles the workout backup mirror from Hevy's events feed on the way
 * through. After that backup, PUT a Hevy-app title checkmark for each linked
 * `routine_id` that has a Workout. Clients re-read `workouts.routine_id` for
 * the builder lock — they do not wait on the count-gated edge write.
 *
 * Depends on: @/utils/supabase/server, fetchHevyWorkoutCount,
 *             syncHevyWorkoutEvents, markUserLinkedHevyRoutineTitlesComplete,
 *             SUPABASE_SECRET_KEY
 */

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { fetchHevyWorkoutCount, syncHevyWorkoutEvents } from "@/api/workout-history-sync";
import { shouldInvokeHevyProgramSync } from "@/api/hevy-program-sync";
import { markUserLinkedHevyRoutineTitlesComplete } from "@/api/hevy-day-complete-title";

/**
 * POST /api/hevy-program-sync — sync day-complete for the current user when needed.
 */
export async function POST() {
    try {
        const supabase = await createClient();
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: apiKey, error: keyError } = await supabase.rpc("read_secret", {
            secret_name: `hevy_api_key_${user.id}`,
        });

        if (keyError || !apiKey || typeof apiKey !== "string") {
            return NextResponse.json({ error: "Hevy API key not found" }, { status: 400 });
        }

        const { data: cursor, error: cursorError } = await supabase
            .from("hevy_workouts_count")
            .select("last_hevy_program_sync_count")
            .eq("user_id", user.id)
            .maybeSingle();

        if (cursorError) {
            console.error("hevy-program-sync cursor read error:", cursorError);
            return NextResponse.json({ error: "Failed to read sync cursor" }, { status: 500 });
        }

        const lastSyncCount = cursor?.last_hevy_program_sync_count ?? 0;
        const workoutsCount = await fetchHevyWorkoutCount(apiKey);

        // Mirror upkeep, not day-completion: runs even when the count gate below
        // says "nothing new", because that gate is exactly what a deletion or an
        // edit slips past. Never fails the sync — worst case the mirror waits.
        try {
            const events = await syncHevyWorkoutEvents(supabase, {
                userId: user.id,
                apiKey,
            });
            if (events.imported > 0 || events.deleted > 0) {
                console.info("hevy workout mirror reconciled:", events);
            }
        } catch (eventsError) {
            console.warn("hevy workout events sync failed:", eventsError);
        }

        // Hevy-app ✓ only. Detector is backup ∩ link; do not restore auto-upload
        // or silent weight writes. Never fail the request if a title PUT fails.
        try {
            const titles = await markUserLinkedHevyRoutineTitlesComplete(supabase, {
                userId: user.id,
                apiKey,
            });
            if (titles.updated > 0 || titles.failed > 0) {
                console.info("hevy day-complete titles:", titles);
            }
        } catch (titleError) {
            console.warn("hevy day-complete title checkmark failed:", titleError);
        }

        if (!shouldInvokeHevyProgramSync(workoutsCount, lastSyncCount)) {
            return NextResponse.json({
                status: "skipped",
                workoutsCount,
                lastSyncCount,
            });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SECRET_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            console.error("Missing SUPABASE_SECRET_KEY or NEXT_PUBLIC_REACT_APP_SUPABASE_URL");
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }

        const edgeResponse = await fetch(`${supabaseUrl}/functions/v1/hevy-program-sync`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({ user_id: user.id, mode: "on_demand" }),
        });

        // 204 = edge early-exit (no new work) — treat as skipped for clients
        if (edgeResponse.status === 204) {
            return NextResponse.json({
                status: "skipped",
                workoutsCount,
                lastSyncCount,
                edgeStatus: 204,
            });
        }

        if (!edgeResponse.ok) {
            const edgeText = await edgeResponse.text().catch(() => "");
            console.error("hevy-program-sync edge error:", edgeResponse.status, edgeText);
            return NextResponse.json(
                {
                    status: "error",
                    error: `Edge hevy-program-sync failed (${edgeResponse.status})`,
                },
                { status: 502 },
            );
        }

        return NextResponse.json({
            status: "synced",
            workoutsCount,
            lastSyncCount,
            edgeStatus: edgeResponse.status,
        });
    } catch (err) {
        console.error("hevy-program-sync route error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
