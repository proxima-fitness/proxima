import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAdmin, mockGetAdmin, mockResolve, mockList, mockCreate } = vi.hoisted(() => ({
    mockAdmin: { kind: "service-role" },
    mockGetAdmin: vi.fn(),
    mockResolve: vi.fn(),
    mockList: vi.fn(),
    mockCreate: vi.fn(),
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

vi.mock("@/lib/public-api/custom-exercise", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/public-api/custom-exercise")>();
    return {
        ...actual,
        createPublicApiCustomExercise: (...args: unknown[]) => mockCreate(...args),
    };
});

import { GET, POST } from "@/app/api/v1/exercises/route";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const KEY = "pxa_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const CREATED_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

const CREATE_BODY = {
    title: "Owner Custom Curl",
    exercise_type: "weight_reps",
    equipment: "dumbbell",
    primary_muscle_group: "biceps",
};

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

function postRequest(body: unknown, headers?: HeadersInit): Request {
    return new Request("http://localhost/api/v1/exercises", {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify(body),
    });
}

beforeEach(() => {
    mockGetAdmin.mockReset();
    mockResolve.mockReset();
    mockList.mockReset();
    mockCreate.mockReset();
    mockGetAdmin.mockReturnValue(mockAdmin);
    mockList.mockResolvedValue(PAGE);
    mockCreate.mockResolvedValue(CREATED_ID);
});

describe("GET /api/v1/exercises", () => {
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

    it("with a valid key lists that user's Custom exercises too", async () => {
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

describe("POST /api/v1/exercises", () => {
    it("creates a Custom exercise for the key holder", async () => {
        mockResolve.mockResolvedValue(USER_ID);

        const response = await POST(
            postRequest(CREATE_BODY, { Authorization: `Bearer ${KEY}` }),
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual({ id: CREATED_ID });
        expect(mockResolve).toHaveBeenCalledWith(mockAdmin, `Bearer ${KEY}`);
        expect(mockCreate).toHaveBeenCalledWith(mockAdmin, USER_ID, {
            title: "Owner Custom Curl",
            exercise_type: "weight_reps",
            equipment: "dumbbell",
            primary_muscle_group: "biceps",
            secondary_muscle_groups: null,
        });
    });

    it("returns the existing id when mint finds a duplicate title", async () => {
        mockResolve.mockResolvedValue(USER_ID);
        mockCreate.mockResolvedValue(CREATED_ID);

        const response = await POST(
            postRequest(
                { ...CREATE_BODY, title: "OWNER CUSTOM CURL" },
                { Authorization: `Bearer ${KEY}` },
            ),
        );

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ id: CREATED_ID });
    });

    it("is 401 when the Proxima API key is missing or does not resolve", async () => {
        const missing = await POST(postRequest(CREATE_BODY));
        expect(missing.status).toBe(401);
        expect(await missing.json()).toEqual({ error: "Unauthorized" });
        expect(mockResolve).not.toHaveBeenCalled();
        expect(mockCreate).not.toHaveBeenCalled();

        mockResolve.mockResolvedValue(null);
        const invalid = await POST(
            postRequest(CREATE_BODY, { Authorization: `Bearer ${KEY}` }),
        );
        expect(invalid.status).toBe(401);
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it("is 422 when the body fails the Hevy create-form contract", async () => {
        mockResolve.mockResolvedValue(USER_ID);

        const response = await POST(
            postRequest(
                { title: "Curl", exercise_type: "warmup" },
                { Authorization: `Bearer ${KEY}` },
            ),
        );
        const body = await response.json();

        expect(response.status).toBe(422);
        expect(body).toEqual({ error: expect.any(String) });
        expect(mockCreate).not.toHaveBeenCalled();
    });
});

