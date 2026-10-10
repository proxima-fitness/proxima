import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    AGENT_DEBUG_MODE_KEY,
    getAgentDebugMode,
    setAgentDebugMode,
} from "@/lib/agent-debug-mode";

function createLocalStorageMock() {
    const store = new Map<string, string>();
    return {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
            store.set(key, value);
        },
        removeItem: (key: string) => {
            store.delete(key);
        },
        clear: () => {
            store.clear();
        },
    };
}

describe("agent-debug-mode", () => {
    beforeEach(() => {
        vi.stubGlobal("localStorage", createLocalStorageMock());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("defaults to false when unset", () => {
        expect(getAgentDebugMode()).toBe(false);
    });

    it("returns true after enabling", () => {
        setAgentDebugMode(true);
        expect(localStorage.getItem(AGENT_DEBUG_MODE_KEY)).toBe("true");
        expect(getAgentDebugMode()).toBe(true);
    });

    it("returns false after disabling", () => {
        setAgentDebugMode(true);
        setAgentDebugMode(false);
        expect(localStorage.getItem(AGENT_DEBUG_MODE_KEY)).toBeNull();
        expect(getAgentDebugMode()).toBe(false);
    });
});
