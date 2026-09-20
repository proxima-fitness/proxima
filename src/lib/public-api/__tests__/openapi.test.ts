import { describe, expect, it } from "vitest";

import { PUBLIC_API_OPENAPI } from "@/lib/public-api/openapi";
import { GET } from "@/app/openapi.json/route";

function exercisesGet() {
    const path = Object.keys(PUBLIC_API_OPENAPI.paths).find((candidate) =>
        candidate.endsWith("/exercises"),
    );
    expect(path).toBeDefined();
    return {
        path: path!,
        get: PUBLIC_API_OPENAPI.paths[path as keyof typeof PUBLIC_API_OPENAPI.paths].get,
    };
}

describe("PUBLIC_API_OPENAPI", () => {
    it("is generated OpenAPI 3 for GET exercises and not POST", () => {
        expect(PUBLIC_API_OPENAPI.openapi.startsWith("3.")).toBe(true);
        expect(PUBLIC_API_OPENAPI.info.title).toBe("Proxima Public API");
        const { get } = exercisesGet();
        expect(get).toBeDefined();
        expect(Object.keys(PUBLIC_API_OPENAPI.paths)).toHaveLength(1);
        expect(PUBLIC_API_OPENAPI.paths["/exercises"]).not.toHaveProperty("post");
    });

    it("lets Try It list exercises with no key and never documents user_id", () => {
        const { path, get } = exercisesGet();
        expect("security" in get ? get.security : [{}]).toEqual([{}]);
        expect(get.parameters?.map((parameter) => parameter.name)).toEqual([
            "page",
            "page_size",
        ]);
        expect(
            PUBLIC_API_OPENAPI.components.schemas.PublicApiExercise.properties,
        ).not.toHaveProperty("user_id");
        expect(PUBLIC_API_OPENAPI.components.securitySchemes.proximaApiKey).toMatchObject({
            type: "http",
            scheme: "bearer",
        });
        expect(`${PUBLIC_API_OPENAPI.servers[0].url}${path}`).toBe("/api/v1/exercises");
    });
});

describe("GET /openapi.json", () => {
    it("serves the generated Public API document", async () => {
        const response = await GET();
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toContain("application/json");
        expect(body).toEqual(PUBLIC_API_OPENAPI);
    });
});
