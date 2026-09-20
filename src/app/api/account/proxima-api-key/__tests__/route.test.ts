import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";

const { mockGetUser, mockHas, mockMint, mockRevoke } = vi.hoisted(() => ({
    mockGetUser: vi.fn(),
    mockHas: vi.fn(),
    mockMint: vi.fn(),
    mockRevoke: vi.fn(),
}));

vi.mock("@/utils/supabase/server", () => ({
    createClient: vi.fn(async () => ({
        auth: { getUser: mockGetUser },
    })),
}));

vi.mock("@/lib/public-api/proxima-api-key", () => ({
    hasProximaApiKey: (...args: unknown[]) => mockHas(...args),
    mintProximaApiKey: (...args: unknown[]) => mockMint(...args),
    revokeProximaApiKey: (...args: unknown[]) => mockRevoke(...args),
}));

import { DELETE, GET, POST } from "../route";

const USER = { id: "11111111-1111-4111-8111-111111111111" } as User;
const KEY = "pxa_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("/api/account/proxima-api-key", () => {
    beforeEach(() => {
        mockGetUser.mockReset();
        mockHas.mockReset();
        mockMint.mockReset();
        mockRevoke.mockReset();
    });

    it("GET is 401 when signed out", async () => {
        mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

        const response = await GET();

        expect(response.status).toBe(401);
        expect(mockHas).not.toHaveBeenCalled();
    });

    it("GET returns presence only and never a key", async () => {
        mockGetUser.mockResolvedValue({ data: { user: USER }, error: null });
        mockHas.mockResolvedValue(true);

        const response = await GET();
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual({ present: true });
        expect(body).not.toHaveProperty("key");
    });

    it("POST returns the minted key once", async () => {
        mockGetUser.mockResolvedValue({ data: { user: USER }, error: null });
        mockMint.mockResolvedValue(KEY);

        const response = await POST();
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual({ key: KEY });
        expect(mockMint).toHaveBeenCalledWith(expect.anything(), USER.id);
    });

    it("DELETE revokes without echoing a key", async () => {
        mockGetUser.mockResolvedValue({ data: { user: USER }, error: null });
        mockRevoke.mockResolvedValue(true);

        const response = await DELETE();
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual({ present: false });
        expect(body).not.toHaveProperty("key");
        expect(mockRevoke).toHaveBeenCalledWith(expect.anything(), USER.id);
    });
});
