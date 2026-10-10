// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module ProgramOverviewDebugReset
 *
 * Test-user + Agent debug mode control on Program overview: reset this
 * program to unstarted (no Week Export / Day complete / AI week suggest).
 *
 * Depends on: UserContext, AgentDebugModeContext, feature-limits isTestUser,
 *             useProgramHevyWeekLinks, ConfirmDialog, Button, React Query
 * Used by: ProgramOverviewSection
 */

"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { isTestUser } from "@/api/feature-limits";
import {
    PROGRAM_HEVY_LINKS_QUERY_KEY,
    WORKOUT_ROUTINE_IDS_QUERY_KEY,
    useProgramHevyWeekLinks,
} from "@/api/hooks";
import { invalidateProfileWorkoutHistoryOnBackfill } from "@/api/workout-history-browse";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { useAgentDebugMode } from "@/contexts/AgentDebugModeContext";
import { useUserContext } from "@/contexts/UserContext";
import { AI_WEEK_SUGGEST_QUERY_KEY } from "./AiWeekSuggestPanel";

export type TProgramOverviewDebugResetProps = {
    programId: number;
};

type TResetResponse = {
    ok: true;
    deletedLinks: number;
    deletedWorkouts: number;
    deletedSuggestions: number;
};

type TResetErrorBody = { error?: unknown };

async function postResetUnstarted(programId: number): Promise<TResetResponse> {
    const response = await fetch("/api/programs/reset-unstarted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId }),
    });

    if (!response.ok) {
        const body = (await response.json().catch(() => null)) as TResetErrorBody | null;
        const message =
            typeof body?.error === "string" && body.error.length > 0
                ? body.error
                : "Could not reset this program.";
        throw new Error(message);
    }

    return (await response.json()) as TResetResponse;
}

/**
 * Hidden unless the signed-in user is a test user, Agent debug mode is on,
 * and this program has at least one Program–Hevy link (Week Export started).
 *
 * @param programId - Proxima program id for this overview slide
 */
export function ProgramOverviewDebugReset({ programId }: TProgramOverviewDebugResetProps) {
    const { user } = useUserContext();
    const { debugMode } = useAgentDebugMode();
    const queryClient = useQueryClient();
    const { data: links = [], isLoading: linksLoading } = useProgramHevyWeekLinks(programId);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const reset = useMutation({
        mutationFn: () => postResetUnstarted(programId),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: [...PROGRAM_HEVY_LINKS_QUERY_KEY, programId],
                }),
                queryClient.invalidateQueries({
                    queryKey: [...WORKOUT_ROUTINE_IDS_QUERY_KEY],
                }),
                queryClient.invalidateQueries({
                    queryKey: [...AI_WEEK_SUGGEST_QUERY_KEY, programId],
                }),
            ]);
            invalidateProfileWorkoutHistoryOnBackfill(queryClient);
            toast.success("Program reset to unstarted. Hevy folders and workouts are unchanged.");
            setConfirmOpen(false);
        },
        onError: (err) => {
            const message = err instanceof Error ? err.message : "Could not reset this program.";
            toast.error(message);
        },
    });

    if (!user || !isTestUser(user) || !debugMode || linksLoading || links.length === 0) {
        return null;
    }

    return (
        <>
            <Button
                type="button"
                size="sm"
                variant="destructive"
                className="rounded-full"
                disabled={reset.isPending}
                onClick={() => setConfirmOpen(true)}
            >
                <RotateCcw className="size-3.5" aria-hidden />
                Reset
            </Button>

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={(open) => {
                    if (!open && !reset.isPending) {
                        setConfirmOpen(false);
                    }
                }}
                title="Reset this program to unstarted?"
                description="Clears Week Export links, Day complete workout backups for this program, and AI week suggest cache. The Program prescription stays. Does not delete Hevy folders or Hevy workouts."
                confirmLabel="Reset"
                confirmLoadingLabel="Resetting…"
                confirmVariant="destructive"
                isConfirmLoading={reset.isPending}
                closeOnConfirm={false}
                onConfirm={() => {
                    reset.mutate();
                }}
            />
        </>
    );
}
