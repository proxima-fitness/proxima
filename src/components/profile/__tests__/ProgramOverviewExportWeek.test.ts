import { describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import type { TProgramHevyWeekLink } from "@/api/program-hevy-links";
import {
    buildWeekExportUploadArgs,
    evaluateWeekExportGate,
    exportProgramWeekToHevy,
    nextExportableWeek,
    slicePrescriptionWeekForExport,
} from "../ProgramOverviewExportWeek";

function makeRoutine(folderId: number, title: string): THevyRoutine {
    return {
        id: "",
        title,
        folder_id: folderId,
        notes: "",
        exercises: [],
        order: "1",
    };
}

const USER = { id: "user-1" } as User;

function makeLink(overrides: Partial<TProgramHevyWeekLink> = {}): TProgramHevyWeekLink {
    return {
        id: "link-1",
        user_id: USER.id,
        program_id: 42,
        nth_week: 1,
        hevy_folder_id: 555,
        hevy_routine_ids: ["r1", "r2"],
        exported_hevy_routine_ids: ["r1", "r2"],
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        ...overrides,
        completed_at: overrides.completed_at ?? null,
    };
}

describe("slicePrescriptionWeekForExport", () => {
    const program: THevyRoutine[] = [
        makeRoutine(0, "1 - Push"),
        makeRoutine(0, "2 - Pull"),
        makeRoutine(1, "1 - Legs"),
        makeRoutine(2, "1 - Upper"),
    ];

    it("returns week 1 routines (folder_id 0)", () => {
        const week1 = slicePrescriptionWeekForExport(program, 1);
        expect(week1.map((r) => r.title)).toEqual(["1 - Push", "2 - Pull"]);
    });

    it("returns week 2 routines (folder_id 1)", () => {
        const week2 = slicePrescriptionWeekForExport(program, 2);
        expect(week2.map((r) => r.title)).toEqual(["1 - Legs"]);
    });

    it("returns empty for missing week or invalid nthWeek", () => {
        expect(slicePrescriptionWeekForExport(program, 4)).toEqual([]);
        expect(slicePrescriptionWeekForExport(program, 0)).toEqual([]);
        expect(slicePrescriptionWeekForExport(program, 1.5)).toEqual([]);
    });
});

describe("buildWeekExportUploadArgs", () => {
    const program: THevyRoutine[] = [
        makeRoutine(0, "1 - A"),
        makeRoutine(0, "2 - B"),
        makeRoutine(1, "1 - C"),
    ];

    it("maps prescription week N to postProgramToHevyOneFolder args", () => {
        const args = buildWeekExportUploadArgs(program, 2, 42, "Hypertrophy Block");

        expect(args.week).toBe(2);
        expect(args.hevyRoutines).toHaveLength(1);
        expect(args.hevyRoutines[0]?.title).toBe("1 - C");
        expect(args.hevyRoutines.every((r) => r.folder_id === 1)).toBe(true);
        expect(args.programTitle).toEqual([{ id: "42", title: "Hypertrophy Block" }]);
        expect(args.folderTitle).toBe("Week 2 - Hypertrophy Block");
    });

    it("falls back to Proxima Program when title blank", () => {
        const args = buildWeekExportUploadArgs(program, 1, 7, "   ");
        expect(args.folderTitle).toBe("Week 1 - Proxima Program");
        expect(args.programTitle[0]?.title).toBe("Proxima Program");
        expect(args.hevyRoutines).toHaveLength(2);
    });
});

describe("evaluateWeekExportGate", () => {
    it("blocks re-Export when week already linked (C4)", () => {
        const gate = evaluateWeekExportGate(1, [1], []);
        expect(gate.allowed).toBe(false);
        if (gate.allowed) return;
        expect(gate.code).toBe("already_linked");
    });

    it("blocks N+1 when prior week incomplete (C5)", () => {
        const gate = evaluateWeekExportGate(2, [1], []);
        expect(gate.allowed).toBe(false);
        if (gate.allowed) return;
        expect(gate.code).toBe("prior_incomplete");
    });

    it("allows N+1 when prior week linked and complete", () => {
        expect(evaluateWeekExportGate(2, [1], [1])).toEqual({ allowed: true });
    });

    it("allows week 1 when no links", () => {
        expect(evaluateWeekExportGate(1, [], [])).toEqual({ allowed: true });
    });

    it("blocks skip when prior week not linked", () => {
        const gate = evaluateWeekExportGate(3, [1], [1]);
        expect(gate.allowed).toBe(false);
        if (gate.allowed) return;
        expect(gate.code).toBe("prior_not_linked");
    });
});

describe("nextExportableWeek", () => {
    it("returns 1 with no links, else max+1", () => {
        expect(nextExportableWeek([])).toBe(1);
        expect(nextExportableWeek([1])).toBe(2);
        expect(nextExportableWeek([1, 2])).toBe(3);
    });
});

describe("exportProgramWeekToHevy link persistence", () => {
    const prescription = [makeRoutine(0, "1 - A"), makeRoutine(0, "2 - B")];
    const getLinksEmpty = vi.fn().mockResolvedValue([]);

    it("upserts Program–Hevy link with folder + routine IDs on Hevy success", async () => {
        const upsertLink = vi.fn().mockResolvedValue(
            makeLink({
                nth_week: 1,
                hevy_folder_id: 555,
                hevy_routine_ids: ["r1", "r2"],
            }),
        );
        const getCurrentWeek = vi.fn().mockResolvedValue(1);
        const postOneFolder = vi.fn().mockResolvedValue({
            success: true,
            data: { hevyFolderId: 555, hevyRoutineIds: ["r1", "r2"] },
            createdNewHevyCustomTemplates: 0,
        });

        const result = await exportProgramWeekToHevy({
            programId: 42,
            programTitle: "Block A",
            nthWeek: 1,
            apiKey: "key",
            user: USER,
            prescriptionRoutines: prescription,
            postOneFolder,
            upsertLink,
            getCurrentWeek,
            getLinks: getLinksEmpty,
        });

        expect(result.success).toBe(true);
        if (result.success !== true) return;

        expect(upsertLink).toHaveBeenCalledTimes(1);
        expect(upsertLink).toHaveBeenCalledWith({
            userId: USER.id,
            programId: 42,
            nthWeek: 1,
            hevyFolderId: 555,
            hevyRoutineIds: ["r1", "r2"],
        });
        expect(result.currentWeek).toBe(1);
        expect(result.link.hevy_folder_id).toBe(555);
        expect(getCurrentWeek).toHaveBeenCalledWith(42);
    });

    it("skips upsert when Hevy upload fails", async () => {
        const upsertLink = vi.fn();
        const getCurrentWeek = vi.fn();
        const postOneFolder = vi.fn().mockResolvedValue({
            success: false,
            data: new Error("Hevy rate limited"),
        });

        const result = await exportProgramWeekToHevy({
            programId: 42,
            programTitle: "Block A",
            nthWeek: 1,
            apiKey: "key",
            user: USER,
            prescriptionRoutines: prescription,
            postOneFolder,
            upsertLink,
            getCurrentWeek,
            getLinks: getLinksEmpty,
        });

        expect(result.success).toBe(false);
        if (result.success !== false) return;
        expect(result.error.message).toBe("Hevy rate limited");
        expect(upsertLink).not.toHaveBeenCalled();
        expect(getCurrentWeek).not.toHaveBeenCalled();
    });

    it("blocks export and skips Hevy when week already linked", async () => {
        const postOneFolder = vi.fn();
        const upsertLink = vi.fn();
        const getLinks = vi.fn().mockResolvedValue([makeLink({ nth_week: 1 })]);

        const result = await exportProgramWeekToHevy({
            programId: 42,
            programTitle: "Block A",
            nthWeek: 1,
            apiKey: "key",
            user: USER,
            prescriptionRoutines: prescription,
            postOneFolder,
            upsertLink,
            getLinks,
        });

        expect(result.success).toBe(false);
        if (result.success !== false) return;
        expect(result.error.message).toMatch(/already exported/i);
        expect(postOneFolder).not.toHaveBeenCalled();
        expect(upsertLink).not.toHaveBeenCalled();
    });

    it("blocks N+1 export when prior week incomplete", async () => {
        const postOneFolder = vi.fn();
        const upsertLink = vi.fn();
        const getLinks = vi.fn().mockResolvedValue([makeLink({ nth_week: 1 })]);

        const result = await exportProgramWeekToHevy({
            programId: 42,
            programTitle: "Block A",
            nthWeek: 2,
            apiKey: "key",
            user: USER,
            completedWeeks: [],
            prescriptionRoutines: [makeRoutine(1, "1 - C")],
            postOneFolder,
            upsertLink,
            getLinks,
        });

        expect(result.success).toBe(false);
        if (result.success !== false) return;
        expect(result.error.message).toMatch(/Mark week 1 complete/i);
        expect(postOneFolder).not.toHaveBeenCalled();
        expect(upsertLink).not.toHaveBeenCalled();
    });
});
