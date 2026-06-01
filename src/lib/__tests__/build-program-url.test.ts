import { describe, it, expect, vi } from "vitest";
import {
    applyBuildProgramMintUrlUpdate,
    buildBuildProgramHref,
    setBuildProgramChatSearchParam,
    stripSearchFromBuildProgramUrl,
} from "../build-program-url";

describe("buildBuildProgramHref", () => {
    it("includes chat and search together", () => {
        const href = buildBuildProgramHref({
            chatId: "11111111-1111-4111-8111-111111111111",
            search: "build me a program",
        });
        expect(href).toContain("chat=11111111-1111-4111-8111-111111111111");
        expect(href).toContain("search=build+me+a+program");
    });

    it("defaults to empty=true when no chat or search", () => {
        expect(buildBuildProgramHref()).toBe("/build-program?empty=true");
    });

    it("search-only anon href has no empty=true (A1)", () => {
        const href = buildBuildProgramHref({ search: "build me a 4 day split" });
        expect(href).toBe("/build-program?search=build+me+a+4+day+split");
        expect(href).not.toContain("empty=true");
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

describe("applyBuildProgramMintUrlUpdate", () => {
    it("sets chat and strips search in one replace (A9/A10)", () => {
        const replace = vi.fn();
        const searchParams = new URLSearchParams(
            "search=fix+my+program&shareId=42",
        ) as unknown as import("next/navigation").ReadonlyURLSearchParams;

        applyBuildProgramMintUrlUpdate(
            { replace },
            "/build-program",
            searchParams,
            "11111111-1111-4111-8111-111111111111",
            { stripSearch: true },
        );

        expect(replace).toHaveBeenCalledTimes(1);
        expect(replace).toHaveBeenCalledWith(
            "/build-program?shareId=42&chat=11111111-1111-4111-8111-111111111111",
            { scroll: false },
        );
    });

    it("preserves resume and empty when stripping search", () => {
        const replace = vi.fn();
        const searchParams = new URLSearchParams(
            "search=continue&resume=true&empty=true",
        ) as unknown as import("next/navigation").ReadonlyURLSearchParams;

        applyBuildProgramMintUrlUpdate(
            { replace },
            "/build-program",
            searchParams,
            "11111111-1111-4111-8111-111111111111",
            { stripSearch: true },
        );

        expect(replace).toHaveBeenCalledWith(
            "/build-program?resume=true&empty=true&chat=11111111-1111-4111-8111-111111111111",
            { scroll: false },
        );
    });
});

describe("stripSearchFromBuildProgramUrl", () => {
    it("removes search param while preserving others", () => {
        const replace = vi.fn();
        const searchParams = new URLSearchParams(
            "search=hello&chat=11111111-1111-4111-8111-111111111111&empty=true",
        ) as unknown as import("next/navigation").ReadonlyURLSearchParams;

        stripSearchFromBuildProgramUrl({ replace }, "/build-program", searchParams);

        expect(replace).toHaveBeenCalledWith(
            "/build-program?chat=11111111-1111-4111-8111-111111111111&empty=true",
            { scroll: false },
        );
    });
});
