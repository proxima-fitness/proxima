import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/api/index", () => ({
    supabase: {},
}));

import { defaultFetch, defaultPost, defaultPut } from "./hevy";

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
