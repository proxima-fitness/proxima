/**
 * @module useChatKeyboardChrome
 *
 * Subscribes to `visualViewport` and Chat-tab focus so phone-tab-shell
 * keyboard chrome can be written onto `document.documentElement` without
 * React re-renders on every inset tick.
 *
 * Depends on: chat-keyboard.
 * Used by: BuildProgramMobileLayout.
 */

"use client";

import { useEffect } from "react";
import {
    applyChatKeyboardChrome,
    clearChatKeyboardChrome,
    isChatKeyboardOpen,
    isChatTabField,
    isPhoneTabShell,
    PHONE_TAB_SHELL_QUERY,
    readVisualViewport,
} from "@/components/program-builder/utils/chat-keyboard";

/**
 * Sync keyboard chrome for the phone tab shell. No-op on larger viewports.
 */
export function useChatKeyboardChrome(): void {
    useEffect(() => {
        // visualViewport + focusin/focusout are browser APIs; not derivable during render.
        const root = document.documentElement;
        let focused = false;

        const sync = (): void => {
            if (!isPhoneTabShell()) {
                focused = false;
                clearChatKeyboardChrome(root);
                return;
            }
            const viewport = readVisualViewport();
            applyChatKeyboardChrome({
                inset: viewport.inset,
                open: isChatKeyboardOpen(focused, viewport.inset),
                root,
                vvHeight: viewport.vvHeight,
                vvOffsetTop: viewport.vvOffsetTop,
            });
        };

        const onFocusIn = (event: FocusEvent): void => {
            if (!isPhoneTabShell()) return;
            if (!isChatTabField(event.target)) return;
            focused = true;
            sync();
        };

        const onFocusOut = (): void => {
            requestAnimationFrame(() => {
                focused = isChatTabField(document.activeElement);
                sync();
            });
        };

        const media = window.matchMedia?.(PHONE_TAB_SHELL_QUERY);
        const vv = window.visualViewport;
        media?.addEventListener("change", sync);
        vv?.addEventListener("resize", sync);
        vv?.addEventListener("scroll", sync);
        document.addEventListener("focusin", onFocusIn);
        document.addEventListener("focusout", onFocusOut);
        sync();

        return () => {
            media?.removeEventListener("change", sync);
            vv?.removeEventListener("resize", sync);
            vv?.removeEventListener("scroll", sync);
            document.removeEventListener("focusin", onFocusIn);
            document.removeEventListener("focusout", onFocusOut);
            clearChatKeyboardChrome(root);
        };
    }, []);
}
