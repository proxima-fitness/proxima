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

type TOpenApiOperation = {
    parameters?: Array<{ in: string; name: string }>;
    security?: unknown;
};

type TOpenApiPath = {
    delete?: TOpenApiOperation;
    get?: TOpenApiOperation;
    post?: TOpenApiOperation;
    put?: TOpenApiOperation;
};

type TOpenApiSchema = {
    properties?: Record<string, unknown>;
    required?: string[];
};

function pathItem(matcher: (path: string) => boolean): TOpenApiPath {
    const path = Object.keys(PUBLIC_API_OPENAPI.paths).find(matcher);
    expect(path).toBeDefined();
    return PUBLIC_API_OPENAPI.paths[
        path as keyof typeof PUBLIC_API_OPENAPI.paths
    ] as TOpenApiPath;
}

function schema(name: string): TOpenApiSchema {
    return (
        PUBLIC_API_OPENAPI.components.schemas as Record<string, TOpenApiSchema>
    )[name];
}

describe("PUBLIC_API_OPENAPI", () => {
    it("is generated OpenAPI 3 for exercises and workouts", () => {
        expect(PUBLIC_API_OPENAPI.openapi.startsWith("3.")).toBe(true);
        expect(PUBLIC_API_OPENAPI.info.title).toBe("Proxima Public API");
        const { get } = exercisesGet();
        const { post } = exercisesPost();
        expect(get).toBeDefined();
        expect(post).toBeDefined();
        expect(
            pathItem((candidate) => candidate.endsWith("/workouts") && !candidate.includes("{"))
                .post,
        ).toBeDefined();
        const byId = pathItem((candidate) => candidate.includes("/workouts/{"));
        expect(byId.get).toBeDefined();
        expect(byId.put).toBeDefined();
        expect(byId.delete).toBeDefined();
        expect(Object.keys(PUBLIC_API_OPENAPI.paths)).toHaveLength(3);
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

    it("requires a Proxima API key on Workout writes and documents first-write-wins", () => {
        const collection = pathItem(
            (candidate) => candidate.endsWith("/workouts") && !candidate.includes("{"),
        );
        const byId = pathItem((candidate) => candidate.includes("/workouts/{"));
        expect(collection.post?.security).toEqual([{ proximaApiKey: [] }]);
        expect(byId.get?.security).toEqual([{ proximaApiKey: [] }]);
        expect(byId.put?.security).toEqual([{ proximaApiKey: [] }]);
        expect(byId.delete?.security).toEqual([{ proximaApiKey: [] }]);
        expect(byId.get?.parameters).toEqual(
            expect.arrayContaining([expect.objectContaining({ in: "path", name: "id" })]),
        );
        expect(schema("PublicApiCreateWorkout").required).toEqual(
            expect.arrayContaining([
                "source",
                "external_id",
                "started_at",
                "ended_at",
                "title",
                "exercises",
            ]),
        );
        expect(schema("PublicApiReplaceWorkout").properties).not.toHaveProperty("source");
        expect(schema("PublicApiReplaceWorkout").properties).not.toHaveProperty("external_id");
        expect(schema("PublicApiCreateWorkout").properties).not.toHaveProperty("routine_id");
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
