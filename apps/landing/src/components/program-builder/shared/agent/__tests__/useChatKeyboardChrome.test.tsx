// SPDX-License-Identifier: AGPL-3.0-only

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";

import { CHAT_KEYBOARD_ATTR, CHAT_KEYBOARD_OPEN } from "@/components/program-builder/utils/chat-keyboard";
import { useChatKeyboardChrome } from "../useChatKeyboardChrome";

function Host() {
    useChatKeyboardChrome();
    return (
        <div data-proxima-chat-tab="">
            <textarea aria-label="composer" />
        </div>
    );
}

describe("useChatKeyboardChrome", () => {
    beforeEach(() => {
        vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
            matches: query === "(max-width: 639px)",
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));
        Object.defineProperty(window, "visualViewport", {
            configurable: true,
            value: {
                addEventListener: vi.fn(),
                height: 500,
                offsetTop: 0,
                removeEventListener: vi.fn(),
            },
        });
        Object.defineProperty(window, "innerHeight", {
            configurable: true,
            value: 500,
        });
    });

    afterEach(() => {
        cleanup();
        document.documentElement.removeAttribute(CHAT_KEYBOARD_ATTR);
        vi.restoreAllMocks();
    });

    it("opens chrome when a Chat-tab field is focused and closes on blur when inset is 0", async () => {
        const { getByLabelText } = render(<Host />);
        const field = getByLabelText("composer");

        field.focus();
        fireEvent.focusIn(field);
        expect(document.documentElement.getAttribute(CHAT_KEYBOARD_ATTR)).toBe(
            CHAT_KEYBOARD_OPEN,
        );

        field.blur();
        fireEvent.focusOut(field);
        await new Promise<void>((resolve) => {
            requestAnimationFrame(() => resolve());
        });
        expect(document.documentElement.hasAttribute(CHAT_KEYBOARD_ATTR)).toBe(false);
    });
});
