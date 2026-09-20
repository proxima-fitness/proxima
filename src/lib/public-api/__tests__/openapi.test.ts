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

function exercisesPost() {
    const path = Object.keys(PUBLIC_API_OPENAPI.paths).find((candidate) =>
        candidate.endsWith("/exercises"),
    );
    expect(path).toBeDefined();
    return {
        path: path!,
        post: PUBLIC_API_OPENAPI.paths[path as keyof typeof PUBLIC_API_OPENAPI.paths].post,
    };
}

describe("PUBLIC_API_OPENAPI", () => {
    it("is generated OpenAPI 3 for GET and POST exercises", () => {
        expect(PUBLIC_API_OPENAPI.openapi.startsWith("3.")).toBe(true);
        expect(PUBLIC_API_OPENAPI.info.title).toBe("Proxima Public API");
        const { get } = exercisesGet();
        const { post } = exercisesPost();
        expect(get).toBeDefined();
        expect(post).toBeDefined();
        expect(Object.keys(PUBLIC_API_OPENAPI.paths)).toHaveLength(1);
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

    it("requires a Proxima API key on POST and documents the Hevy-form create body", () => {
        const { post } = exercisesPost();
        expect(post.security).toEqual([{ proximaApiKey: [] }]);
        expect(post.requestBody).toBeDefined();
        const schema = PUBLIC_API_OPENAPI.components.schemas.PublicApiCreateCustomExercise;
        expect(schema.required).toEqual(
            expect.arrayContaining([
                "title",
                "exercise_type",
                "equipment",
                "primary_muscle_group",
            ]),
        );
        expect(schema.required).not.toContain("secondary_muscle_groups");
        expect(schema.properties).not.toHaveProperty("user_id");
        expect(
            PUBLIC_API_OPENAPI.components.schemas.PublicApiCreatedExercise.properties.id.format,
        ).toBe("uuid");
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
