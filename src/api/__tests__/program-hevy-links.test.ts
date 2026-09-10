import { beforeEach, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/hooks/supabase";
import {
    getCurrentLinkedWeek,
    getProgramHevyWeekLink,
    getProgramHevyWeekLinks,
    markProgramWeekComplete,
    markProgramWeeksComplete,
    updateProgramHevyWeekRoutineIds,
    upsertProgramHevyWeekLink,
    type TUpsertProgramHevyWeekLinkInput,
} from "../program-hevy-links";

const USER_ID = "user-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const PROGRAM_ID = 42;
const OTHER_PROGRAM_ID = 99;

type TRow = {
    id: string;
    user_id: string;
    program_id: number;
    nth_week: number;
    hevy_folder_id: number;
    hevy_routine_ids: string[];
    completed_at: string | null;
    created_at: string;
    updated_at: string;
};

type TFilter = { column: string; value: unknown };

function matchFilters(row: TRow, filters: TFilter[]): boolean {
    return filters.every((filter) => row[filter.column as keyof TRow] === filter.value);
}

function createMockDb(seed?: TRow[]) {
    const rows: TRow[] = [...(seed ?? [])];
    let idSeq = rows.length;

    const db = {
        rows,
        from(table: string) {
            if (table !== "program_hevy_week_links") {
                throw new Error(`Unexpected table: ${table}`);
            }

            const filters: TFilter[] = [];
            const nullFilters: string[] = [];
            const inFilters: Array<{ column: string; values: unknown[] }> = [];
            const orderCols: Array<{ column: keyof TRow; ascending: boolean }> = [];
            let limitN: number | null = null;
            let pendingUpsert: Partial<TRow> | null = null;
            let pendingUpdate: Partial<TRow> | null = null;
            let selectCols: string | null = null;

            const applyFilters = (): TRow[] => {
                let result = rows.filter((row) => matchFilters(row, filters));
                for (const col of nullFilters) {
                    result = result.filter((row) => row[col as keyof TRow] == null);
                }
                for (const { column, values } of inFilters) {
                    result = result.filter((row) =>
                        values.includes(row[column as keyof TRow]),
                    );
                }
                if (orderCols.length > 0) {
                    result = [...result].sort((a, b) => {
                        for (const order of orderCols) {
                            const av = a[order.column];
                            const bv = b[order.column];
                            if (av === bv) continue;
                            const cmp = av! < bv! ? -1 : 1;
                            return order.ascending ? cmp : -cmp;
                        }
                        return 0;
                    });
                }
                if (limitN != null) {
                    result = result.slice(0, limitN);
                }
                return result;
            };

            const project = (row: TRow | undefined) => {
                if (!row) return null;
                if (selectCols === "nth_week") {
                    return { nth_week: row.nth_week };
                }
                return row;
            };

            const builder = {
                select(columns?: string) {
                    selectCols = columns ?? "*";
                    return builder;
                },
                eq(column: string, value: unknown) {
                    filters.push({ column, value });
                    return builder;
                },
                in(column: string, values: unknown[]) {
                    inFilters.push({ column, values });
                    return builder;
                },
                is(column: string, value: null) {
                    if (value !== null) {
                        throw new Error("Mock only supports .is(col, null)");
                    }
                    nullFilters.push(column);
                    return builder;
                },
                order(column: string, opts: { ascending: boolean }) {
                    orderCols.push({
                        column: column as keyof TRow,
                        ascending: opts.ascending,
                    });
                    return builder;
                },
                limit(n: number) {
                    limitN = n;
                    return builder;
                },
                update(patch: Partial<TRow>) {
                    pendingUpdate = patch;
                    return builder;
                },
                upsert(
                    row: Omit<TRow, "id" | "created_at" | "updated_at" | "completed_at"> & {
                        completed_at?: string | null;
                    },
                    opts: { onConflict?: string },
                ) {
                    if (opts.onConflict !== "program_id,nth_week") {
                        throw new Error(`Unexpected onConflict: ${opts.onConflict}`);
                    }
                    pendingUpsert = row;
                    const existingIndex = rows.findIndex(
                        (r) =>
                            r.program_id === row.program_id && r.nth_week === row.nth_week,
                    );
                    const now = "2026-07-25T12:00:00Z";
                    if (existingIndex >= 0) {
                        rows[existingIndex] = {
                            ...rows[existingIndex],
                            ...row,
                            updated_at: now,
                        };
                    } else {
                        idSeq += 1;
                        rows.push({
                            id: `link-${idSeq}`,
                            created_at: now,
                            updated_at: now,
                            completed_at: row.completed_at ?? null,
                            ...row,
                        });
                    }
                    return builder;
                },
                async maybeSingle() {
                    if (pendingUpsert) {
                        const match = rows.find(
                            (r) =>
                                r.program_id === pendingUpsert!.program_id &&
                                r.nth_week === pendingUpsert!.nth_week,
                        );
                        pendingUpsert = null;
                        return { data: project(match), error: null };
                    }
                    if (pendingUpdate) {
                        const matched = applyFilters();
                        const now = "2026-07-25T12:00:00Z";
                        for (const row of matched) {
                            Object.assign(row, pendingUpdate, { updated_at: now });
                        }
                        pendingUpdate = null;
                        return { data: project(matched[0]), error: null };
                    }
                    const matched = applyFilters();
                    return { data: project(matched[0]), error: null };
                },
                then(resolve: (value: { data: unknown; error: null }) => void) {
                    if (pendingUpdate) {
                        const matched = applyFilters();
                        const now = "2026-07-25T12:00:00Z";
                        for (const row of matched) {
                            Object.assign(row, pendingUpdate, { updated_at: now });
                        }
                        pendingUpdate = null;
                        resolve({ data: matched, error: null });
                        return;
                    }
                    const matched = applyFilters();
                    if (selectCols === "nth_week") {
                        resolve({
                            data: matched.map((r) => ({ nth_week: r.nth_week })),
                            error: null,
                        });
                        return;
                    }
                    resolve({ data: matched, error: null });
                },
            };

            return builder;
        },
    };

    return db;
}

function asDb(mock: unknown): SupabaseClient<Database> {
    return mock as SupabaseClient<Database>;
}

function input(
    overrides: Partial<TUpsertProgramHevyWeekLinkInput> = {},
): TUpsertProgramHevyWeekLinkInput {
    return {
        userId: USER_ID,
        programId: PROGRAM_ID,
        nthWeek: 1,
        hevyFolderId: 1001,
        hevyRoutineIds: ["routine-a", "routine-b"],
        ...overrides,
    };
}

describe("program-hevy-links helpers", () => {
    let mock: ReturnType<typeof createMockDb>;

    beforeEach(() => {
        mock = createMockDb();
    });

    it("upsert then get-by-week returns same folder/routine IDs", async () => {
        const payload = input({
            nthWeek: 1,
            hevyFolderId: 555,
            hevyRoutineIds: ["r1", "r2", "r3"],
        });

        const upserted = await upsertProgramHevyWeekLink(payload, asDb(mock));
        expect(upserted.hevy_folder_id).toBe(555);
        expect(upserted.hevy_routine_ids).toEqual(["r1", "r2", "r3"]);
        expect(upserted.program_id).toBe(PROGRAM_ID);
        expect(upserted.nth_week).toBe(1);

        const fetched = await getProgramHevyWeekLink(PROGRAM_ID, 1, asDb(mock));
        expect(fetched).toEqual(upserted);
    });

    it("after weeks 1 then 2, current linked week is 2", async () => {
        await upsertProgramHevyWeekLink(input({ nthWeek: 1, hevyFolderId: 1 }), asDb(mock));
        await upsertProgramHevyWeekLink(
            input({ nthWeek: 2, hevyFolderId: 2, hevyRoutineIds: ["w2"] }),
            asDb(mock),
        );

        const current = await getCurrentLinkedWeek(PROGRAM_ID, asDb(mock));
        expect(current).toBe(2);

        const links = await getProgramHevyWeekLinks(PROGRAM_ID, asDb(mock));
        expect(links.map((l) => l.nth_week)).toEqual([1, 2]);
    });

    it("empty program → current linked week is null", async () => {
        await upsertProgramHevyWeekLink(
            input({ programId: OTHER_PROGRAM_ID, nthWeek: 1 }),
            asDb(mock),
        );

        const current = await getCurrentLinkedWeek(PROGRAM_ID, asDb(mock));
        expect(current).toBeNull();

        const link = await getProgramHevyWeekLink(PROGRAM_ID, 1, asDb(mock));
        expect(link).toBeNull();
    });

    it("re-upsert same week updates IDs, no duplicate row", async () => {
        await upsertProgramHevyWeekLink(
            input({
                nthWeek: 1,
                hevyFolderId: 100,
                hevyRoutineIds: ["old-a", "old-b"],
            }),
            asDb(mock),
        );

        const updated = await upsertProgramHevyWeekLink(
            input({
                nthWeek: 1,
                hevyFolderId: 200,
                hevyRoutineIds: ["new-a"],
            }),
            asDb(mock),
        );

        expect(updated.hevy_folder_id).toBe(200);
        expect(updated.hevy_routine_ids).toEqual(["new-a"]);

        const forProgram = mock.rows.filter((r) => r.program_id === PROGRAM_ID);
        expect(forProgram).toHaveLength(1);
        expect(forProgram[0]?.hevy_folder_id).toBe(200);
        expect(forProgram[0]?.hevy_routine_ids).toEqual(["new-a"]);

        const fetched = await getProgramHevyWeekLink(PROGRAM_ID, 1, asDb(mock));
        expect(fetched?.hevy_folder_id).toBe(200);
        expect(fetched?.hevy_routine_ids).toEqual(["new-a"]);
    });

    it("markProgramWeekComplete sets completed_at", async () => {
        await upsertProgramHevyWeekLink(input({ nthWeek: 1 }), asDb(mock));

        const marked = await markProgramWeekComplete(PROGRAM_ID, 1, asDb(mock));
        expect(marked.completed_at).toBeTruthy();

        const fetched = await getProgramHevyWeekLink(PROGRAM_ID, 1, asDb(mock));
        expect(fetched?.completed_at).toBe(marked.completed_at);
    });

    it("markProgramWeeksComplete skips already-complete weeks", async () => {
        await upsertProgramHevyWeekLink(input({ nthWeek: 1 }), asDb(mock));
        await upsertProgramHevyWeekLink(input({ nthWeek: 2, hevyFolderId: 2 }), asDb(mock));
        await markProgramWeekComplete(PROGRAM_ID, 1, asDb(mock));
        const firstCompletedAt = mock.rows.find((r) => r.nth_week === 1)?.completed_at;

        await markProgramWeeksComplete(PROGRAM_ID, [1, 2], asDb(mock));

        expect(mock.rows.find((r) => r.nth_week === 1)?.completed_at).toBe(firstCompletedAt);
        expect(mock.rows.find((r) => r.nth_week === 2)?.completed_at).toBeTruthy();
    });

    it("markProgramWeekComplete throws when link missing", async () => {
        await expect(markProgramWeekComplete(PROGRAM_ID, 9, asDb(mock))).rejects.toThrow(
            /No Program–Hevy link/,
        );
    });

    it("updateProgramHevyWeekRoutineIds rewrites IDs on the existing row", async () => {
        await upsertProgramHevyWeekLink(
            input({
                nthWeek: 1,
                hevyFolderId: 1001,
                hevyRoutineIds: ["old-a", "old-b"],
            }),
            asDb(mock),
        );

        const updated = await updateProgramHevyWeekRoutineIds(
            PROGRAM_ID,
            1,
            ["live-a"],
            asDb(mock),
        );

        expect(updated.hevy_routine_ids).toEqual(["live-a"]);
        expect(updated.hevy_folder_id).toBe(1001);
        expect(mock.rows).toHaveLength(1);
        expect(mock.rows[0]?.hevy_routine_ids).toEqual(["live-a"]);
    });

    it("updateProgramHevyWeekRoutineIds throws when the week has no link", async () => {
        await expect(
            updateProgramHevyWeekRoutineIds(PROGRAM_ID, 1, ["r1"], asDb(mock)),
        ).rejects.toThrow(/No Program–Hevy link/);
        expect(mock.rows).toHaveLength(0);
    });
});
