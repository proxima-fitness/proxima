// SPDX-License-Identifier: AGPL-3.0-only

import { beforeEach, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/hooks/supabase";
import {
    deleteProgramWeekSuggestion,
    getProgramWeekSuggestion,
    markProgramWeekSuggestionUnconsumed,
    saveProgramWeekSuggestion,
} from "../program-week-suggestions";

const USER_ID = "user-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const PROGRAM_ID = 42;

type TRow = {
    id: string;
    user_id: string;
    program_id: number;
    based_on_week: number;
    target_week: number;
    summary: string;
    changes: Json;
    generated_at: string;
    created_at: string;
    llm_consumed: boolean;
};

type TFilter = { column: string; value: unknown };

function matchFilters(row: TRow, filters: TFilter[]): boolean {
    return filters.every((filter) => row[filter.column as keyof TRow] === filter.value);
}

const VALID_CHANGE = {
    description: "Bench: +2.5 kg",
    operation: {
        op: "update_set",
        folderIds: [2],
        dayOrder: 1,
        exerciseIndex: 0,
        setIndex: 0,
        set: { weight_kg: 62.5 },
    },
};

function createMockDb(seed?: TRow[]) {
    const rows: TRow[] = [...(seed ?? [])];
    let idSeq = rows.length;

    const db = {
        rows,
        from(table: string) {
            if (table !== "program_week_suggestions") {
                throw new Error(`Unexpected table: ${table}`);
            }

            const filters: TFilter[] = [];
            let pendingInsert: Partial<TRow> | null = null;
            let pendingUpdate: Partial<TRow> | null = null;
            let pendingDelete = false;

            const applyFilters = (): TRow[] => rows.filter((row) => matchFilters(row, filters));

            const builder: {
                select: (cols?: string) => typeof builder;
                eq: (column: string, value: unknown) => typeof builder;
                insert: (row: Partial<TRow>) => typeof builder;
                update: (row: Partial<TRow>) => typeof builder;
                delete: () => typeof builder;
                maybeSingle: () => Promise<{ data: TRow | null; error: { code?: string } | null }>;
                then: (
                    resolve: (value: { data: null; error: null }) => void,
                ) => Promise<void>;
            } = {
                select() {
                    return builder;
                },
                eq(column: string, value: unknown) {
                    filters.push({ column, value });
                    return builder;
                },
                insert(row: Partial<TRow>) {
                    pendingInsert = row;
                    return builder;
                },
                update(row: Partial<TRow>) {
                    pendingUpdate = row;
                    return builder;
                },
                delete() {
                    pendingDelete = true;
                    return builder;
                },
                async maybeSingle() {
                    if (pendingInsert) {
                        const conflict = rows.find(
                            (row) =>
                                row.program_id === pendingInsert!.program_id &&
                                row.based_on_week === pendingInsert!.based_on_week,
                        );
                        if (conflict) {
                            return { data: null, error: { code: "23505" } };
                        }

                        idSeq += 1;
                        const created: TRow = {
                            id: `row-${idSeq}`,
                            user_id: pendingInsert.user_id!,
                            program_id: pendingInsert.program_id!,
                            based_on_week: pendingInsert.based_on_week!,
                            target_week: pendingInsert.target_week!,
                            summary: pendingInsert.summary!,
                            changes: pendingInsert.changes ?? [],
                            generated_at:
                                pendingInsert.generated_at ?? "2026-07-26T12:00:00.000Z",
                            created_at: "2026-07-26T12:00:00.000Z",
                            llm_consumed: pendingInsert.llm_consumed ?? true,
                        };
                        rows.push(created);
                        return { data: created, error: null };
                    }

                    const matched = applyFilters();
                    return { data: matched[0] ?? null, error: null };
                },
                then(resolve) {
                    if (pendingDelete) {
                        const remaining = rows.filter((row) => !matchFilters(row, filters));
                        rows.length = 0;
                        rows.push(...remaining);
                    }
                    if (pendingUpdate) {
                        for (const row of applyFilters()) {
                            Object.assign(row, pendingUpdate);
                        }
                    }
                    resolve({ data: null, error: null });
                    return Promise.resolve();
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

describe("program-week-suggestions", () => {
    let client: ReturnType<typeof createMockDb>;

    beforeEach(() => {
        client = createMockDb();
    });

    it("returns null when no cached row exists", async () => {
        await expect(
            getProgramWeekSuggestion(asDb(client), PROGRAM_ID, 2),
        ).resolves.toBeNull();
    });

    it("reads a cached suggestion including llmConsumed", async () => {
        client = createMockDb([
            {
                id: "row-1",
                user_id: USER_ID,
                program_id: PROGRAM_ID,
                based_on_week: 2,
                target_week: 3,
                summary: "Nudge top sets.",
                changes: [VALID_CHANGE],
                generated_at: "2026-07-20T12:00:00.000Z",
                created_at: "2026-07-20T12:00:00.000Z",
                llm_consumed: false,
            },
        ]);

        await expect(getProgramWeekSuggestion(asDb(client), PROGRAM_ID, 2)).resolves.toEqual({
            programId: PROGRAM_ID,
            basedOnWeek: 2,
            targetWeek: 3,
            summary: "Nudge top sets.",
            changes: [VALID_CHANGE],
            generatedAt: "2026-07-20T12:00:00.000Z",
            llmConsumed: false,
        });
    });

    it("inserts a first-write suggestion as consumed by default", async () => {
        const saved = await saveProgramWeekSuggestion(asDb(client), {
            userId: USER_ID,
            programId: PROGRAM_ID,
            basedOnWeek: 2,
            targetWeek: 3,
            summary: "Progress bench.",
            changes: [VALID_CHANGE],
            generatedAt: "2026-07-26T12:00:00.000Z",
        });

        expect(saved).toMatchObject({
            programId: PROGRAM_ID,
            basedOnWeek: 2,
            targetWeek: 3,
            summary: "Progress bench.",
            changes: [VALID_CHANGE],
            llmConsumed: true,
            inserted: true,
        });
        expect(client.rows).toHaveLength(1);
        expect(client.rows[0]?.llm_consumed).toBe(true);
    });

    it("inserts an unconsumed tease row when llmConsumed is false", async () => {
        const saved = await saveProgramWeekSuggestion(asDb(client), {
            userId: USER_ID,
            programId: PROGRAM_ID,
            basedOnWeek: 2,
            targetWeek: 3,
            summary: "Progress bench.",
            changes: [VALID_CHANGE],
            generatedAt: "2026-07-26T12:00:00.000Z",
            llmConsumed: false,
        });

        expect(saved.llmConsumed).toBe(false);
        expect(saved.inserted).toBe(true);
        expect(client.rows[0]?.llm_consumed).toBe(false);
    });

    it("returns the existing row on unique conflict (first-write wins)", async () => {
        client = createMockDb([
            {
                id: "row-1",
                user_id: USER_ID,
                program_id: PROGRAM_ID,
                based_on_week: 2,
                target_week: 3,
                summary: "Original.",
                changes: [VALID_CHANGE],
                generated_at: "2026-07-20T12:00:00.000Z",
                created_at: "2026-07-20T12:00:00.000Z",
                llm_consumed: true,
            },
        ]);

        const saved = await saveProgramWeekSuggestion(asDb(client), {
            userId: USER_ID,
            programId: PROGRAM_ID,
            basedOnWeek: 2,
            targetWeek: 3,
            summary: "Should not overwrite.",
            changes: [],
            generatedAt: "2026-07-26T12:00:00.000Z",
            llmConsumed: false,
        });

        expect(saved.summary).toBe("Original.");
        expect(saved.llmConsumed).toBe(true);
        expect(saved.inserted).toBe(false);
        expect(client.rows).toHaveLength(1);
    });

    it("marks a consumed row unconsumed after a consume race", async () => {
        client = createMockDb([
            {
                id: "row-1",
                user_id: USER_ID,
                program_id: PROGRAM_ID,
                based_on_week: 2,
                target_week: 3,
                summary: "Nudge top sets.",
                changes: [VALID_CHANGE],
                generated_at: "2026-07-20T12:00:00.000Z",
                created_at: "2026-07-20T12:00:00.000Z",
                llm_consumed: true,
            },
        ]);

        await markProgramWeekSuggestionUnconsumed(asDb(client), PROGRAM_ID, 2);

        expect(client.rows[0]?.llm_consumed).toBe(false);
    });

    it("deletes a cached suggestion by program + week", async () => {
        client = createMockDb([
            {
                id: "row-1",
                user_id: USER_ID,
                program_id: PROGRAM_ID,
                based_on_week: 2,
                target_week: 3,
                summary: "Gone.",
                changes: [VALID_CHANGE],
                generated_at: "2026-07-20T12:00:00.000Z",
                created_at: "2026-07-20T12:00:00.000Z",
                llm_consumed: true,
            },
        ]);

        await deleteProgramWeekSuggestion(asDb(client), PROGRAM_ID, 2);
        expect(client.rows).toHaveLength(0);
    });
});
