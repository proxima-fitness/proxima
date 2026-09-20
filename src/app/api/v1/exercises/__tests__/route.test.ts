import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAdmin, mockGetAdmin, mockResolve, mockList } = vi.hoisted(() => ({
    mockAdmin: { kind: "service-role" },
    mockGetAdmin: vi.fn(),
    mockResolve: vi.fn(),
    mockList: vi.fn(),
}));

vi.mock("@/api/supabase-admin", () => ({
    getServiceRoleClient: () => mockGetAdmin(),
}));

vi.mock("@/lib/public-api/proxima-api-key", () => ({
    resolveProximaApiKeyUserId: (...args: unknown[]) => mockResolve(...args),
}));

vi.mock("@/lib/public-api/canonical-exercises", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/public-api/canonical-exercises")>();
    return {
        ...actual,
        listPublicApiExercises: (...args: unknown[]) => mockList(...args),
    };
});

import { GET } from "@/app/api/v1/exercises/route";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const KEY = "pxa_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

const PAGE = {
    exercises: [
        {
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            title: "Bench Press",
            exercise_type: "weight_reps",
            equipment: "barbell",
            primary_muscle_group: "chest",
            secondary_muscle_groups: ["triceps"],
        },
    ],
    page: 1,
    page_size: 50,
    has_more: false,
};

function request(path = "/api/v1/exercises", headers?: HeadersInit): Request {
    return new Request(`http://localhost${path}`, { headers });
}

describe("GET /api/v1/exercises", () => {
    beforeEach(() => {
        mockGetAdmin.mockReset();
        mockResolve.mockReset();
        mockList.mockReset();
        mockGetAdmin.mockReturnValue(mockAdmin);
        mockList.mockResolvedValue(PAGE);
    });

    it("lists globals with no key and never echoes user_id", async () => {
        const response = await GET(request());
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual(PAGE);
        expect(JSON.stringify(body)).not.toContain("user_id");
        expect(mockResolve).not.toHaveBeenCalled();
        expect(mockList).toHaveBeenCalledWith(mockAdmin, {
            userId: null,
            page: 1,
            pageSize: 50,
        });
    });

    it("with a valid key lists that user's Custom movements too", async () => {
        mockResolve.mockResolvedValue(USER_ID);

        const response = await GET(
            request("/api/v1/exercises", { Authorization: `Bearer ${KEY}` }),
        );

        expect(response.status).toBe(200);
        expect(mockResolve).toHaveBeenCalledWith(mockAdmin, `Bearer ${KEY}`);
        expect(mockList).toHaveBeenCalledWith(mockAdmin, {
            userId: USER_ID,
            page: 1,
            pageSize: 50,
        });
    });

    it("is 401 when Authorization is present but the key does not resolve", async () => {
        mockResolve.mockResolvedValue(null);

        const response = await GET(
            request("/api/v1/exercises", { Authorization: `Bearer ${KEY}` }),
        );

        expect(response.status).toBe(401);
        expect(mockList).not.toHaveBeenCalled();
    });

    it("forwards page and page_size", async () => {
        const response = await GET(request("/api/v1/exercises?page=2&page_size=10"));

        expect(response.status).toBe(200);
        expect(mockList).toHaveBeenCalledWith(mockAdmin, {
            userId: null,
            page: 2,
            pageSize: 10,
        });
    });

    it("is 400 for an invalid page", async () => {
        const response = await GET(request("/api/v1/exercises?page=0"));
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body).toEqual({ error: "page must be a positive integer" });
        expect(mockList).not.toHaveBeenCalled();
    });
});
