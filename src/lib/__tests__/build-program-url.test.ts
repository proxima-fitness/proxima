import { describe, it, expect, vi } from "vitest";
import { buildBuildProgramHref, setBuildProgramChatSearchParam } from "../build-program-url";

describe("buildBuildProgramHref", () => {
    it("includes chat and search together", () => {
        const href = buildBuildProgramHref({
            chatId: "11111111-1111-4111-8111-111111111111",
            search: "build me a program",
        });
        expect(href).toContain("chat=11111111-1111-4111-8111-111111111111");
        expect(href).toContain("search=build+me+a+program");
    });

    it("supports search-only for anonymous", () => {
        expect(buildBuildProgramHref({ search: "hello" })).toBe("/build-program?search=hello");
    });
});

describe("setBuildProgramChatSearchParam", () => {
    it("calls router.replace with merged params and scroll false", () => {
        const replace = vi.fn();
        const searchParams = new URLSearchParams("empty=true&shareId=42") as unknown as import("next/navigation").ReadonlyURLSearchParams;

        setBuildProgramChatSearchParam(
            { replace },
            "/build-program",
            searchParams,
            "11111111-1111-4111-8111-111111111111",
        );

        expect(replace).toHaveBeenCalledWith(
            "/build-program?empty=true&shareId=42&chat=11111111-1111-4111-8111-111111111111",
            { scroll: false },
        );
    });
});
