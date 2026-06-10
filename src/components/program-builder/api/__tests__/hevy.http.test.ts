import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/api/index", () => ({
    supabase: {},
}));

import { defaultFetch, defaultPost, defaultPut, parsePostCustomExerciseBody, postHevyCustomExercise } from "../hevy";

describe("Hevy HTTP helpers", () => {
    const url = "https://api.hevyapp.com/v1/test";
    const apiKey = "test-api-key";
    const responseJson = { ok: true, id: "1" };

    beforeEach(() => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                new Response(JSON.stringify(responseJson), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                }),
            ),
        );
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("defaultFetch sends GET with api-key and accept", async () => {
        const data = await defaultFetch<typeof responseJson>(url, apiKey);

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(data).toEqual(responseJson);

        const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(call[0]).toBe(url);
        const init = call[1] as RequestInit;
        expect(init.method).toBe("GET");
        const headers = init.headers as Record<string, string>;
        expect(headers.accept).toBe("application/json");
        expect(headers["api-key"]).toBe(apiKey);
    });

    it("defaultPost sends POST with JSON body and headers", async () => {
        const body = { foo: "bar" };
        const data = await defaultPost<typeof responseJson, typeof body>(url, apiKey, body);

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(data).toEqual(responseJson);

        const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(call[0]).toBe(url);
        const init = call[1] as RequestInit;
        expect(init.method).toBe("POST");
        expect(init.body).toBe(JSON.stringify(body));
        const headers = init.headers as Record<string, string>;
        expect(headers["Content-Type"]).toBe("application/json");
        expect(headers.Accept).toBe("application/json");
        expect(headers["api-key"]).toBe(apiKey);
    });

    it("defaultPut sends PUT with JSON body and headers", async () => {
        const body = { routine: { title: "A" } };
        const data = await defaultPut<typeof responseJson, typeof body>(url, apiKey, body);

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(data).toEqual(responseJson);

        const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(call[0]).toBe(url);
        const init = call[1] as RequestInit;
        expect(init.method).toBe("PUT");
        expect(init.body).toBe(JSON.stringify(body));
        const headers = init.headers as Record<string, string>;
        expect(headers["Content-Type"]).toBe("application/json");
        expect(headers.Accept).toBe("application/json");
        expect(headers["api-key"]).toBe(apiKey);
    });
});

describe("parsePostCustomExerciseBody", () => {
    it("accepts JSON { id: number }", () => {
        expect(parsePostCustomExerciseBody('{"id":42}')).toEqual({ id: 42 });
    });

    it("accepts JSON { id: string (UUID) }", () => {
        expect(parsePostCustomExerciseBody('{"id":"c5a033f4-b123-4567-89ab-cdef01234567"}')).toEqual({
            id: "c5a033f4-b123-4567-89ab-cdef01234567",
        });
    });

    it("accepts a raw UUID string body (Hevy live response)", () => {
        expect(parsePostCustomExerciseBody("c5a033f4-b123-4567-89ab-cdef01234567")).toEqual({
            id: "c5a033f4-b123-4567-89ab-cdef01234567",
        });
    });

    it("accepts a quoted JSON UUID string", () => {
        expect(parsePostCustomExerciseBody('"c5a033f4-b123-4567-89ab-cdef01234567"')).toEqual({
            id: "c5a033f4-b123-4567-89ab-cdef01234567",
        });
    });

    it("throws on an empty body", () => {
        expect(() => parsePostCustomExerciseBody("")).toThrow("empty body");
    });

    it("throws on an unexpected body", () => {
        expect(() => parsePostCustomExerciseBody("not-a-uuid")).toThrow("Unexpected Hevy create-exercise response");
    });
});

describe("postHevyCustomExercise", () => {
    const apiKey = "test-key";
    const exercise: THevyPostExerciseTemplate = {
        title: "Test Exercise",
        exercise_type: "weight_reps",
        equipment_category: "barbell",
        muscle_group: "chest",
        other_muscles: [],
    };

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("resolves with { id } when the API returns a raw UUID body", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                new Response("c5a033f4-b123-4567-89ab-cdef01234567", {
                    status: 200,
                    headers: { "Content-Type": "text/html; charset=utf-8" },
                }),
            ),
        );

        const result = await postHevyCustomExercise(exercise, apiKey);
        expect(result).toEqual({ id: "c5a033f4-b123-4567-89ab-cdef01234567" });
    });

    it("resolves with { id } when the API returns JSON", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                new Response(JSON.stringify({ id: 99 }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                }),
            ),
        );

        const result = await postHevyCustomExercise(exercise, apiKey);
        expect(result).toEqual({ id: 99 });
    });

    it("throws with Hevy error message on non-2xx JSON error", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                new Response(JSON.stringify({ error: "exceeds-custom-exercise-limit" }), {
                    status: 403,
                    headers: { "Content-Type": "application/json" },
                }),
            ),
        );

        await expect(postHevyCustomExercise(exercise, apiKey)).rejects.toThrow(
            "exceeds-custom-exercise-limit",
        );
    });

    it("throws with status on non-2xx plain-text error", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                new Response("Unauthorized", {
                    status: 401,
                    headers: { "Content-Type": "text/plain" },
                }),
            ),
        );

        await expect(postHevyCustomExercise(exercise, apiKey)).rejects.toThrow("Status: 401");
    });
});
