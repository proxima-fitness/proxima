import type { User } from "@supabase/supabase-js";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { isValidShareId } from "./initial-prompt";

export type THistoryBootstrap =
    | "db-wait"
    | "db-ready"
    | "anonymous-local"
    | "sign-in-migration-local"
    | "empty";
export type TAutoSendPolicy = "never" | "when-search-ready" | "deferred-until-share-loaded";
export type TShellStability = "sidebar-resume-remount" | "send-path-stable";
export type TSessionOnFirstSend = "mint-and-insert" | "ensure-existing" | "anonymous-only";

export interface IBuildProgramArrivalParams {
    urlChatId: string;
    search: string;
    shareId: string;
    empty: string;
    resume: string;
}

export interface IChatEntryPlan {
    enableHistoryFetch: boolean;
    historyBootstrap: THistoryBootstrap;
    autoSend: TAutoSendPolicy;
    shellStability: TShellStability;
    sessionOnFirstSend: TSessionOnFirstSend;
}

export interface IResolveChatEntryPlanInput {
    user: User | null;
    chatId: string;
    search: string;
    shareId: string;
    sidebarRowKnown: boolean;
    sendPathConfirmed: boolean;
    /** Sidebar / pre-mint arrival - not session mint. */
    chatNavigationArrival: boolean;
    sharedProgramLoadAttempted: boolean;
    hevyProgramLength: number;
    chatHistorySuccess: boolean;
    /** Count of messages in `CHAT_MESSAGES_KEY` (caller reads localStorage each render). */
    anonLocalMessageCount: number;
    /** Sidebar New Chat (`?empty=true` without `?chat=`) - skip sign-in migration bootstrap. */
    explicitNewChat: boolean;
}

export interface IBuildShellKeyContext {
    chatId: string;
    user: User | null;
    chatHistorySuccess: boolean;
    /** User arrived with `?chat=` or switched sidebar chats - not session mint mid-send. */
    chatNavigationArrival: boolean;
}

/** True when `?chat=` was present at first paint (sidebar or home pre-mint). */
export function isChatNavigationArrivalAtMount(urlChatId: string): boolean {
    return Boolean(urlChatId);
}

export interface IChatNavigationLatch {
    /** Sidebar / pre-mint arrival - not session mint. */
    latched: boolean;
    prevChatId: string;
    /** Set after New Chat reset; cleared on sidebar latch or session mint. */
    pendingSidebarPick?: boolean;
}

export function createChatNavigationLatch(urlChatIdAtMount: string): IChatNavigationLatch {
    return {
        latched: isChatNavigationArrivalAtMount(urlChatIdAtMount),
        prevChatId: urlChatIdAtMount,
        pendingSidebarPick: false,
    };
}

/** True on sidebar New Chat (`?empty=true` without `?chat=`). */
export function isExplicitNewChatArrival(params: { empty: string; urlChatId: string }): boolean {
    return params.empty === "true" && !params.urlChatId;
}

/** Clear stale sidebar latch so session mint does not remount the shell. */
export function resetChatNavigationLatchForArrival(
    params: { empty: string; urlChatId: string },
    latch: IChatNavigationLatch,
): IChatNavigationLatch {
    if (isExplicitNewChatArrival(params)) {
        return { latched: false, prevChatId: "", pendingSidebarPick: true };
    }
    return latch;
}

export interface IAdvanceChatNavigationLatchOptions {
    /** Chat id appears in sidebar list - distinguishes sidebar pick from session mint. */
    sidebarRowKnown?: boolean;
    /** Send-path insert confirmed - session mint / sign-in migration must not latch. */
    sendPathConfirmed?: boolean;
    /** `?empty=true` still in URL - session mint on New Chat page, not sidebar navigation. */
    hasEmptyParam?: boolean;
}

/** Derive during render; assign `next` back to a ref (no effect). */
export function advanceChatNavigationLatch(
    chatId: string,
    latch: IChatNavigationLatch,
    options?: IAdvanceChatNavigationLatchOptions,
): { chatNavigationArrival: boolean; next: IChatNavigationLatch } {
    let latched = latch.latched;
    let pendingSidebarPick = latch.pendingSidebarPick ?? false;

    if (pendingSidebarPick && chatId && options?.hasEmptyParam) {
        pendingSidebarPick = false;
    }

    if (!latched && chatId) {
        if (latch.prevChatId && latch.prevChatId !== chatId) {
            latched = true;
        } else if (!latch.prevChatId && options?.sidebarRowKnown && !options?.sendPathConfirmed) {
            // New Chat reset clears prevChatId; first sidebar pick must still latch.
            latched = true;
        } else if (
            pendingSidebarPick &&
            options?.sidebarRowKnown &&
            !options?.hasEmptyParam &&
            latch.prevChatId === chatId
        ) {
            // Sidebar list loaded after URL already had ?chat= (post-New Chat pick).
            latched = true;
        }
    }

    if (latched) {
        pendingSidebarPick = false;
    }

    return {
        chatNavigationArrival: latched,
        next: { latched, prevChatId: chatId, pendingSidebarPick },
    };
}

export interface IResolveInitialMessagesContext {
    chatHistoryData: TChatMessage[][] | TChatMessage[] | null | undefined;
    anonymousMessages: TChatMessage[];
}

export interface IShouldRunAutoSendContext {
    search: string;
    shareId: string;
    hevyProgramLength: number;
    sharedProgramLoadAttempted: boolean;
    /** Trimmed `search` param already consumed by D1 in this shell lifetime. */
    lastHandledSearch: string;
    /** Sign-in migration insert in flight - D1 must wait. */
    signInMigrationPending?: boolean;
}

export function parseBuildProgramArrival(
    searchParams: ReadonlyURLSearchParams | URLSearchParams,
): IBuildProgramArrivalParams {
    return {
        urlChatId: searchParams.get("chat") ?? "",
        search: searchParams.get("search") ?? "",
        shareId: searchParams.get("shareId") ?? "",
        empty: searchParams.get("empty") ?? "",
        resume: searchParams.get("resume") ?? "",
    };
}

export function isBareBuildProgramArrival(params: IBuildProgramArrivalParams): boolean {
    return (
        !params.urlChatId &&
        !params.search &&
        !params.shareId &&
        !params.resume &&
        !params.empty
    );
}

/**
 * A0 bare `/build-program` → `?empty=true`. Skip when URL became bare after D1 stripped `search`.
 */
export function shouldRedirectBareBuildProgramToEmpty(
    isBareArrival: boolean,
    sawNonBareArrival: boolean,
): boolean {
    return isBareArrival && !sawNonBareArrival;
}

export function resolveSidebarRowKnown(
    chatId: string,
    chatIds: { id: string }[] | null | undefined,
): boolean {
    return Boolean(chatId && chatIds?.some((chat) => chat.id === chatId));
}

export function resolveSendPathConfirmed(chatId: string, sessionInsertConfirmed: boolean): boolean {
    return Boolean(chatId && sessionInsertConfirmed);
}

/** Chat id for persistence - URL first, mint ref fallback until `?chat=` propagates. */
export function resolvePersistChatId(urlChatId: string, pendingMintChatId: string): string {
    return urlChatId || pendingMintChatId;
}

/** Export/save paths: registered getter (URL + mint ref) when set, else `?chat=` from URL. */
export function resolveExportPersistChatId(
    fromRegisteredGetter: (() => string) | null | undefined,
    urlChatId: string,
): string {
    return fromRegisteredGetter?.() || urlChatId;
}

export function resolveChatHistoryFetchEnabled(input: {
    user: User | null;
    chatId: string;
    sidebarRowKnown: boolean;
    sendPathConfirmed: boolean;
    chatNavigationArrival: boolean;
}): boolean {
    return Boolean(
        input.user &&
            input.chatId &&
            (input.sendPathConfirmed ||
                (input.chatNavigationArrival && input.sidebarRowKnown)),
    );
}

export function resolveChatEntryPlan(input: IResolveChatEntryPlanInput): IChatEntryPlan {
    const {
        user,
        chatId,
        search,
        shareId,
        sidebarRowKnown,
        sendPathConfirmed,
        chatNavigationArrival,
        sharedProgramLoadAttempted,
        hevyProgramLength,
        chatHistorySuccess,
        anonLocalMessageCount,
        explicitNewChat,
    } = input;

    const enableHistoryFetch = resolveChatHistoryFetchEnabled({
        user,
        chatId,
        sidebarRowKnown,
        sendPathConfirmed,
        chatNavigationArrival,
    });

    // Remount only for sidebar chat navigation - not when mint adds ?chat= mid-send.
    const shellStability: TShellStability =
        user &&
        chatId &&
        chatNavigationArrival &&
        sidebarRowKnown &&
        !sendPathConfirmed &&
        !chatHistorySuccess
            ? "sidebar-resume-remount"
            : "send-path-stable";

    let historyBootstrap: THistoryBootstrap;
    if (enableHistoryFetch) {
        historyBootstrap = chatHistorySuccess ? "db-ready" : "db-wait";
    } else if (
        !chatId &&
        user &&
        anonLocalMessageCount > 0 &&
        !sendPathConfirmed &&
        !explicitNewChat
    ) {
        historyBootstrap = "sign-in-migration-local";
    } else if (!chatId && !user) {
        // Home prompt (?search=) needs a fresh thread; restore anon local only for bare new chat.
        historyBootstrap = search.trim() ? "empty" : "anonymous-local";
    } else {
        historyBootstrap = "empty";
    }

    let autoSend: TAutoSendPolicy;
    if (chatId && !search.trim()) {
        autoSend = "never";
    } else if (search.trim()) {
        autoSend =
            isValidShareId(shareId) && hevyProgramLength === 0 && !sharedProgramLoadAttempted
                ? "deferred-until-share-loaded"
                : "when-search-ready";
    } else {
        autoSend = "never";
    }

    let sessionOnFirstSend: TSessionOnFirstSend;
    if (!user) {
        sessionOnFirstSend = "anonymous-only";
    } else if (chatId && (sidebarRowKnown || sendPathConfirmed)) {
        sessionOnFirstSend = "ensure-existing";
    } else {
        sessionOnFirstSend = "mint-and-insert";
    }

    return {
        enableHistoryFetch,
        historyBootstrap,
        autoSend,
        shellStability,
        sessionOnFirstSend,
    };
}

export function buildShellKey(plan: IChatEntryPlan, ctx: IBuildShellKeyContext): string {
    if (ctx.chatId && ctx.chatNavigationArrival) {
        if (plan.shellStability === "sidebar-resume-remount") {
            return `chat-${ctx.chatId}-${ctx.chatHistorySuccess ? "ready" : "pending"}`;
        }
        return `chat-${ctx.chatId}`;
    }
    if (ctx.user) return "logged-in-session";
    return "anonymous";
}

export function resolveInitialMessages(
    plan: IChatEntryPlan,
    ctx: IResolveInitialMessagesContext,
): TChatMessage[] {
    if (plan.historyBootstrap === "db-ready" && ctx.chatHistoryData != null) {
        const row = Array.isArray(ctx.chatHistoryData[0]) ? ctx.chatHistoryData[0] : ctx.chatHistoryData;
        return Array.isArray(row) ? (row as TChatMessage[]) : [];
    }
    if (
        plan.historyBootstrap === "anonymous-local" ||
        plan.historyBootstrap === "sign-in-migration-local"
    ) {
        return ctx.anonymousMessages;
    }
    return [];
}

export function shouldRunAutoSend(plan: IChatEntryPlan, ctx: IShouldRunAutoSendContext): boolean {
    if (ctx.signInMigrationPending) return false;
    if (plan.autoSend === "never") return false;
    const trimmedSearch = ctx.search.trim();
    if (!trimmedSearch) return false;
    if (ctx.lastHandledSearch === trimmedSearch) return false;

    if (plan.autoSend === "deferred-until-share-loaded") {
        return !(
            isValidShareId(ctx.shareId) &&
            ctx.hevyProgramLength === 0 &&
            !ctx.sharedProgramLoadAttempted
        );
    }

    return plan.autoSend === "when-search-ready";
}

/** @deprecated Use `shouldRunAutoSend` - kept for tests migrating from initial-prompt. */
export function shouldDeferInitialSend(args: {
    shareId: string;
    hevyProgramLength: number;
    sharedProgramLoadAttempted: boolean;
}): boolean {
    return (
        isValidShareId(args.shareId) &&
        args.hevyProgramLength === 0 &&
        !args.sharedProgramLoadAttempted
    );
}
