/**
 * Edit-path handoff hook (ADR 0010 / 04).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const push = vi.fn();
const refetchQueries = vi.fn();

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
});
