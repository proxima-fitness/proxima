import { afterEach, describe, expect, it, vi } from "vitest";

import {
    applyChatKeyboardChrome,
    blurChatTabField,
    CHAT_KEYBOARD_ATTR,
    CHAT_KEYBOARD_INSET_VAR,
    CHAT_KEYBOARD_OPEN,
    CHAT_VV_HEIGHT_VAR,
    CHAT_VV_OFFSET_TOP_VAR,
    clearChatKeyboardChrome,
    computeKeyboardInset,
    isChatKeyboardOpen,
    isChatTabField,
    isInteractiveThreadTarget,
    isKeyboardInset,
    isPhoneTabShell,
    isTapNotDrag,
    onChatThreadPointerCancel,
    onChatThreadPointerDown,
    onChatThreadPointerUp,
    readVisualViewport,
    shouldSkipChatInputAutofocus,
} from "../chat-keyboard";

afterEach(() => {
    clearChatKeyboardChrome(document.documentElement);
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
});

describe("chat-keyboard", () => {
    it("computes iOS-style inset and treats Android-resized layout as 0", () => {
        expect(computeKeyboardInset(800, 500, 0)).toBe(300);
        expect(computeKeyboardInset(500, 500, 0)).toBe(0);
        expect(computeKeyboardInset(800, 500, 40)).toBe(260);
        expect(computeKeyboardInset(400, 500, 0)).toBe(0);
    });

    it("ignores URL-bar-sized insets and treats a keyboard-sized inset as open", () => {
        expect(isKeyboardInset(40)).toBe(false);
        expect(isKeyboardInset(80)).toBe(false);
        expect(isKeyboardInset(81)).toBe(true);
        expect(isChatKeyboardOpen(true, 0)).toBe(true);
        expect(isChatKeyboardOpen(false, 0)).toBe(false);
        expect(isChatKeyboardOpen(false, 300)).toBe(true);
    });

    it("recognizes Chat-tab fields and ignores fields outside the tab", () => {
        document.body.innerHTML = `
            <div data-proxima-chat-tab>
                <textarea data-testid="in"></textarea>
            </div>
            <textarea data-testid="out"></textarea>
        `;
        const inside = document.querySelector("[data-testid='in']");
        const outside = document.querySelector("[data-testid='out']");
        expect(isChatTabField(inside)).toBe(true);
        expect(isChatTabField(outside)).toBe(false);
        expect(isChatTabField(null)).toBe(false);
    });

    it("treats buttons and links as interactive thread targets", () => {
        document.body.innerHTML = `
            <div data-testid="bubble"><p>hello</p></div>
            <button type="button">Accept</button>
            <a href="/x">link</a>
        `;
        expect(isInteractiveThreadTarget(document.querySelector("p"))).toBe(false);
        expect(isInteractiveThreadTarget(document.querySelector("button"))).toBe(true);
        expect(isInteractiveThreadTarget(document.querySelector("a"))).toBe(true);
    });

    it("distinguishes a tap from a drag", () => {
        expect(isTapNotDrag({ x: 10, y: 10 }, { x: 12, y: 11 })).toBe(true);
        expect(isTapNotDrag({ x: 10, y: 10 }, { x: 10, y: 40 })).toBe(false);
    });

    it("writes and clears keyboard chrome on the root", () => {
        const root = document.documentElement;
        applyChatKeyboardChrome({
            inset: 280,
            open: true,
            root,
            vvHeight: 420,
            vvOffsetTop: 12,
        });
        expect(root.getAttribute(CHAT_KEYBOARD_ATTR)).toBe(CHAT_KEYBOARD_OPEN);
        expect(root.style.getPropertyValue(CHAT_KEYBOARD_INSET_VAR)).toBe("280px");
        expect(root.style.getPropertyValue(CHAT_VV_HEIGHT_VAR)).toBe("420px");
        expect(root.style.getPropertyValue(CHAT_VV_OFFSET_TOP_VAR)).toBe("12px");

        applyChatKeyboardChrome({
            inset: 0,
            open: false,
            root,
            vvHeight: 700,
            vvOffsetTop: 0,
        });
        expect(root.hasAttribute(CHAT_KEYBOARD_ATTR)).toBe(false);
        expect(root.style.getPropertyValue(CHAT_VV_HEIGHT_VAR)).toBe("700px");

        clearChatKeyboardChrome(root);
        expect(root.style.getPropertyValue(CHAT_VV_HEIGHT_VAR)).toBe("");
    });

    it("reads visualViewport when present and falls back to innerHeight", () => {
        vi.stubGlobal("innerHeight", 800);
        vi.stubGlobal("visualViewport", { height: 480, offsetTop: 10 });
        expect(readVisualViewport(window)).toEqual({
            inset: 310,
            vvHeight: 480,
            vvOffsetTop: 10,
        });

        vi.stubGlobal("visualViewport", undefined);
        expect(readVisualViewport(window)).toEqual({
            inset: 0,
            vvHeight: 800,
            vvOffsetTop: 0,
        });
    });

    it("treats a missing matchMedia as not the phone tab shell", () => {
        vi.stubGlobal("matchMedia", undefined);
        expect(isPhoneTabShell()).toBe(false);
        expect(shouldSkipChatInputAutofocus()).toBe(false);
    });

    it("skips autofocus only on the phone tab shell", () => {
        vi.stubGlobal("matchMedia", (query: string) => ({
            matches: query === "(max-width: 639px)",
        }));
        expect(isPhoneTabShell()).toBe(true);
        expect(shouldSkipChatInputAutofocus()).toBe(true);

        vi.stubGlobal("matchMedia", () => ({ matches: false }));
        expect(shouldSkipChatInputAutofocus()).toBe(false);
    });

    it("blurs only a focused Chat-tab field", () => {
        document.body.innerHTML = `
            <div data-proxima-chat-tab>
                <textarea data-testid="in"></textarea>
            </div>
        `;
        const field = document.querySelector<HTMLTextAreaElement>("[data-testid='in']");
        field?.focus();
        expect(document.activeElement).toBe(field);
        blurChatTabField();
        expect(document.activeElement).not.toBe(field);
    });

    it("dismisses the keyboard on a thread tap, not a scroll or a button tap", () => {
        vi.stubGlobal("matchMedia", () => ({ matches: true }));
        document.documentElement.setAttribute(CHAT_KEYBOARD_ATTR, CHAT_KEYBOARD_OPEN);
        document.body.innerHTML = `
            <div data-proxima-chat-tab>
                <textarea data-testid="in"></textarea>
                <button type="button">Accept</button>
                <p data-testid="bubble">hello</p>
            </div>
        `;
        const field = document.querySelector<HTMLTextAreaElement>("[data-testid='in']");
        const bubble = document.querySelector("[data-testid='bubble']");
        const accept = document.querySelector("button");
        field?.focus();

        onChatThreadPointerDown({ clientX: 20, clientY: 20, target: accept });
        onChatThreadPointerUp({ clientX: 20, clientY: 20, target: accept });
        expect(document.activeElement).toBe(field);

        onChatThreadPointerDown({ clientX: 20, clientY: 20, target: bubble });
        onChatThreadPointerUp({ clientX: 20, clientY: 80, target: bubble });
        expect(document.activeElement).toBe(field);

        onChatThreadPointerDown({ clientX: 20, clientY: 20, target: bubble });
        onChatThreadPointerCancel();
        onChatThreadPointerUp({ clientX: 20, clientY: 21, target: bubble });
        expect(document.activeElement).toBe(field);

        onChatThreadPointerDown({ clientX: 20, clientY: 20, target: bubble });
        onChatThreadPointerUp({ clientX: 22, clientY: 21, target: bubble });
        expect(document.activeElement).not.toBe(field);
    });
});
