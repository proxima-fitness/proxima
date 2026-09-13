/**
 * Unit tests for {@link deleteOwnedProximaProgram} and {@link getOwnedPrograms}.
 */
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import type { User } from "@supabase/supabase-js";

const mockMaybeSingle = vi.fn();
const mockEqSecond: Mock = vi.fn();
const mockEqFirst: Mock = vi.fn();
const mockSelect: Mock = vi.fn();
const mockDelete: Mock = vi.fn();
const mockOrder: Mock = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/api/index", () => ({
    supabase: {
        from: (...args: unknown[]) => mockFrom(...args),
    },
}));

vi.mock("@/components/program-builder/utils", () => ({
    convertToHevyRoutine: vi.fn(),
}));

import { deleteOwnedProximaProgram, getOwnedPrograms } from "@/api/programs";

const testUser = { id: "user-1" } as User;

describe("deleteOwnedProximaProgram", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockEqSecond.mockReturnValue({ select: mockSelect });
        mockEqFirst.mockReturnValue({ eq: mockEqSecond });
        mockSelect.mockReturnValue({ maybeSingle: mockMaybeSingle });
        mockDelete.mockReturnValue({ eq: mockEqFirst });
        mockFrom.mockReturnValue({ delete: mockDelete });
    });

    it("rejects missing user or id", async () => {
        expect(await deleteOwnedProximaProgram(null, 1)).toEqual({
            success: false,
            error: "Missing required fields",
        });
        expect(await deleteOwnedProximaProgram(testUser, 0)).toEqual({
            success: false,
            error: "Missing required fields",
        });
        expect(mockFrom).not.toHaveBeenCalled();
    });

    it("deletes the owned programs row via PostgREST", async () => {
        mockMaybeSingle.mockResolvedValue({ data: { id: 42 }, error: null });

        const result = await deleteOwnedProximaProgram(testUser, 42);

        expect(mockFrom).toHaveBeenCalledWith("programs");
        expect(mockEqFirst).toHaveBeenCalledWith("id", 42);
        expect(mockEqSecond).toHaveBeenCalledWith("user_id", "user-1");
        expect(result).toEqual({ success: true });
    });

    it("fails when no owned row matches", async () => {
        mockMaybeSingle.mockResolvedValue({ data: null, error: null });

        const result = await deleteOwnedProximaProgram(testUser, 99);

        expect(result).toEqual({
            success: false,
            error: "Program not found or you don't own it",
        });
    });
});

describe("getOwnedPrograms", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockOrder.mockResolvedValue({ data: [{ id: 7, title: "Mine", user_id: "user-1", saves: 3 }], error: null });
        mockEqFirst.mockReturnValue({ order: mockOrder });
        mockSelect.mockReturnValue({ eq: mockEqFirst });
        mockFrom.mockReturnValue({ select: mockSelect });
    });

    it("lists programs the user owns", async () => {
        const rows = await getOwnedPrograms(testUser);

        expect(mockFrom).toHaveBeenCalledWith("programs");
        expect(mockEqFirst).toHaveBeenCalledWith("user_id", "user-1");
        expect(rows).toEqual([
            { id: 7, title: "Mine", user_id: "user-1", saves: 3 },
        ]);
    });
});
