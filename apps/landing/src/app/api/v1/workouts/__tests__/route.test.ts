// SPDX-License-Identifier: AGPL-3.0-only

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
    mockAdmin,
    mockGetAdmin,
    mockResolve,
    mockCreate,
    mockGet,
    mockReplace,
    mockDelete,
} = vi.hoisted(() => ({
    mockAdmin: { kind: "service-role" },
    mockGetAdmin: vi.fn(),
    mockResolve: vi.fn(),
    mockCreate: vi.fn(),
    mockGet: vi.fn(),
    mockReplace: vi.fn(),
    mockDelete: vi.fn(),
}));

vi.mock("@/api/supabase-admin", () => ({
    getServiceRoleClient: () => mockGetAdmin(),
}));

vi.mock("@/lib/public-api/proxima-api-key", () => ({
    resolveProximaApiKeyUserId: (...args: unknown[]) => mockResolve(...args),
}));

vi.mock("@/lib/public-api/public-api-workout", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/public-api/public-api-workout")>();
    return {
        ...actual,
        createPublicApiWorkout: (...args: unknown[]) => mockCreate(...args),
        getPublicApiWorkout: (...args: unknown[]) => mockGet(...args),
        replacePublicApiWorkout: (...args: unknown[]) => mockReplace(...args),
        deletePublicApiWorkout: (...args: unknown[]) => mockDelete(...args),
    };
});

import { POST } from "@/app/api/v1/workouts/route";
import { DELETE, GET, PUT } from "@/app/api/v1/workouts/[id]/route";
import {
    PUBLIC_API_IP_RATE_LIMIT_PER_MINUTE,
    PUBLIC_API_WRITE_RATE_LIMIT_PER_HOUR,
    resetPublicApiRateLimitersForTests,
    setPublicApiRateLimitersForTests,
} from "@/lib/public-api/public-api-rate-limit";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const WORKOUT_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const KEY = "pxa_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const BENCH_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const CREATE_BODY = {
    source: "strong",
    external_id: "strong-session-1",
    started_at: "2026-09-19T16:00:00.000Z",
    ended_at: "2026-09-19T17:00:00.000Z",
    title: "Push",
    exercises: [
        {
            canonical_exercise_id: BENCH_ID,
            sets: [{ set_type: "normal", weight_kg: 80, reps: 5 }],
        },
    ],
};

const REPLACE_BODY = {
    started_at: "2026-09-19T16:00:00.000Z",
    ended_at: "2026-09-19T17:30:00.000Z",
    title: "Push 2",
    exercises: [
        {
            canonical_exercise_id: BENCH_ID,
            sets: [{ set_type: "failure", reps: 12 }],
        },
    ],
};

const WORKOUT = {
    id: WORKOUT_ID,
    ...CREATE_BODY,
    description: null,
};

function authHeaders(): HeadersInit {
    return { Authorization: `Bearer ${KEY}` };
}

function postRequest(body: unknown, headers?: HeadersInit): Request {
    return new Request("http://localhost/api/v1/workouts", {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify(body),
    });
}

function idRequest(method: string, headers?: HeadersInit, body?: unknown): Request {
    return new Request(`http://localhost/api/v1/workouts/${WORKOUT_ID}`, {
        method,
        headers: body === undefined ? headers : { "content-type": "application/json", ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
}

function context() {
    return { params: Promise.resolve({ id: WORKOUT_ID }) };
}

function allowAllLimiters() {
    setPublicApiRateLimitersForTests({
        ip: {
            async limit() {
                return {
                    success: true,
                    remaining: PUBLIC_API_IP_RATE_LIMIT_PER_MINUTE - 1,
                    reset: Date.now() + 60_000,
                    limit: PUBLIC_API_IP_RATE_LIMIT_PER_MINUTE,
                };
            },
        },
        write: {
            async limit() {
                return {
                    success: true,
                    remaining: PUBLIC_API_WRITE_RATE_LIMIT_PER_HOUR - 1,
                    reset: Date.now() + 3_600_000,
                    limit: PUBLIC_API_WRITE_RATE_LIMIT_PER_HOUR,
                };
            },
        },
    });
}

beforeEach(() => {
    mockGetAdmin.mockReset();
    mockResolve.mockReset();
    mockCreate.mockReset();
    mockGet.mockReset();
    mockReplace.mockReset();
    mockDelete.mockReset();
    mockGetAdmin.mockReturnValue(mockAdmin);
    mockResolve.mockResolvedValue(USER_ID);
    mockCreate.mockResolvedValue({ status: "created", id: WORKOUT_ID });
    mockGet.mockResolvedValue(WORKOUT);
    mockReplace.mockResolvedValue({ status: "replaced", workout: WORKOUT });
    mockDelete.mockResolvedValue({ status: "deleted" });
    allowAllLimiters();
});

afterEach(() => {
    resetPublicApiRateLimitersForTests();
});

describe("POST /api/v1/workouts", () => {
    it("creates a history-only Workout for the key holder", async () => {
        const response = await POST(postRequest(CREATE_BODY, authHeaders()));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual({ id: WORKOUT_ID });
        expect(mockCreate).toHaveBeenCalledWith(
            mockAdmin,
            USER_ID,
            expect.objectContaining({
                source: "strong",
                external_id: "strong-session-1",
                title: "Push",
            }),
        );
    });

    it("returns the existing id on replay and 409 when the body differs", async () => {
        mockCreate.mockResolvedValueOnce({ status: "existing", id: WORKOUT_ID });
        const replay = await POST(postRequest(CREATE_BODY, authHeaders()));
        expect(replay.status).toBe(200);
        expect(await replay.json()).toEqual({ id: WORKOUT_ID });

        mockCreate.mockResolvedValueOnce({ status: "conflict" });
        const conflict = await POST(postRequest(CREATE_BODY, authHeaders()));
        expect(conflict.status).toBe(409);
        expect(await conflict.json()).toEqual({ error: "Workout already exists" });
    });

    it("is 422 for hevy and 401 when the key is missing", async () => {
        const hevy = await POST(postRequest({ ...CREATE_BODY, source: "hevy" }, authHeaders()));
        expect(hevy.status).toBe(422);
        expect(mockCreate).not.toHaveBeenCalled();

        mockResolve.mockClear();
        const missing = await POST(postRequest(CREATE_BODY));
        expect(missing.status).toBe(401);
        expect(mockResolve).not.toHaveBeenCalled();
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it("is 429 when the write window is exhausted", async () => {
        setPublicApiRateLimitersForTests({
            ip: {
                async limit() {
                    return {
                        success: true,
                        remaining: 59,
                        reset: Date.now() + 60_000,
                        limit: PUBLIC_API_IP_RATE_LIMIT_PER_MINUTE,
                    };
                },
            },
            write: {
                async limit() {
                    return {
                        success: false,
                        remaining: 0,
                        reset: Date.now() + 3_600_000,
                        limit: PUBLIC_API_WRITE_RATE_LIMIT_PER_HOUR,
                    };
                },
            },
        });

        const response = await POST(postRequest(CREATE_BODY, authHeaders()));
        expect(response.status).toBe(429);
        expect(mockCreate).not.toHaveBeenCalled();
    });
});

describe("GET|PUT|DELETE /api/v1/workouts/{id}", () => {
    it("reads, replaces, and deletes the key holder's Workout", async () => {
        const loaded = await GET(idRequest("GET", authHeaders()), context());
        expect(loaded.status).toBe(200);
        expect(await loaded.json()).toEqual(WORKOUT);
        expect(mockGet).toHaveBeenCalledWith(mockAdmin, USER_ID, WORKOUT_ID);

        const replaced = await PUT(idRequest("PUT", authHeaders(), REPLACE_BODY), context());
        expect(replaced.status).toBe(200);
        expect(mockReplace).toHaveBeenCalledWith(
            mockAdmin,
            USER_ID,
            WORKOUT_ID,
            expect.objectContaining({ title: "Push 2" }),
        );

        const deleted = await DELETE(idRequest("DELETE", authHeaders()), context());
        expect(deleted.status).toBe(204);
        expect(mockDelete).toHaveBeenCalledWith(mockAdmin, USER_ID, WORKOUT_ID);
    });

    it("is 404 when the Workout is missing or owned by someone else", async () => {
        mockGet.mockResolvedValue(null);
        const missing = await GET(idRequest("GET", authHeaders()), context());
        expect(missing.status).toBe(404);

        mockDelete.mockResolvedValue({ status: "not_found" });
        const other = await DELETE(idRequest("DELETE", authHeaders()), context());
        expect(other.status).toBe(404);
    });

    it("is 503 when Redis cannot run, including GET-by-id", async () => {
        setPublicApiRateLimitersForTests({ ip: null, write: null });

        const response = await GET(idRequest("GET", authHeaders()), context());
        expect(response.status).toBe(503);
        expect(mockGet).not.toHaveBeenCalled();
    });
});
