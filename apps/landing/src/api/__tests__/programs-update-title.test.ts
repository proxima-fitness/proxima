// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Unit tests for {@link updateProgramTitle}.
 */
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import type { User } from "@supabase/supabase-js";

const mockMaybeSingle = vi.fn();

type TMockFilterBuilder =
    | { maybeSingle: typeof mockMaybeSingle }
    | { eq: Mock<() => TMockFilterBuilder> }
    | { select: Mock<() => { maybeSingle: typeof mockMaybeSingle }> };

const mockEqSecond: Mock<() => TMockFilterBuilder> = vi.fn(() => ({
    maybeSingle: mockMaybeSingle,
}));
const mockEqFirst = vi.fn(() => ({ eq: mockEqSecond }));
const mockSelect = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockUpdate = vi.fn(() => ({ eq: mockEqFirst }));
const mockFrom = vi.fn(() => ({
    update: mockUpdate,
}));

vi.mock("@/api/index", () => ({
    supabase: {
        from: () => mockFrom(),
    },
}));

vi.mock("@/components/program-builder/utils", () => ({
    convertToHevyRoutine: vi.fn(),
}));

import {
    MAX_PROGRAM_TITLE_LENGTH,
    updateProgramTitle,
} from "@/api/programs";

const testUser = { id: "user-1" } as User;

describe("updateProgramTitle", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockEqFirst.mockReturnValue({ eq: mockEqSecond });
        mockEqSecond.mockReturnValue({ select: mockSelect });
        mockSelect.mockReturnValue({ maybeSingle: mockMaybeSingle });
        mockUpdate.mockReturnValue({ eq: mockEqFirst });
        mockFrom.mockReturnValue({ update: mockUpdate });
    });

    it("rejects missing user, id, or blank title", async () => {
        expect(await updateProgramTitle(null, 1, "Lift")).toEqual({
            success: false,
            error: "Missing required fields",
        });
        expect(await updateProgramTitle(testUser, 0, "Lift")).toEqual({
            success: false,
            error: "Missing required fields",
        });
        expect(await updateProgramTitle(testUser, 1, "   ")).toEqual({
            success: false,
            error: "Missing required fields",
        });
        expect(mockFrom).not.toHaveBeenCalled();
    });

    it("updates owned program and caps length", async () => {
        mockMaybeSingle.mockResolvedValue({ data: { id: 42 }, error: null });
        const long = `${"a".repeat(MAX_PROGRAM_TITLE_LENGTH)}extra`;

        const result = await updateProgramTitle(testUser, 42, `  ${long}  `);

        expect(mockFrom).toHaveBeenCalled();
        expect(mockUpdate).toHaveBeenCalledWith({
            title: "a".repeat(MAX_PROGRAM_TITLE_LENGTH),
        });
        expect(mockEqFirst).toHaveBeenCalledWith("id", 42);
        expect(mockEqSecond).toHaveBeenCalledWith("user_id", "user-1");
        expect(result).toEqual({
            success: true,
            title: "a".repeat(MAX_PROGRAM_TITLE_LENGTH),
        });
    });

    it("fails when no owned row matches", async () => {
        mockMaybeSingle.mockResolvedValue({ data: null, error: null });

        const result = await updateProgramTitle(testUser, 99, "Stolen title");

        expect(result).toEqual({
            success: false,
            error: "Program not found or you don't own it",
        });
    });

    it("surfaces supabase errors", async () => {
        mockMaybeSingle.mockResolvedValue({
            data: null,
            error: { message: "boom" },
        });

        const result = await updateProgramTitle(testUser, 1, "Lift");

        expect(result).toEqual({
            success: false,
            error: "boom",
        });
    });
});
