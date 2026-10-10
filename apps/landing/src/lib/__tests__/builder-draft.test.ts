import { describe, it, expect, beforeEach } from "vitest";
import { CHAT_MESSAGES_KEY } from "@/assets/constants/ui-constants";
import {
    BUILDER_DRAFT_KEY,
    BUILDER_PROMPT_KEY,
    BUILDER_REQUEST_KEY,
    NEW_PATH_SAVE_SUCCESS_TOAST,
    __resetBuilderDraftForTests,
    canWriteBuilderDraft,
    clearBuilderDraft,
    enableBuilderDraftWrites,
} from "../builder-draft";

describe("builder-draft", () => {
    beforeEach(() => {
        localStorage.clear();
        __resetBuilderDraftForTests();
    });

    it("clearBuilderDraft removes draft keys and blocks writes until re-enabled", () => {
        localStorage.setItem(BUILDER_DRAFT_KEY, "[]");
        localStorage.setItem(BUILDER_REQUEST_KEY, "{}");
        localStorage.setItem(BUILDER_PROMPT_KEY, '""');
        localStorage.setItem(CHAT_MESSAGES_KEY, "[]");

        clearBuilderDraft();

        expect(localStorage.getItem(BUILDER_DRAFT_KEY)).toBeNull();
        expect(localStorage.getItem(BUILDER_REQUEST_KEY)).toBeNull();
        expect(localStorage.getItem(BUILDER_PROMPT_KEY)).toBeNull();
        expect(localStorage.getItem(CHAT_MESSAGES_KEY)).toBeNull();
        expect(canWriteBuilderDraft()).toBe(false);

        enableBuilderDraftWrites();
        expect(canWriteBuilderDraft()).toBe(true);
    });

    it("New path Save toast is Saved and does not name Export", () => {
        expect(NEW_PATH_SAVE_SUCCESS_TOAST).toBe("Saved");
        expect(NEW_PATH_SAVE_SUCCESS_TOAST).not.toMatch(/export/i);
    });
});
