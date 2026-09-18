/**
 * @module chat-keyboard
 *
 * Phone tab shell (`<640px`) chat-keyboard geometry and chrome. Composer sits
 * on the software keyboard; the thread is the leftover visual viewport.
 * Android uses the same contract via `visualViewport` (inset is often 0 when
 * the layout already resized). Not a domain term — UI chrome only.
 *
 * Depends on: visualViewport / matchMedia.
 * Used by: BuildProgramMobileLayout, Agent, Chat, MutationProposalCard.
 */

export const PHONE_TAB_SHELL_QUERY = "(max-width: 639px)";
export const CHAT_KEYBOARD_ATTR = "data-proxima-chat-keyboard";
export const CHAT_KEYBOARD_OPEN = "open";
export const CHAT_KEYBOARD_INSET_VAR = "--proxima-keyboard-inset";
export const CHAT_VV_HEIGHT_VAR = "--proxima-vv-height";
export const CHAT_VV_OFFSET_TOP_VAR = "--proxima-vv-offset-top";
export const CHAT_COMPOSER_CAP_RATIO = 0.4;
export const CHAT_KEYBOARD_TAP_SLOP_PX = 10;
export const CHAT_KEYBOARD_INSET_THRESHOLD_PX = 80;
export const CHAT_TAB_ROOT_SELECTOR = "[data-proxima-chat-tab]";

export interface IChatKeyboardChrome {
    inset: number;
    open: boolean;
    root: HTMLElement;
    vvHeight: number;
    vvOffsetTop: number;
}

export interface IPointerPoint {
    x: number;
    y: number;
}

/**
 * Whether the viewport is the phone tab shell (`max-sm`).
 *
 * @param matchMediaFn - `window.matchMedia`, injectable for tests.
 */
export function isPhoneTabShell(
    matchMediaFn?: (query: string) => Pick<MediaQueryList, "matches">,
): boolean {
    if (typeof window === "undefined") return false;
    const media = matchMediaFn ?? window.matchMedia?.bind(window);
    if (typeof media !== "function") return false;
    return media(PHONE_TAB_SHELL_QUERY).matches;
}

/**
 * Keyboard inset from the layout viewport. ~0 on Android when Chrome
 * already resized `innerHeight` to the visual viewport.
 *
 * @param innerHeight - `window.innerHeight`.
 * @param visualViewportHeight - `visualViewport.height`.
 * @param visualViewportOffsetTop - `visualViewport.offsetTop`.
 */
export function computeKeyboardInset(
    innerHeight: number,
    visualViewportHeight: number,
    visualViewportOffsetTop: number,
): number {
    return Math.max(0, innerHeight - visualViewportHeight - visualViewportOffsetTop);
}

/**
 * Whether the current visual-viewport inset is a software keyboard, not a
 * URL-bar jiggle.
 *
 * @param inset - Result of `computeKeyboardInset`.
 */
export function isKeyboardInset(inset: number): boolean {
    return inset > CHAT_KEYBOARD_INSET_THRESHOLD_PX;
}

/**
 * A text field inside the Chat tab (composer or questionnaire).
 *
 * @param node - Event target or `document.activeElement`.
 */
export function isChatTabField(node: EventTarget | null): boolean {
    if (!(node instanceof Element)) return false;
    if (node.closest(CHAT_TAB_ROOT_SELECTOR) == null) return false;
    return node.closest("input, textarea, select, [contenteditable='true']") != null;
}

/**
 * Interactive controls in the thread that must not dismiss the keyboard.
 *
 * @param node - Event target.
 */
export function isInteractiveThreadTarget(node: EventTarget | null): boolean {
    if (!(node instanceof Element)) return false;
    return node.closest("a, button, input, select, textarea, [role='button']") != null;
}

/**
 * A tap (not a scroll/drag) within slop.
 *
 * @param start - Pointer down.
 * @param end - Pointer up.
 * @param slop - Max movement in px.
 */
export function isTapNotDrag(
    start: IPointerPoint,
    end: IPointerPoint,
    slop: number = CHAT_KEYBOARD_TAP_SLOP_PX,
): boolean {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    return (dx * dx) + (dy * dy) <= slop * slop;
}

/**
 * Write keyboard chrome onto `html` (attribute + CSS vars). No React state.
 *
 * @param chrome - Open flag and visual-viewport geometry.
 */
export function applyChatKeyboardChrome(chrome: IChatKeyboardChrome): void {
    const { inset, open, root, vvHeight, vvOffsetTop } = chrome;
    if (open) {
        root.setAttribute(CHAT_KEYBOARD_ATTR, CHAT_KEYBOARD_OPEN);
    } else {
        root.removeAttribute(CHAT_KEYBOARD_ATTR);
    }
    root.style.setProperty(CHAT_KEYBOARD_INSET_VAR, `${inset}px`);
    root.style.setProperty(CHAT_VV_HEIGHT_VAR, `${vvHeight}px`);
    root.style.setProperty(CHAT_VV_OFFSET_TOP_VAR, `${vvOffsetTop}px`);
}

/**
 * Remove keyboard chrome from `html`.
 *
 * @param root - Usually `document.documentElement`.
 */
export function clearChatKeyboardChrome(root: HTMLElement): void {
    root.removeAttribute(CHAT_KEYBOARD_ATTR);
    root.style.removeProperty(CHAT_KEYBOARD_INSET_VAR);
    root.style.removeProperty(CHAT_VV_HEIGHT_VAR);
    root.style.removeProperty(CHAT_VV_OFFSET_TOP_VAR);
}

/**
 * Blur the focused Chat-tab field so the software keyboard dismisses.
 */
export function blurChatTabField(): void {
    const el = document.activeElement;
    if (el instanceof HTMLElement && isChatTabField(el)) {
        el.blur();
    }
}

/**
 * Skip programmatic composer focus on the phone tab shell.
 */
export function shouldSkipChatInputAutofocus(): boolean {
    return isPhoneTabShell();
}

/**
 * Read visual-viewport geometry. Falls back to `innerHeight` when
 * `visualViewport` is missing (jsdom, older WebViews).
 */
export function readVisualViewport(
    win: Pick<Window, "innerHeight" | "visualViewport"> = window,
): Omit<IChatKeyboardChrome, "open" | "root"> {
    const vv = win.visualViewport;
    const vvHeight = vv?.height ?? win.innerHeight;
    const vvOffsetTop = vv?.offsetTop ?? 0;
    return {
        inset: computeKeyboardInset(win.innerHeight, vvHeight, vvOffsetTop),
        vvHeight,
        vvOffsetTop,
    };
}

/**
 * Chrome is open while a Chat-tab field is focused, or while iOS still
 * reports a keyboard inset after blur (so the composer follows the
 * keyboard down).
 *
 * @param focused - A Chat-tab field is focused.
 * @param inset - Current keyboard inset.
 */
export function isChatKeyboardOpen(focused: boolean, inset: number): boolean {
    return focused || isKeyboardInset(inset);
}

let threadPointerStart: IPointerPoint | null = null;

/**
 * Record a thread pointer-down for tap-to-dismiss. Ignores interactive
 * targets and viewports that are not the phone tab shell.
 *
 * @param event - Pointer down on the conversation.
 */
export function onChatThreadPointerDown(event: {
    clientX: number;
    clientY: number;
    target: EventTarget | null;
}): void {
    if (!isPhoneTabShell()) return;
    if (document.documentElement.getAttribute(CHAT_KEYBOARD_ATTR) !== CHAT_KEYBOARD_OPEN) {
        threadPointerStart = null;
        return;
    }
    if (isInteractiveThreadTarget(event.target)) {
        threadPointerStart = null;
        return;
    }
    threadPointerStart = { x: event.clientX, y: event.clientY };
}

/**
 * Dismiss the keyboard on a tap (not a drag) on the thread.
 *
 * @param event - Pointer up on the conversation.
 */
export function onChatThreadPointerUp(event: {
    clientX: number;
    clientY: number;
    target: EventTarget | null;
}): void {
    const start = threadPointerStart;
    threadPointerStart = null;
    if (start == null) return;
    if (isInteractiveThreadTarget(event.target)) return;
    if (!isTapNotDrag(start, { x: event.clientX, y: event.clientY })) return;
    blurChatTabField();
}

/** Clear an in-flight thread tap (pointer cancel). */
export function onChatThreadPointerCancel(): void {
    threadPointerStart = null;
}
