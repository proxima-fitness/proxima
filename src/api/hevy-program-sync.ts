/**
 * @module api/hevy-program-sync
 *
 * Client trigger + pure gate helpers for on-demand Hevy program sync (ADR 0011).
 * Server route performs auth, Hevy count gate, and edge invoke.
 *
 * Depends on: browser fetch → POST /api/hevy-program-sync
 * Used by: useHevyProgramSyncOnDemand
 */

export type THevyProgramSyncResult =
    | {
          status: "skipped";
          workoutsCount: number;
          lastSyncCount: number;
      }
    | {
          status: "synced";
          workoutsCount: number;
          lastSyncCount: number;
          edgeStatus: number;
      }
    | {
          status: "error";
          error: string;
      };

/**
 * True when Hevy has more workouts than the last successful program-sync cursor.
 *
 * @param hevyWorkoutCount - Live Hevy /v1/workouts/count
 * @param lastProgramSyncCount - hevy_workouts_count.last_hevy_program_sync_count
 */
export function shouldInvokeHevyProgramSync(
    hevyWorkoutCount: number,
    lastProgramSyncCount: number,
): boolean {
    return hevyWorkoutCount > lastProgramSyncCount;
}

let inflight: Promise<THevyProgramSyncResult> | null = null;

/**
 * Single-flight POST /api/hevy-program-sync for the current session user.
 * Concurrent callers share one in-flight promise.
 */
export function triggerHevyProgramSyncOnDemand(): Promise<THevyProgramSyncResult> {
    if (inflight) {
        return inflight;
    }

    inflight = (async (): Promise<THevyProgramSyncResult> => {
        try {
            const response = await fetch("/api/hevy-program-sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });

            const body = (await response.json().catch(() => ({}))) as {
                status?: string;
                workoutsCount?: number;
                lastSyncCount?: number;
                edgeStatus?: number;
                error?: string;
            };

            if (!response.ok) {
                return {
                    status: "error",
                    error: body.error ?? `Hevy program sync failed (${response.status})`,
                };
            }

            if (body.status === "skipped") {
                return {
                    status: "skipped",
                    workoutsCount: body.workoutsCount ?? 0,
                    lastSyncCount: body.lastSyncCount ?? 0,
                };
            }

            if (body.status === "synced") {
                return {
                    status: "synced",
                    workoutsCount: body.workoutsCount ?? 0,
                    lastSyncCount: body.lastSyncCount ?? 0,
                    edgeStatus: body.edgeStatus ?? response.status,
                };
            }

            return {
                status: "error",
                error: body.error ?? "Unexpected hevy-program-sync response",
            };
        } catch (error: unknown) {
            return {
                status: "error",
                error: error instanceof Error ? error.message : String(error),
            };
        } finally {
            inflight = null;
        }
    })();

    return inflight;
}

/** Test-only: clear single-flight latch. */
export function __resetHevyProgramSyncInflightForTests(): void {
    inflight = null;
}
