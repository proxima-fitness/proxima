import type { ReadonlyURLSearchParams } from "next/navigation";

export const BUILD_PROGRAM_PATH = "/build-program";

/** Router surface for setting search params (Next.js `useRouter()`). */
export interface IBuildProgramUrlRouter {
    replace: (href: string, options?: { scroll?: boolean }) => void;
}

/** Single navigation target for build-program (chat + search preserved together). */
export function buildBuildProgramHref(options: { chatId?: string; search?: string }): string {
    const params = new URLSearchParams();
    if (options.chatId) {
        params.set("chat", options.chatId);
    }
    if (options.search != null && options.search !== "") {
        params.set("search", options.search);
    }
    const qs = params.toString();
    return qs ? `${BUILD_PROGRAM_PATH}?${qs}` : BUILD_PROGRAM_PATH;
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
