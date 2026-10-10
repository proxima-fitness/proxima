// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
    LONG_PROMPT_PLACEHOLDER,
    PENDING_ATTACHMENTS_KEY,
    PENDING_INITIAL_PROMPT_KEY,
} from "@/assets/constants/ui-constants";
import {
    clearLongPromptFromSessionStorage,
    inferProgramRequestFromPrompt,
    isValidShareId,
    readPendingAttachmentFileParts,
    resolveInitialPromptText,
} from "../initial-prompt";
import { shouldDeferInitialSend } from "../resolve-chat-entry";

function createSessionStorageMock() {
    const store = new Map<string, string>();
    return {
        getItem: vi.fn((key: string) => store.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
            store.set(key, value);
        }),
        removeItem: vi.fn((key: string) => {
            store.delete(key);
        }),
        clear: vi.fn(() => {
            store.clear();
        }),
    };
}

describe("isValidShareId", () => {
    it("returns false for empty or invalid values", () => {
        expect(isValidShareId("")).toBe(false);
        expect(isValidShareId("abc")).toBe(false);
        expect(isValidShareId("0")).toBe(false);
        expect(isValidShareId("-1")).toBe(false);
    });

    it("returns true for positive numeric ids", () => {
        expect(isValidShareId("42")).toBe(true);
        expect(isValidShareId(" 7 ")).toBe(true);
    });
});

describe("resolveInitialPromptText", () => {
    beforeEach(() => {
        vi.stubGlobal("sessionStorage", createSessionStorageMock());
    });

    it("returns search param when not a long-prompt placeholder", () => {
        expect(resolveInitialPromptText("build me a 4 day split")).toBe("build me a 4 day split");
    });

    it("reads pending prompt from sessionStorage for long placeholder", () => {
        sessionStorage.setItem(PENDING_INITIAL_PROMPT_KEY, "full long prompt text");
        expect(resolveInitialPromptText(LONG_PROMPT_PLACEHOLDER)).toBe("full long prompt text");
    });
});

describe("clearLongPromptFromSessionStorage", () => {
    beforeEach(() => {
        vi.stubGlobal("sessionStorage", createSessionStorageMock());
    });

    it("removes pending prompt key when placeholder path is used", () => {
        sessionStorage.setItem(PENDING_INITIAL_PROMPT_KEY, "stored");
        clearLongPromptFromSessionStorage(true);
        expect(sessionStorage.getItem(PENDING_INITIAL_PROMPT_KEY)).toBeNull();
    });

    it("does nothing when not a placeholder path", () => {
        sessionStorage.setItem(PENDING_INITIAL_PROMPT_KEY, "stored");
        clearLongPromptFromSessionStorage(false);
        expect(sessionStorage.getItem(PENDING_INITIAL_PROMPT_KEY)).toBe("stored");
    });
});

describe("readPendingAttachmentFileParts", () => {
    beforeEach(() => {
        vi.stubGlobal("sessionStorage", createSessionStorageMock());
    });

    it("parses valid file parts and removes the storage key", () => {
        sessionStorage.setItem(
            PENDING_ATTACHMENTS_KEY,
            JSON.stringify([{ type: "file", url: "https://example.com/a.pdf", mediaType: "application/pdf" }]),
        );

        const files = readPendingAttachmentFileParts();

        expect(files).toHaveLength(1);
        expect(files?.[0]?.url).toBe("https://example.com/a.pdf");
        expect(sessionStorage.getItem(PENDING_ATTACHMENTS_KEY)).toBeNull();
    });

    it("returns undefined for missing or malformed data", () => {
        expect(readPendingAttachmentFileParts()).toBeUndefined();

        sessionStorage.setItem(PENDING_ATTACHMENTS_KEY, "not-json");
        expect(readPendingAttachmentFileParts()).toBeUndefined();

        sessionStorage.setItem(PENDING_ATTACHMENTS_KEY, JSON.stringify([{ type: "text", url: "x" }]));
        expect(readPendingAttachmentFileParts()).toBeUndefined();
    });
});

describe("shouldDeferInitialSend", () => {
    it("defers when valid shareId, empty program, and load not attempted", () => {
        expect(
            shouldDeferInitialSend({
                shareId: "12",
                hevyProgramLength: 0,
                sharedProgramLoadAttempted: false,
            }),
        ).toBe(true);
    });

    it("does not defer after load attempted", () => {
        expect(
            shouldDeferInitialSend({
                shareId: "12",
                hevyProgramLength: 0,
                sharedProgramLoadAttempted: true,
            }),
        ).toBe(false);
    });

    it("does not defer when program is already loaded", () => {
        expect(
            shouldDeferInitialSend({
                shareId: "12",
                hevyProgramLength: 2,
                sharedProgramLoadAttempted: false,
            }),
        ).toBe(false);
    });

    it("does not defer for invalid shareId", () => {
        expect(
            shouldDeferInitialSend({
                shareId: "",
                hevyProgramLength: 0,
                sharedProgramLoadAttempted: false,
            }),
        ).toBe(false);
    });
});

describe("inferProgramRequestFromPrompt", () => {
    it("calls setters when fields are empty", () => {
        const setDaysPerWeek = vi.fn();
        const setProgramLength = vi.fn();
        const setExcludeAreas = vi.fn();
        const setExcludeEquipment = vi.fn();
        const setHealthIssues = vi.fn();

        inferProgramRequestFromPrompt("4 days per week for 12 weeks", {
            daysPerWeek: "",
            programLength: "",
            excludeAreas: [],
            excludeEquipment: [],
            healthIssues: [],
            setDaysPerWeek,
            setProgramLength,
            setExcludeAreas,
            setExcludeEquipment,
            setHealthIssues,
        });

        expect(setDaysPerWeek).toHaveBeenCalled();
        expect(setProgramLength).toHaveBeenCalled();
    });

    it("skips setters when fields are already filled", () => {
        const setDaysPerWeek = vi.fn();
        const setProgramLength = vi.fn();
        const setExcludeAreas = vi.fn();
        const setExcludeEquipment = vi.fn();
        const setHealthIssues = vi.fn();

        inferProgramRequestFromPrompt("4 days per week for 12 weeks", {
            daysPerWeek: "4",
            programLength: "8",
            excludeAreas: [{ label: "Legs", value: "legs" }],
            excludeEquipment: [{ label: "Barbell", value: "barbell" }],
            healthIssues: [{ label: "Knee", value: "knee" }],
            setDaysPerWeek,
            setProgramLength,
            setExcludeAreas,
            setExcludeEquipment,
            setHealthIssues,
        });

        expect(setDaysPerWeek).not.toHaveBeenCalled();
        expect(setProgramLength).not.toHaveBeenCalled();
        expect(setExcludeAreas).not.toHaveBeenCalled();
        expect(setExcludeEquipment).not.toHaveBeenCalled();
        expect(setHealthIssues).not.toHaveBeenCalled();
    });
});
