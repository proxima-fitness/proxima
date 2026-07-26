/**
 * @module lib/builder-draft
 *
 * New-path local resume draft keys (`hevy-program-in-progress` + related).
 * Write only while unsaved. Cleared on Discard leave, banner Clear, successful Save.
 */

import { CHAT_MESSAGES_KEY } from "@/assets/constants/ui-constants";

export const BUILDER_DRAFT_KEY = "hevy-program-in-progress";
export const BUILDER_REQUEST_KEY = "hevy-request";
export const BUILDER_PROMPT_KEY = "prompt";

export const NEW_PATH_SAVE_SUCCESS_TOAST =
    "Program saved. Export week 1 from your profile.";

/** After Discard/Clear/Save, block debounced re-writes until the next dirty edit. */
let draftWriteEnabled = true;

/** Wipe resume draft + related build-program localStorage keys. */
export function clearBuilderDraft() {
    if (typeof window === "undefined") return;
    draftWriteEnabled = false;
    localStorage.removeItem(BUILDER_DRAFT_KEY);
    localStorage.removeItem(CHAT_MESSAGES_KEY);
    localStorage.removeItem(BUILDER_REQUEST_KEY);
    localStorage.removeItem(BUILDER_PROMPT_KEY);
}

/** Allow draft writes again (call on New-path edits). */
export function enableBuilderDraftWrites() {
    draftWriteEnabled = true;
}

export function canWriteBuilderDraft(): boolean {
    return draftWriteEnabled;
}

/** @internal test helper */
export function __resetBuilderDraftForTests() {
    draftWriteEnabled = true;
}
