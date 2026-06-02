import { describe, it, expect } from "vitest";
import type { User } from "@supabase/supabase-js";
import {
    advanceChatNavigationLatch,
    buildShellKey,
    createChatNavigationLatch,
    resetChatNavigationLatchForArrival,
    shouldHydrateProgramFromUrl,
    isBareBuildProgramArrival,
    isChatNavigationArrivalAtMount,
    shouldRedirectBareBuildProgramToEmpty,
    parseBuildProgramArrival,
    resolveChatEntryPlan,
    resolveInitialMessages,
    resolvePersistChatId,
    resolveSendPathConfirmed,
    resolveSidebarRowKnown,
    shouldDeferInitialSend,
    shouldRunAutoSend,
} from "../resolve-chat-entry";

const loggedInUser = { id: "user-1" } as User;
const chatId = "11111111-1111-4111-8111-111111111111";

describe("parseBuildProgramArrival", () => {
    it("reads build-program query params", () => {
        const params = new URLSearchParams("chat=abc&search=hi&empty=true&shareId=1&resume=true");
        expect(parseBuildProgramArrival(params)).toEqual({
            urlChatId: "abc",
            search: "hi",
            shareId: "1",
            empty: "true",
            resume: "true",
        });
    });
});

describe("isBareBuildProgramArrival", () => {
    it("is true only with no arrival params", () => {
        expect(isBareBuildProgramArrival(parseBuildProgramArrival(new URLSearchParams()))).toBe(true);
        expect(
            isBareBuildProgramArrival(parseBuildProgramArrival(new URLSearchParams("empty=true"))),
        ).toBe(false);
    });
});

describe("shouldRedirectBareBuildProgramToEmpty", () => {
    it("redirects intentional bare /build-program (A0)", () => {
        expect(shouldRedirectBareBuildProgramToEmpty(true, false)).toBe(true);
    });

    it("does not redirect after D1 stripped search (URL bare mid-session)", () => {
        expect(shouldRedirectBareBuildProgramToEmpty(true, true)).toBe(false);
    });

    it("does not redirect when arrival still has params", () => {
        expect(shouldRedirectBareBuildProgramToEmpty(false, false)).toBe(false);
    });
});

describe("resolveSidebarRowKnown", () => {
    it("matches chat id in sidebar list", () => {
        expect(resolveSidebarRowKnown(chatId, [{ id: chatId }])).toBe(true);
        expect(resolveSidebarRowKnown(chatId, [])).toBe(false);
    });
});

describe("resolveSendPathConfirmed", () => {
    it("requires chat id and session insert confirmation", () => {
        expect(resolveSendPathConfirmed(chatId, true)).toBe(true);
        expect(resolveSendPathConfirmed("", true)).toBe(false);
        expect(resolveSendPathConfirmed(chatId, false)).toBe(false);
    });
});

describe("resolvePersistChatId", () => {
    it("prefers URL chat id over pending mint", () => {
        expect(resolvePersistChatId("url-id", "mint-id")).toBe("url-id");
    });

    it("falls back to pending mint before URL propagates", () => {
        expect(resolvePersistChatId("", "mint-id")).toBe("mint-id");
    });
});

function baseInput(overrides: Partial<Parameters<typeof resolveChatEntryPlan>[0]> = {}) {
    return {
        user: null,
        chatId: "",
        search: "",
        shareId: "",
        sidebarRowKnown: false,
        sendPathConfirmed: false,
        chatNavigationArrival: false,
        sharedProgramLoadAttempted: true,
        hevyProgramLength: 0,
        chatHistorySuccess: false,
        anonLocalMessageCount: 0,
        explicitNewChat: false,
        ...overrides,
    };
}

describe("resolveChatEntryPlan — arrival matrix", () => {
    // A1 — Home prompt (?search=, optional pre-mint ?chat=)
    it("A1: home search — auto-send when ready, empty bootstrap, send-path-stable", () => {
        const plan = resolveChatEntryPlan(
            baseInput({ user: loggedInUser, search: "build me a program" }),
        );
        expect(plan.autoSend).toBe("when-search-ready");
        expect(plan.historyBootstrap).toBe("empty");
        expect(plan.shellStability).toBe("send-path-stable");
        expect(plan.sessionOnFirstSend).toBe("mint-and-insert");
        expect(plan.enableHistoryFetch).toBe(false);
    });

    it("A1 anon: home search — empty bootstrap (not anonymous-local restore)", () => {
        const plan = resolveChatEntryPlan(baseInput({ search: "build me a program" }));
        expect(plan.autoSend).toBe("when-search-ready");
        expect(plan.historyBootstrap).toBe("empty");
        expect(plan.sessionOnFirstSend).toBe("anonymous-only");
    });

    // A2 — Sidebar recent (?chat=, no search)
    it("A2: sidebar resume — never auto-send, db bootstrap, sidebar remount", () => {
        const pending = resolveChatEntryPlan(
            baseInput({
                user: loggedInUser,
                chatId,
                sidebarRowKnown: true,
                chatNavigationArrival: true,
                chatHistorySuccess: false,
            }),
        );
        expect(pending.autoSend).toBe("never");
        expect(pending.historyBootstrap).toBe("db-wait");
        expect(pending.shellStability).toBe("sidebar-resume-remount");
        expect(pending.sessionOnFirstSend).toBe("ensure-existing");
        expect(pending.enableHistoryFetch).toBe(true);

        const ready = resolveChatEntryPlan(
            baseInput({
                user: loggedInUser,
                chatId,
                sidebarRowKnown: true,
                chatNavigationArrival: true,
                chatHistorySuccess: true,
            }),
        );
        expect(ready.historyBootstrap).toBe("db-ready");
        expect(ready.shellStability).toBe("send-path-stable");
    });

    it("A3′: mint + sidebarRowKnown — send-path-stable shell, no history fetch until confirmed", () => {
        const plan = resolveChatEntryPlan(
            baseInput({
                user: loggedInUser,
                chatId,
                sidebarRowKnown: true,
                sendPathConfirmed: false,
                chatNavigationArrival: false,
                chatHistorySuccess: false,
            }),
        );
        expect(plan.shellStability).toBe("send-path-stable");
        expect(plan.enableHistoryFetch).toBe(false);
        expect(
            buildShellKey(plan, {
                chatId,
                user: loggedInUser,
                chatHistorySuccess: false,
                chatNavigationArrival: false,
            }),
        ).toBe("logged-in-session");
    });

    // A3 — New Chat anon (?empty=true)
    it("A3: anon new chat — anonymous-local bootstrap, never auto-send", () => {
        const plan = resolveChatEntryPlan(baseInput());
        expect(plan.historyBootstrap).toBe("anonymous-local");
        expect(plan.autoSend).toBe("never");
        expect(plan.sessionOnFirstSend).toBe("anonymous-only");
    });

    // A3′ — New Chat logged in (?empty=true, no chat)
    it("A3′: logged-in new chat — empty bootstrap, mint on first send", () => {
        const plan = resolveChatEntryPlan(baseInput({ user: loggedInUser }));
        expect(plan.historyBootstrap).toBe("empty");
        expect(plan.autoSend).toBe("never");
        expect(plan.sessionOnFirstSend).toBe("mint-and-insert");
    });

    it("A3′: explicit new chat ignores stale anon snapshot (no sign-in migration bootstrap)", () => {
        const plan = resolveChatEntryPlan(
            baseInput({ user: loggedInUser, anonLocalMessageCount: 3, explicitNewChat: true }),
        );
        expect(plan.historyBootstrap).toBe("empty");
        expect(plan.enableHistoryFetch).toBe(false);
    });

    // A4 — Shared program (?shareId=, no search)
    it("A4: shared program only — never auto-send until user chats", () => {
        const plan = resolveChatEntryPlan(
            baseInput({ shareId: "42", sharedProgramLoadAttempted: false }),
        );
        expect(plan.autoSend).toBe("never");
        expect(plan.historyBootstrap).toBe("anonymous-local");
    });

    // A5 — Resume draft (?resume=true)
    it("A5: resume draft — same as bare new session until dispatch", () => {
        const plan = resolveChatEntryPlan(baseInput({ user: loggedInUser }));
        expect(plan.autoSend).toBe("never");
        expect(plan.historyBootstrap).toBe("empty");
    });

    // A6 — Empty template (?empty=true)
    it("A6: empty template — never auto-send, empty bootstrap", () => {
        const plan = resolveChatEntryPlan(baseInput({ user: loggedInUser }));
        expect(plan.autoSend).toBe("never");
        expect(plan.historyBootstrap).toBe("empty");
    });

    // A8 — Hevy edit (?resume=true&edit=true&hevy=true) — resolver treats like resume
    it("A8: hevy edit resume — never auto-send without search", () => {
        const plan = resolveChatEntryPlan(baseInput({ user: loggedInUser }));
        expect(plan.autoSend).toBe("never");
    });

    // A9 — Stall fix shared + search (?shareId=&search=)
    it("A9: shareId + search — deferred auto-send until program loads", () => {
        const plan = resolveChatEntryPlan(
            baseInput({
                user: loggedInUser,
                search: "fix my program",
                shareId: "42",
                sharedProgramLoadAttempted: false,
                hevyProgramLength: 0,
            }),
        );
        expect(plan.autoSend).toBe("deferred-until-share-loaded");
    });

    // A10 — Stall fix Hevy (?resume=true&search=)
    it("A10: resume + search — when-search-ready", () => {
        const plan = resolveChatEntryPlan(
            baseInput({ user: loggedInUser, search: "continue building" }),
        );
        expect(plan.autoSend).toBe("when-search-ready");
    });

    // A11 — Sign-in redirect (?resume=true via login) — anon snapshot bootstrap until migration
    it("A11: sign-in redirect resume — sign-in-migration-local when anon snapshot present", () => {
        const plan = resolveChatEntryPlan(
            baseInput({ user: loggedInUser, anonLocalMessageCount: 2 }),
        );
        expect(plan.historyBootstrap).toBe("sign-in-migration-local");
        expect(plan.sessionOnFirstSend).toBe("mint-and-insert");
        expect(plan.shellStability).toBe("send-path-stable");
    });

    it("A11: logged-in without anon snapshot — empty bootstrap", () => {
        const plan = resolveChatEntryPlan(baseInput({ user: loggedInUser }));
        expect(plan.historyBootstrap).toBe("empty");
    });

    // A12 — Shared link external (?shareId= from ShareDialog)
    it("A12: external shared link — never auto-send without search", () => {
        const plan = resolveChatEntryPlan(
            baseInput({ shareId: "99", sharedProgramLoadAttempted: true }),
        );
        expect(plan.autoSend).toBe("never");
    });

    it("pre-minted chat + search — send-path-stable, no history fetch until confirmed", () => {
        const plan = resolveChatEntryPlan(
            baseInput({
                user: loggedInUser,
                chatId,
                search: "hello",
                sendPathConfirmed: false,
                sidebarRowKnown: false,
                chatNavigationArrival: true,
            }),
        );
        expect(plan.shellStability).toBe("send-path-stable");
        expect(plan.enableHistoryFetch).toBe(false);
        expect(plan.autoSend).toBe("when-search-ready");
    });

    it("send-path confirmed enables history fetch", () => {
        const plan = resolveChatEntryPlan(
            baseInput({
                user: loggedInUser,
                chatId,
                sendPathConfirmed: true,
                chatHistorySuccess: true,
            }),
        );
        expect(plan.enableHistoryFetch).toBe(true);
        expect(plan.historyBootstrap).toBe("db-ready");
        expect(plan.shellStability).toBe("send-path-stable");
    });
});

describe("shouldHydrateProgramFromUrl", () => {
    it("hydrates when chat and valid shareId", () => {
        expect(
            shouldHydrateProgramFromUrl({
                chatId: chatId,
                shareId: "12",
                resume: "",
                empty: "",
            }),
        ).toBe(true);
    });

    it("skips hydrate for chat-only session mint", () => {
        expect(
            shouldHydrateProgramFromUrl({
                chatId: chatId,
                shareId: "",
                resume: "",
                empty: "",
            }),
        ).toBe(false);
    });
});

describe("isChatNavigationArrivalAtMount", () => {
    it("is true when chat param present at arrival", () => {
        expect(isChatNavigationArrivalAtMount(chatId)).toBe(true);
        expect(isChatNavigationArrivalAtMount("")).toBe(false);
    });
});

describe("advanceChatNavigationLatch", () => {
    const chatA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const chatB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

    it("latched at mount when chat in URL (sidebar / pre-mint)", () => {
        const latch = createChatNavigationLatch(chatA);
        expect(advanceChatNavigationLatch(chatA, latch).chatNavigationArrival).toBe(true);
    });

    it("session mint does not latch (empty → chatId)", () => {
        let latch = createChatNavigationLatch("");
        let step = advanceChatNavigationLatch(chatA, latch);
        expect(step.chatNavigationArrival).toBe(false);
        latch = step.next;
        step = advanceChatNavigationLatch(chatA, latch);
        expect(step.chatNavigationArrival).toBe(false);
    });

    it("sidebar swap after mint latches (A → B)", () => {
        let latch = createChatNavigationLatch("");
        let step = advanceChatNavigationLatch(chatA, latch);
        latch = step.next;
        step = advanceChatNavigationLatch(chatB, latch);
        expect(step.chatNavigationArrival).toBe(true);
    });

    it("sidebar resume same chat with shareId latches after session mint", () => {
        let latch = createChatNavigationLatch("");
        let step = advanceChatNavigationLatch(chatA, latch, { sendPathConfirmed: true });
        latch = step.next;
        expect(step.chatNavigationArrival).toBe(false);

        step = advanceChatNavigationLatch(chatA, latch, {
            sidebarRowKnown: true,
            sendPathConfirmed: true,
            shareId: "42",
        });
        expect(step.chatNavigationArrival).toBe(true);
    });

    it("New Chat then first sidebar pick latches when row is known", () => {
        const chatA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

        let latch = resetChatNavigationLatchForArrival(
            { empty: "true", urlChatId: "" },
            createChatNavigationLatch(chatA),
        );
        let step = advanceChatNavigationLatch("", latch);
        latch = step.next;
        expect(step.chatNavigationArrival).toBe(false);

        step = advanceChatNavigationLatch(chatA, latch, { sidebarRowKnown: true });
        expect(step.chatNavigationArrival).toBe(true);

        const plan = resolveChatEntryPlan(
            baseInput({
                user: loggedInUser,
                chatId: chatA,
                sidebarRowKnown: true,
                chatNavigationArrival: step.chatNavigationArrival,
            }),
        );
        expect(plan.enableHistoryFetch).toBe(true);
        expect(plan.historyBootstrap).toBe("db-wait");
    });

    it("A3′: New Chat clears stale latch so session mint keeps send-path shell", () => {
        const chatA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
        const mintedId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

        let latch = createChatNavigationLatch(chatA);
        expect(latch.latched).toBe(true);

        latch = resetChatNavigationLatchForArrival({ empty: "true", urlChatId: "" }, latch);
        expect(latch.latched).toBe(false);

        let step = advanceChatNavigationLatch("", latch);
        latch = step.next;
        expect(step.chatNavigationArrival).toBe(false);

        step = advanceChatNavigationLatch(mintedId, latch, { sidebarRowKnown: false });
        expect(step.chatNavigationArrival).toBe(false);

        const plan = resolveChatEntryPlan(
            baseInput({
                user: loggedInUser,
                chatId: mintedId,
                sendPathConfirmed: true,
                chatNavigationArrival: step.chatNavigationArrival,
            }),
        );
        expect(
            buildShellKey(plan, {
                chatId: mintedId,
                user: loggedInUser,
                chatHistorySuccess: false,
                chatNavigationArrival: step.chatNavigationArrival,
            }),
        ).toBe("logged-in-session");
    });

    it("sign-in migration mint with sidebarRowKnown same render does not latch (A11)", () => {
        const mintedId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
        const latch = createChatNavigationLatch("");

        const step = advanceChatNavigationLatch(mintedId, latch, {
            sidebarRowKnown: true,
            sendPathConfirmed: true,
        });

        expect(step.chatNavigationArrival).toBe(false);

        const plan = resolveChatEntryPlan(
            baseInput({
                user: loggedInUser,
                chatId: mintedId,
                sendPathConfirmed: true,
                sidebarRowKnown: true,
                chatNavigationArrival: step.chatNavigationArrival,
            }),
        );
        expect(
            buildShellKey(plan, {
                chatId: mintedId,
                user: loggedInUser,
                chatHistorySuccess: false,
                chatNavigationArrival: step.chatNavigationArrival,
            }),
        ).toBe("logged-in-session");
    });
});

describe("buildShellKey", () => {
    const navCtx = { chatNavigationArrival: true };
    const mintCtx = { chatNavigationArrival: false };

    it("sidebar remount key toggles ready/pending while history loading", () => {
        const pendingPlan = resolveChatEntryPlan(
            baseInput({
                user: loggedInUser,
                chatId,
                sidebarRowKnown: true,
                chatNavigationArrival: true,
                chatHistorySuccess: false,
            }),
        );
        expect(
            buildShellKey(pendingPlan, {
                chatId,
                user: loggedInUser,
                chatHistorySuccess: false,
                ...navCtx,
            }),
        ).toBe(`chat-${chatId}-pending`);

        const readyPlan = resolveChatEntryPlan(
            baseInput({
                user: loggedInUser,
                chatId,
                sidebarRowKnown: true,
                chatNavigationArrival: true,
                chatHistorySuccess: true,
            }),
        );
        expect(
            buildShellKey(readyPlan, { chatId, user: loggedInUser, chatHistorySuccess: true, ...navCtx }),
        ).toBe(`chat-${chatId}`);
    });

    it("chat-scoped key after sidebar history loaded (A2 — no logged-in-session collapse)", () => {
        const beforeSend = resolveChatEntryPlan(
            baseInput({
                user: loggedInUser,
                chatId,
                sidebarRowKnown: true,
                chatNavigationArrival: true,
                sendPathConfirmed: false,
                chatHistorySuccess: true,
            }),
        );
        const afterSend = resolveChatEntryPlan(
            baseInput({
                user: loggedInUser,
                chatId,
                sidebarRowKnown: true,
                chatNavigationArrival: true,
                sendPathConfirmed: true,
                chatHistorySuccess: true,
            }),
        );

        const keyBefore = buildShellKey(beforeSend, {
            chatId,
            user: loggedInUser,
            chatHistorySuccess: true,
            ...navCtx,
        });
        const keyAfter = buildShellKey(afterSend, {
            chatId,
            user: loggedInUser,
            chatHistorySuccess: true,
            ...navCtx,
        });

        expect(keyBefore).toBe(`chat-${chatId}`);
        expect(keyAfter).toBe(`chat-${chatId}`);
    });

    it("pre-mint A1 keeps chat-scoped shell through auto-send window", () => {
        const plan = resolveChatEntryPlan(
            baseInput({
                user: loggedInUser,
                chatId,
                search: "hello",
                chatNavigationArrival: true,
            }),
        );
        expect(
            buildShellKey(plan, { chatId, user: loggedInUser, chatHistorySuccess: false, ...navCtx }),
        ).toBe(`chat-${chatId}`);
    });

    it("A3′ session mint stays logged-in-session when chatId present without arrival intent", () => {
        const plan = resolveChatEntryPlan(
            baseInput({
                user: loggedInUser,
                chatId,
                sendPathConfirmed: true,
                sidebarRowKnown: true,
                chatHistorySuccess: true,
            }),
        );
        expect(
            buildShellKey(plan, { chatId, user: loggedInUser, chatHistorySuccess: true, ...mintCtx }),
        ).toBe("logged-in-session");
    });

    it("sidebarRowKnown after insert does not upgrade shell without arrival intent", () => {
        const plan = resolveChatEntryPlan(
            baseInput({
                user: loggedInUser,
                chatId,
                sidebarRowKnown: true,
                chatNavigationArrival: false,
                sendPathConfirmed: false,
                chatHistorySuccess: true,
            }),
        );
        expect(
            buildShellKey(plan, { chatId, user: loggedInUser, chatHistorySuccess: true, ...mintCtx }),
        ).toBe("logged-in-session");
    });

    it("logged-in-session only when authenticated without chatId (A3′ new chat)", () => {
        const plan = resolveChatEntryPlan(baseInput({ user: loggedInUser }));
        expect(
            buildShellKey(plan, { chatId: "", user: loggedInUser, chatHistorySuccess: false, ...mintCtx }),
        ).toBe("logged-in-session");
    });

    it("anonymous shell when logged out without chatId", () => {
        const plan = resolveChatEntryPlan(baseInput());
        expect(
            buildShellKey(plan, { chatId: "", user: null, chatHistorySuccess: false, ...mintCtx }),
        ).toBe("anonymous");
    });
});

describe("resolveInitialMessages", () => {
    const userMsg: TChatMessage = {
        id: "u1",
        role: "user",
        parts: [{ type: "text", text: "Hi" }],
    };

    it("returns DB thread when db-ready", () => {
        const plan = resolveChatEntryPlan(
            baseInput({
                user: loggedInUser,
                chatId,
                sidebarRowKnown: true,
                chatNavigationArrival: true,
                chatHistorySuccess: true,
            }),
        );
        expect(
            resolveInitialMessages(plan, { chatHistoryData: [[userMsg]], anonymousMessages: [] }),
        ).toEqual([userMsg]);
    });

    it("returns anonymous restore when anonymous-local", () => {
        const plan = resolveChatEntryPlan(baseInput());
        expect(
            resolveInitialMessages(plan, { chatHistoryData: null, anonymousMessages: [userMsg] }),
        ).toEqual([userMsg]);
    });

    it("returns anon snapshot when sign-in-migration-local", () => {
        const plan = resolveChatEntryPlan(
            baseInput({ user: loggedInUser, anonLocalMessageCount: 1 }),
        );
        expect(
            resolveInitialMessages(plan, { chatHistoryData: null, anonymousMessages: [userMsg] }),
        ).toEqual([userMsg]);
    });

    it("returns empty for db-wait and empty bootstrap", () => {
        const waitPlan = resolveChatEntryPlan(
            baseInput({
                user: loggedInUser,
                chatId,
                sidebarRowKnown: true,
                chatNavigationArrival: true,
            }),
        );
        expect(resolveInitialMessages(waitPlan, { chatHistoryData: null, anonymousMessages: [] })).toEqual(
            [],
        );

        const emptyPlan = resolveChatEntryPlan(baseInput({ user: loggedInUser }));
        expect(resolveInitialMessages(emptyPlan, { chatHistoryData: null, anonymousMessages: [] })).toEqual(
            [],
        );
    });
});

describe("shouldRunAutoSend", () => {
    it("runs when search ready and not yet sent", () => {
        const plan = resolveChatEntryPlan(baseInput({ search: "build program" }));
        expect(
            shouldRunAutoSend(plan, {
                search: "build program",
                shareId: "",
                hevyProgramLength: 0,
                sharedProgramLoadAttempted: true,
                lastHandledSearch: "",
            }),
        ).toBe(true);
    });

    it("does not re-run for the same search param (A9/A10 guard)", () => {
        const plan = resolveChatEntryPlan(baseInput({ user: loggedInUser, search: "fix my program" }));
        expect(
            shouldRunAutoSend(plan, {
                search: "fix my program",
                shareId: "",
                hevyProgramLength: 0,
                sharedProgramLoadAttempted: true,
                lastHandledSearch: "fix my program",
            }),
        ).toBe(false);
    });

    it("re-enables auto-send when search param changes in same shell", () => {
        const plan = resolveChatEntryPlan(baseInput({ user: loggedInUser, search: "second prompt" }));
        expect(
            shouldRunAutoSend(plan, {
                search: "second prompt",
                shareId: "",
                hevyProgramLength: 0,
                sharedProgramLoadAttempted: true,
                lastHandledSearch: "first prompt",
            }),
        ).toBe(true);
    });

    it("does not run for sidebar resume (never policy)", () => {
        const plan = resolveChatEntryPlan(baseInput({ user: loggedInUser, chatId }));
        expect(
            shouldRunAutoSend(plan, {
                search: "",
                shareId: "",
                hevyProgramLength: 0,
                sharedProgramLoadAttempted: true,
                lastHandledSearch: "",
            }),
        ).toBe(false);
    });

    it("defers until shared program load completes", () => {
        const plan = resolveChatEntryPlan(
            baseInput({
                search: "fix",
                shareId: "12",
                sharedProgramLoadAttempted: false,
                hevyProgramLength: 0,
            }),
        );
        expect(
            shouldRunAutoSend(plan, {
                search: "fix",
                shareId: "12",
                hevyProgramLength: 0,
                sharedProgramLoadAttempted: false,
                lastHandledSearch: "",
            }),
        ).toBe(false);

        expect(
            shouldRunAutoSend(plan, {
                search: "fix",
                shareId: "12",
                hevyProgramLength: 0,
                sharedProgramLoadAttempted: true,
                lastHandledSearch: "",
            }),
        ).toBe(true);
    });

    it("blocks D1 while sign-in migration is pending", () => {
        const plan = resolveChatEntryPlan(
            baseInput({ user: loggedInUser, search: "build program" }),
        );
        expect(
            shouldRunAutoSend(plan, {
                search: "build program",
                shareId: "",
                hevyProgramLength: 0,
                sharedProgramLoadAttempted: true,
                lastHandledSearch: "",
                signInMigrationPending: true,
            }),
        ).toBe(false);
    });
});

describe("shouldDeferInitialSend (compat)", () => {
    it("matches defer conditions", () => {
        expect(
            shouldDeferInitialSend({
                shareId: "12",
                hevyProgramLength: 0,
                sharedProgramLoadAttempted: false,
            }),
        ).toBe(true);
        expect(
            shouldDeferInitialSend({
                shareId: "12",
                hevyProgramLength: 0,
                sharedProgramLoadAttempted: true,
            }),
        ).toBe(false);
    });
});
