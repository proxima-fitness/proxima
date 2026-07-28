/**
 * Edit-path handoff hook (ADR 0010 / 04).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const push = vi.fn();
const refetchQueries = vi.fn();
const startEditSession = vi.fn();

vi.mock("@/contexts/EditSessionContext", () => ({
    useEditSession: () => ({
        session: null,
        startEditSession,
        clearEditSession: vi.fn(),
    }),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push }),
}));

vi.mock("@tanstack/react-query", () => ({
    useQueryClient: () => ({ refetchQueries }),
}));

vi.mock("@/contexts/UserContext", () => ({
    useUserContext: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/api/hooks", () => ({
    useHevySecret: () => ({ data: "hevy-key" }),
}));

vi.mock("@/components/program-builder/utils/format-responses", () => ({
    normalizeRoutineTitlesForBuilder: (routines: THevyRoutine[]) => routines,
}));

import { useNavigateToEditHevyProgram } from "../useNavigateToEditHevyProgram";

describe("useNavigateToEditHevyProgram", () => {
    beforeEach(() => {
        push.mockReset();
        refetchQueries.mockReset();
        startEditSession.mockReset();
        refetchQueries.mockResolvedValue(undefined);
        localStorage.clear();
    });

    it("refetches Hevy programs, seeds draft, navigates with folder", async () => {
        const program: THevyProgramItem = {
            program_title: "Split",
            program: [
                {
                    id: "r1",
                    title: "Day 1",
                    folder_id: 42,
                    notes: "",
                    exercises: [],
                },
            ],
        };

        const { result } = renderHook(() => useNavigateToEditHevyProgram());

        await act(async () => {
            await result.current(program, { extraParams: { search: "stall" } });
        });

        expect(refetchQueries).toHaveBeenCalledWith({ queryKey: ["hevy-programs"] });
        expect(JSON.parse(localStorage.getItem("hevy-program-in-progress") ?? "[]")).toEqual(
            program.program,
        );
        expect(push).toHaveBeenCalledWith(
            "/build-program?resume=true&edit=true&hevy=true&search=stall&folder=42",
        );
    });

    it("Edit current week seeds one week ordered by the link, not by title", async () => {
        // Week 3's Hevy week copy, folder 55. Hevy returns the folder in its own
        // order and the day-1 routine has been renamed (ADR 0013 / 01).
        const program: THevyProgramItem = {
            program_title: "Week 3 - Split",
            program: [
                { id: "r2", title: "2 - Pull", folder_id: 55, notes: "", exercises: [] },
                { id: "r1", title: "Chest day", folder_id: 55, notes: "", exercises: [] },
            ],
        };

        const { result } = renderHook(() => useNavigateToEditHevyProgram());

        await act(async () => {
            await result.current(program, {
                programId: 7,
                nthWeek: 3,
                hevyRoutineIds: ["r1", "r2"],
            });
        });

        const seeded = startEditSession.mock.calls[0]?.[0]?.routines as THevyRoutine[];
        expect(seeded.map((r) => r.hevyRoutineId)).toEqual(["r1", "r2"]);
        expect(seeded.every((r) => r.folder_id === 0)).toBe(true);

        expect(push).toHaveBeenCalledWith(
            "/build-program?resume=true&edit=true&hevy=true&folder=55&program=7&week=3",
        );
    });

    it("Edit current week hands off in memory and leaves the New-path draft alone", async () => {
        // ADR 0013 / 02 — hevy-program-in-progress belongs to New path. An Edit
        // arrival that wrote it would clobber an in-progress draft.
        localStorage.setItem("hevy-program-in-progress", JSON.stringify([{ id: "new-path-draft" }]));

        const program: THevyProgramItem = {
            program_title: "Week 3 - Split",
            program: [
                { id: "r1", title: "1 - Push", folder_id: 55, notes: "", exercises: [] },
            ],
        };

        const { result } = renderHook(() => useNavigateToEditHevyProgram());

        await act(async () => {
            await result.current(program, {
                programId: 7,
                nthWeek: 3,
                hevyRoutineIds: ["r1"],
            });
        });

        expect(startEditSession).toHaveBeenCalledWith(
            expect.objectContaining({ programId: 7, nthWeek: 3, initialFolderId: 55 }),
        );
        expect(JSON.parse(localStorage.getItem("hevy-program-in-progress") ?? "[]")).toEqual([
            { id: "new-path-draft" },
        ]);
    });

    it("falls back to title inference when the folder has no link", async () => {
        const program: THevyProgramItem = {
            program_title: "Hevy-only split",
            program: [
                { id: "r1", title: "1 - Push", folder_id: 55, notes: "", exercises: [] },
            ],
        };

        const { result } = renderHook(() => useNavigateToEditHevyProgram());

        await act(async () => {
            await result.current(program);
        });

        // normalizeRoutineTitlesForBuilder is mocked to identity here — the point
        // is that the raw folder_id survives, i.e. link ordering did not run.
        const seeded = JSON.parse(
            localStorage.getItem("hevy-program-in-progress") ?? "[]",
        ) as THevyRoutine[];
        expect(seeded[0].folder_id).toBe(55);
        // Hevy-only Edit keeps the draft-key transport until ADR 0002 / 02.
        expect(startEditSession).not.toHaveBeenCalled();
    });
});
