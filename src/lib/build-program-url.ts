import type { ReadonlyURLSearchParams } from "next/navigation";

export const BUILD_PROGRAM_PATH = "/build-program";

/** Router surface for setting search params (Next.js `useRouter()`). */
export interface IBuildProgramUrlRouter {
    replace: (href: string, options?: { scroll?: boolean }) => void;
}

export const WORKOUT_DETAIL_FROM_BUILD_PROGRAM = "build-program";

/** Single navigation target for build-program (chat + search preserved together). */
export function buildBuildProgramHref(
    options: { chatId?: string; search?: string; resume?: boolean } = {},
): string {
    const params = new URLSearchParams();
    if (options.chatId) {
        params.set("chat", options.chatId);
    }
    if (options.search != null && options.search !== "") {
        params.set("search", options.search);
    }
    if (options.resume) {
        params.set("resume", "true");
    }
    const hasChatOrSearch = Boolean(options.chatId || (options.search != null && options.search !== ""));
    if (!hasChatOrSearch) {
        params.set("empty", "true");
    }
    const qs = params.toString();
    return qs ? `${BUILD_PROGRAM_PATH}?${qs}` : `${BUILD_PROGRAM_PATH}?empty=true`;
}

/**
 * Remove `search` from the current build-program URL (prevents reload double auto-send).
 */
export function stripSearchFromBuildProgramUrl(
    router: IBuildProgramUrlRouter,
    pathname: string,
    searchParams: ReadonlyURLSearchParams,
): void {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("search");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
}

/**
 * Set `chat` via Next.js `router.replace` (merges into current params; `scroll: false`).
 * Call after `sendMessage` starts so `useSearchParams` stays in sync without a full navigation.
 */
export function setBuildProgramChatSearchParam(
    router: IBuildProgramUrlRouter,
    pathname: string,
    searchParams: ReadonlyURLSearchParams,
    chatId: string,
): void {
    const params = new URLSearchParams(searchParams.toString());
    params.set("chat", chatId);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
}

/**
 * Session mint: set `chat` and strip `search` in one replace (A9/A10 flash).
 */
export function applyBuildProgramMintUrlUpdate(
    router: IBuildProgramUrlRouter,
    pathname: string,
    searchParams: ReadonlyURLSearchParams,
    chatId: string,
    options: { stripSearch?: boolean } = {},
): void {
    const params = new URLSearchParams(searchParams.toString());
    params.set("chat", chatId);
    if (options.stripSearch) {
        params.delete("search");
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
}

/** Build-program href from serialized return query string; always adds resume=true. */
export function resolveBuildProgramReturnHref(returnQs: string): string {
    const params = new URLSearchParams(returnQs);
    params.set("resume", "true");
    const qs = params.toString();
    return qs ? `${BUILD_PROGRAM_PATH}?${qs}` : `${BUILD_PROGRAM_PATH}?resume=true`;
}

/** Workout detail href; adds return context when opened from program builder. */
export function buildWorkoutDetailHref(
    workoutId: string,
    options: { returnQs?: string } = {},
): string {
    const base = `/workout/${workoutId}`;
    const returnQs = options.returnQs?.trim();
    if (!returnQs) {
        return base;
    }
    const params = new URLSearchParams({
        from: WORKOUT_DETAIL_FROM_BUILD_PROGRAM,
        returnQs,
    });
    return `${base}?${params.toString()}`;
}

export type TWorkoutDetailBackLink = { href: string; label: string };

/** Back link for workout detail — program builder when return context present, else profile. */
export function resolveWorkoutDetailBackLink(options: {
    from?: string | null;
    returnQs?: string | null;
    /** Legacy links that only passed chat without full returnQs. */
    chat?: string | null;
}): TWorkoutDetailBackLink {
    if (options.from !== WORKOUT_DETAIL_FROM_BUILD_PROGRAM) {
        return { href: "/profile", label: "Back to profile" };
    }

    const returnQs = options.returnQs?.trim();
    if (returnQs) {
        return {
            href: resolveBuildProgramReturnHref(returnQs),
            label: "Back to Program Builder",
        };
    }

    const chatId = options.chat?.trim();
    if (chatId) {
        return {
            href: buildBuildProgramHref({ chatId, resume: true }),
            label: "Back to Program Builder",
        };
    }

    return { href: "/profile", label: "Back to profile" };
}
