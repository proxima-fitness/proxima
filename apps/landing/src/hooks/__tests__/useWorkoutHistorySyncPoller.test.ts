/**
 * @module useWorkoutHistorySyncPoller.test
 */
import { describe, it, expect } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
    isWorkoutHistorySyncBusy,
    WORKOUT_HISTORY_SYNC_PROGRESS_QUERY_KEY,
    WORKOUT_HISTORY_SYNC_RETRY_MUTATION_KEY,
} from "../useWorkoutHistorySyncPoller";

function createQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
}

describe("isWorkoutHistorySyncBusy", () => {
    it("is false when no sync fetch or retry is in flight", () => {
        const queryClient = createQueryClient();

        expect(isWorkoutHistorySyncBusy(queryClient)).toBe(false);
    });

    it("is true while the progress query is fetching", async () => {
        const queryClient = createQueryClient();
        let resolveProgress!: (value: TWorkoutSyncProgress) => void;
        const pending = queryClient.fetchQuery({
            queryKey: WORKOUT_HISTORY_SYNC_PROGRESS_QUERY_KEY,
            queryFn: () =>
                new Promise<TWorkoutSyncProgress>((resolve) => {
                    resolveProgress = resolve;
                }),
        });

        expect(isWorkoutHistorySyncBusy(queryClient)).toBe(true);

        resolveProgress({
            backedUpCount: 1,
            hevyCount: 1,
            syncError: null,
        });
        await pending;

        expect(isWorkoutHistorySyncBusy(queryClient)).toBe(false);
    });

    it("is true while a retry mutation is pending", async () => {
        const queryClient = createQueryClient();
        let resolveRetry!: () => void;
        const hang = new Promise<void>((resolve) => {
            resolveRetry = resolve;
        });
        const pending = queryClient
            .getMutationCache()
            .build(queryClient, {
                mutationKey: [...WORKOUT_HISTORY_SYNC_RETRY_MUTATION_KEY],
                mutationFn: () => hang,
            })
            .execute(undefined);

        expect(isWorkoutHistorySyncBusy(queryClient)).toBe(true);

        resolveRetry();
        await pending;

        expect(isWorkoutHistorySyncBusy(queryClient)).toBe(false);
    });
});
