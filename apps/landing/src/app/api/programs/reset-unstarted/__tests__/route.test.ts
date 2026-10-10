// SPDX-License-Identifier: AGPL-3.0-only

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";

const { mockGetUser, mockReset } = vi.hoisted(() => ({
    mockGetUser: vi.fn(),
    mockReset: vi.fn(),
}));

vi.mock("@/utils/supabase/server", () => ({
    createClient: vi.fn(async () => ({
        auth: { getUser: mockGetUser },
    })),
}));

vi.mock("@/api/feature-limits", () => ({
    isTestUser: vi.fn(),
}));

vi.mock("@/api/program-unstarted-reset", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/api/program-unstarted-reset")>();
    return {
        ...actual,
        resetProgramToUnstarted: mockReset,
    };
});

import { isTestUser } from "@/api/feature-limits";
import { ProgramUnstartedResetError } from "@/api/program-unstarted-reset";
import { POST } from "../route";

const USER = { id: "user-1", email: "test@localhost.dev" } as User;

function request(body: unknown): Request {
    return new Request("http://localhost/api/programs/reset-unstarted", {
        method: "POST",
        body: JSON.stringify(body),
    });
}

describe("POST /api/programs/reset-unstarted", () => {
    beforeEach(() => {
        mockGetUser.mockReset();
        mockReset.mockReset();
        vi.mocked(isTestUser).mockReset();
    });

    it("returns 401 when signed out", async () => {
        mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

        const response = await POST(request({ programId: 13 }));

        expect(response.status).toBe(401);
        expect(mockReset).not.toHaveBeenCalled();
    });

    it("returns 403 when the user is not a test user", async () => {
        mockGetUser.mockResolvedValue({ data: { user: USER }, error: null });
        vi.mocked(isTestUser).mockReturnValue(false);

        const response = await POST(request({ programId: 13 }));

        expect(response.status).toBe(403);
        expect(mockReset).not.toHaveBeenCalled();
    });

    it("returns 400 when programId is missing", async () => {
        mockGetUser.mockResolvedValue({ data: { user: USER }, error: null });
        vi.mocked(isTestUser).mockReturnValue(true);

        const response = await POST(request({}));

        expect(response.status).toBe(400);
        expect(mockReset).not.toHaveBeenCalled();
    });

    it("returns 404 when the program is missing or unowned", async () => {
        mockGetUser.mockResolvedValue({ data: { user: USER }, error: null });
        vi.mocked(isTestUser).mockReturnValue(true);
        mockReset.mockRejectedValue(new ProgramUnstartedResetError("Program not found"));

        const response = await POST(request({ programId: 13 }));

        expect(response.status).toBe(404);
    });

    it("resets an owned program for a test user", async () => {
        mockGetUser.mockResolvedValue({ data: { user: USER }, error: null });
        vi.mocked(isTestUser).mockReturnValue(true);
        mockReset.mockResolvedValue({
            deletedLinks: 2,
            deletedWorkouts: 1,
            deletedSuggestions: 1,
        });

        const response = await POST(request({ programId: 13 }));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual({
            ok: true,
            deletedLinks: 2,
            deletedWorkouts: 1,
            deletedSuggestions: 1,
        });
        expect(mockReset).toHaveBeenCalledWith(expect.anything(), 13, USER.id);
    });
});
