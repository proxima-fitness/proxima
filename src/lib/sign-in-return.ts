/**
 * @module sign-in-return
 *
 * **Sign-in return** helpers (ADR 0001): sanitize post-sign-in destinations and
 * build `/auth/login?next=…` from the page the user left. Builder locations
 * always force `resume=true` via `resolveBuildProgramReturnHref`.
 *
 * Depends on: `@/lib/build-program-url`
 * Used by: login/oauth routes, login CTAs, logout → login
 */

import {
    BUILD_PROGRAM_PATH,
    resolveBuildProgramReturnHref,
} from "@/lib/build-program-url";

export const DEFAULT_SIGN_IN_RETURN = "/";
export const AUTH_LOGIN_PATH = "/auth/login";
export const AUTH_SIGN_UP_PATH = "/auth/sign-up";

/**
 * Allow only same-app relative paths. Rejects external URLs, protocol-relative
 * (`//…`), backslashes, and `/auth/*` (avoids auth loops). Invalid → `/`.
 */
export function sanitizeSignInReturn(
    candidate: string | null | undefined,
): string {
    if (candidate == null) {
        return DEFAULT_SIGN_IN_RETURN;
    }
    const trimmed = candidate.trim();
    if (
        !trimmed.startsWith("/") ||
        trimmed.startsWith("//") ||
        trimmed.includes("\\") ||
        trimmed.includes("://")
    ) {
        return DEFAULT_SIGN_IN_RETURN;
    }
    const pathOnly = trimmed.split(/[?#]/, 1)[0] ?? trimmed;
    if (pathOnly === "/auth" || pathOnly.startsWith("/auth/")) {
        return DEFAULT_SIGN_IN_RETURN;
    }
    return trimmed;
}

function searchToQueryString(
    search: string | { toString(): string } = "",
): string {
    const raw = typeof search === "string" ? search : search.toString();
    return raw.replace(/^\?/, "");
}

/**
 * Resolve **Sign-in return** from the current location. On `/build-program`,
 * forces `resume=true` while keeping other query params.
 */
export function resolveSignInReturnFromLocation(
    pathname: string | null | undefined,
    search: string | { toString(): string } = "",
): string {
    const path = pathname?.trim() || DEFAULT_SIGN_IN_RETURN;
    const qs = searchToQueryString(search);
    if (path === BUILD_PROGRAM_PATH) {
        return sanitizeSignInReturn(resolveBuildProgramReturnHref(qs));
    }
    const candidate = qs ? `${path}?${qs}` : path;
    return sanitizeSignInReturn(candidate);
}

/** `/auth/login?next=…` for the current page (builder gets resume enrichment). */
export function buildAuthLoginHref(
    pathname: string | null | undefined,
    search: string | { toString(): string } = "",
): string {
    const next = resolveSignInReturnFromLocation(pathname, search);
    return `${AUTH_LOGIN_PATH}?next=${encodeURIComponent(next)}`;
}

/** `/auth/login?next=…` preserving an existing return (e.g. sign-up → login). */
export function buildAuthLoginHrefFromNext(
    next: string | null | undefined,
): string {
    const safe = sanitizeSignInReturn(next);
    return `${AUTH_LOGIN_PATH}?next=${encodeURIComponent(safe)}`;
}

/** `/auth/sign-up?next=…` preserving return from login. */
export function buildAuthSignUpHrefFromNext(
    next: string | null | undefined,
): string {
    const safe = sanitizeSignInReturn(next);
    return `${AUTH_SIGN_UP_PATH}?next=${encodeURIComponent(safe)}`;
}
