import { describe, expect, it } from "vitest";
import {
    AUTH_LOGIN_PATH,
    AUTH_SIGN_UP_PATH,
    DEFAULT_SIGN_IN_RETURN,
    buildAuthLoginHref,
    buildAuthLoginHrefFromNext,
    buildAuthSignUpHrefFromNext,
    resolveSignInReturnFromLocation,
    sanitizeSignInReturn,
} from "../sign-in-return";

describe("sanitizeSignInReturn", () => {
    it("defaults missing/blank to /", () => {
        expect(sanitizeSignInReturn(null)).toBe(DEFAULT_SIGN_IN_RETURN);
        expect(sanitizeSignInReturn(undefined)).toBe(DEFAULT_SIGN_IN_RETURN);
        expect(sanitizeSignInReturn("")).toBe(DEFAULT_SIGN_IN_RETURN);
        expect(sanitizeSignInReturn("   ")).toBe(DEFAULT_SIGN_IN_RETURN);
    });

    it("allows relative app paths with query", () => {
        expect(sanitizeSignInReturn("/pricing")).toBe("/pricing");
        expect(sanitizeSignInReturn("/programs?tab=vault")).toBe(
            "/programs?tab=vault",
        );
    });

    it("rejects external and protocol-relative URLs", () => {
        expect(sanitizeSignInReturn("https://evil.com")).toBe("/");
        expect(sanitizeSignInReturn("//evil.com")).toBe("/");
        expect(sanitizeSignInReturn("/\\evil")).toBe("/");
        expect(sanitizeSignInReturn("/path://weird")).toBe("/");
    });

    it("rejects auth routes", () => {
        expect(sanitizeSignInReturn("/auth")).toBe("/");
        expect(sanitizeSignInReturn("/auth/login")).toBe("/");
        expect(sanitizeSignInReturn("/auth/sign-up?next=/pricing")).toBe("/");
    });

    it("allows /authenticate (not under /auth/)", () => {
        expect(sanitizeSignInReturn("/authenticate")).toBe("/authenticate");
    });
});

describe("resolveSignInReturnFromLocation", () => {
    it("returns path + search for normal pages", () => {
        expect(resolveSignInReturnFromLocation("/pricing")).toBe("/pricing");
        expect(
            resolveSignInReturnFromLocation("/workout/abc", "from=profile"),
        ).toBe("/workout/abc?from=profile");
    });

    it("forces resume=true on build-program and keeps other params", () => {
        expect(
            resolveSignInReturnFromLocation(
                "/build-program",
                "chat=abc&search=hi",
            ),
        ).toBe("/build-program?chat=abc&search=hi&resume=true");
        expect(resolveSignInReturnFromLocation("/build-program")).toBe(
            "/build-program?resume=true",
        );
        expect(
            resolveSignInReturnFromLocation("/build-program", "empty=true"),
        ).toBe("/build-program?resume=true");
        expect(
            resolveSignInReturnFromLocation(
                "/build-program",
                "?resume=true&edit=true",
            ),
        ).toBe("/build-program?resume=true&edit=true");
    });
});

describe("buildAuthLoginHref", () => {
    it("encodes next for current location", () => {
        expect(buildAuthLoginHref("/programs")).toBe(
            `${AUTH_LOGIN_PATH}?next=${encodeURIComponent("/programs")}`,
        );
        expect(buildAuthLoginHref("/build-program", "chat=x")).toBe(
            `${AUTH_LOGIN_PATH}?next=${encodeURIComponent("/build-program?chat=x&resume=true")}`,
        );
    });
});

describe("preserve next across auth forms", () => {
    it("buildAuthLoginHrefFromNext sanitizes then encodes", () => {
        expect(buildAuthLoginHrefFromNext("/pricing")).toBe(
            `${AUTH_LOGIN_PATH}?next=${encodeURIComponent("/pricing")}`,
        );
        expect(buildAuthLoginHrefFromNext("https://evil.com")).toBe(
            `${AUTH_LOGIN_PATH}?next=${encodeURIComponent("/")}`,
        );
    });

    it("buildAuthSignUpHrefFromNext sanitizes then encodes", () => {
        expect(buildAuthSignUpHrefFromNext("/vault")).toBe(
            `${AUTH_SIGN_UP_PATH}?next=${encodeURIComponent("/vault")}`,
        );
    });
});
