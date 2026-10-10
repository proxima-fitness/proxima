// SPDX-License-Identifier: AGPL-3.0-only

/**
 * After Week Export, Hevy folder list refreshes before Program–Hevy links.
 */
import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
    HEVY_PROGRAMS_QUERY_KEY,
    PROGRAM_HEVY_LINKS_QUERY_KEY,
} from "@/api/hooks";
import {
    HEVY_CUSTOM_EXERCISES_QUERY_KEY,
    refreshOverviewQueriesAfterWeekExport,
} from "../refreshOverviewQueriesAfterWeekExport";

function folder(folderId: number): THevyProgramItem {
    return {
        program_title: `Week folder ${folderId}`,
        program: [
            {
                id: `r-${folderId}`,
                title: "1 - Push",
                folder_id: folderId,
                notes: "",
                exercises: [],
                order: "1",
            },
        ],
    };
}

function makeClient(): QueryClient {
    return new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });
}

describe("refreshOverviewQueriesAfterWeekExport", () => {
    it("refetches Hevy programs once, then invalidates links", async () => {
        const queryClient = makeClient();
        const order: string[] = [];
        let hevyFetches = 0;

        await queryClient.prefetchQuery({
            queryKey: HEVY_PROGRAMS_QUERY_KEY,
            queryFn: async () => {
                hevyFetches += 1;
                order.push("hevy-programs");
                return hevyFetches === 1 ? [] : [folder(555)];
            },
        });
        await queryClient.prefetchQuery({
            queryKey: [...PROGRAM_HEVY_LINKS_QUERY_KEY, 11],
            queryFn: async () => {
                order.push("program-hevy-links");
                return [];
            },
        });

        expect(queryClient.getQueryData(HEVY_PROGRAMS_QUERY_KEY)).toEqual([]);

        await refreshOverviewQueriesAfterWeekExport(queryClient, { programId: 11 });

        expect(hevyFetches).toBe(2);
        expect(queryClient.getQueryData(HEVY_PROGRAMS_QUERY_KEY)).toEqual([folder(555)]);
        expect(order.filter((key) => key === "program-hevy-links").length).toBe(2);
        const lastHevy = order.lastIndexOf("hevy-programs");
        const lastLinks = order.lastIndexOf("program-hevy-links");
        expect(lastHevy).toBeGreaterThan(-1);
        expect(lastLinks).toBeGreaterThan(lastHevy);
    });

    it("invalidates custom exercises only when Export created templates", async () => {
        const queryClient = makeClient();
        let customFetches = 0;

        await queryClient.prefetchQuery({
            queryKey: HEVY_PROGRAMS_QUERY_KEY,
            queryFn: async () => [folder(9)],
        });
        await queryClient.prefetchQuery({
            queryKey: [...PROGRAM_HEVY_LINKS_QUERY_KEY, 4],
            queryFn: async () => [],
        });
        await queryClient.prefetchQuery({
            queryKey: HEVY_CUSTOM_EXERCISES_QUERY_KEY,
            queryFn: async () => {
                customFetches += 1;
                return [];
            },
        });

        await refreshOverviewQueriesAfterWeekExport(queryClient, {
            programId: 4,
            createdNewHevyCustomTemplates: 0,
        });
        expect(customFetches).toBe(1);

        await refreshOverviewQueriesAfterWeekExport(queryClient, {
            programId: 4,
            createdNewHevyCustomTemplates: 2,
        });
        expect(customFetches).toBe(2);
    });
});
