import { beforeEach, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/hooks/supabase";
import {
    ProgramUnstartedResetError,
    resetProgramToUnstarted,
} from "../program-unstarted-reset";

const USER_ID = "user-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const OTHER_USER = "user-bbbbbbbb-cccc-dddd-eeee-ffffffffffff";
const PROGRAM_ID = 13;

type TProgramRow = { id: number; user_id: string | null };
type TLinkRow = {
    id: string;
    user_id: string;
    program_id: number;
    hevy_routine_ids: string[];
};
type TWorkoutRow = { id: string; user_id: string; routine_id: string | null };
type TSuggestionRow = { id: string; user_id: string; program_id: number };

type TTables = {
    programs: TProgramRow[];
    program_hevy_week_links: TLinkRow[];
    workouts: TWorkoutRow[];
    program_week_suggestions: TSuggestionRow[];
};

type TFilter = { column: string; value: unknown };
type TInFilter = { column: string; values: unknown[] };

function rowValue(row: object, column: string): unknown {
    return (row as Record<string, unknown>)[column];
}

function matches(row: object, filters: TFilter[], inFilters: TInFilter[]): boolean {
    const eqs = filters.every((filter) => rowValue(row, filter.column) === filter.value);
    const ins = inFilters.every((filter) =>
        filter.values.includes(rowValue(row, filter.column)),
    );
    return eqs && ins;
}

function createMockDb(seed?: Partial<TTables>) {
    const tables: TTables = {
        programs: [...(seed?.programs ?? [])],
        program_hevy_week_links: [...(seed?.program_hevy_week_links ?? [])],
        workouts: [...(seed?.workouts ?? [])],
        program_week_suggestions: [...(seed?.program_week_suggestions ?? [])],
    };

    const db = {
        tables,
        from(table: keyof TTables) {
            const filters: TFilter[] = [];
            const inFilters: TInFilter[] = [];
            let pendingDelete = false;

            const apply = (): object[] =>
                (tables[table] as object[]).filter((row) =>
                    matches(row, filters, inFilters),
                );

            const builder = {
                select() {
                    return builder;
                },
                delete() {
                    pendingDelete = true;
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
                async maybeSingle() {
                    const matched = apply();
                    return { data: matched[0] ?? null, error: null };
                },
                then(
                    resolve: (value: { data: object[] | null; error: null }) => void,
                ) {
                    if (pendingDelete) {
                        const remaining = (tables[table] as object[]).filter(
                            (row) => !matches(row, filters, inFilters),
                        );
                        const removed = (tables[table] as object[]).filter((row) =>
                            matches(row, filters, inFilters),
                        );
                        (tables[table] as object[]).length = 0;
                        (tables[table] as object[]).push(...remaining);
                        resolve({ data: removed, error: null });
                        return Promise.resolve();
                    }

                    resolve({ data: apply(), error: null });
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

const OWNED_PROGRAM: TProgramRow = { id: PROGRAM_ID, user_id: USER_ID };

describe("resetProgramToUnstarted", () => {
    let client: ReturnType<typeof createMockDb>;

    beforeEach(() => {
        client = createMockDb({
            programs: [OWNED_PROGRAM],
        });
    });

    it("throws not_found when the program is missing", async () => {
        client = createMockDb({ programs: [] });

        await expect(
            resetProgramToUnstarted(asDb(client), PROGRAM_ID, USER_ID),
        ).rejects.toBeInstanceOf(ProgramUnstartedResetError);
    });

    it("throws not_found when the program is owned by someone else", async () => {
        client = createMockDb({
            programs: [{ id: PROGRAM_ID, user_id: OTHER_USER }],
        });

        await expect(
            resetProgramToUnstarted(asDb(client), PROGRAM_ID, USER_ID),
        ).rejects.toBeInstanceOf(ProgramUnstartedResetError);
    });

    it("is a no-op on an already unstarted owned program", async () => {
        const result = await resetProgramToUnstarted(asDb(client), PROGRAM_ID, USER_ID);

        expect(result).toEqual({
            deletedLinks: 0,
            deletedWorkouts: 0,
            deletedSuggestions: 0,
        });
    });

    it("deletes links, matching workouts, and week suggest cache", async () => {
        client = createMockDb({
            programs: [OWNED_PROGRAM],
            program_hevy_week_links: [
                {
                    id: "link-1",
                    user_id: USER_ID,
                    program_id: PROGRAM_ID,
                    hevy_routine_ids: ["r1", "r2"],
                },
                {
                    id: "link-2",
                    user_id: USER_ID,
                    program_id: PROGRAM_ID,
                    hevy_routine_ids: ["r3"],
                },
            ],
            workouts: [
                { id: "w-match", user_id: USER_ID, routine_id: "r1" },
                { id: "w-other-routine", user_id: USER_ID, routine_id: "other" },
                { id: "w-other-user", user_id: OTHER_USER, routine_id: "r1" },
            ],
            program_week_suggestions: [
                { id: "sug-1", user_id: USER_ID, program_id: PROGRAM_ID },
                { id: "sug-other", user_id: USER_ID, program_id: 99 },
            ],
        });

        const result = await resetProgramToUnstarted(asDb(client), PROGRAM_ID, USER_ID);

        expect(result).toEqual({
            deletedLinks: 2,
            deletedWorkouts: 1,
            deletedSuggestions: 1,
        });
        expect(client.tables.program_hevy_week_links).toHaveLength(0);
        expect(client.tables.workouts.map((row) => row.id)).toEqual([
            "w-other-routine",
            "w-other-user",
        ]);
        expect(client.tables.program_week_suggestions).toEqual([
            { id: "sug-other", user_id: USER_ID, program_id: 99 },
        ]);
        expect(client.tables.programs).toEqual([OWNED_PROGRAM]);
    });
});
