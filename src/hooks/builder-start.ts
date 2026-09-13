/**
 * @module builder-start
 *
 * **Start** visibility and href for the builder toolbar (ADR 0016 / 01).
 * Occupies the persist slot on prescription persist (**New path** /
 * **Edit program** / **Make into a program**) after a this-session **Save**,
 * while the grid is clean, and the program has zero **Program–Hevy links**.
 * Never on **Edit current week** / Hevy-only. Never beside **Save**.
 *
 * Depends on: edit-persist (TPersistMode)
 * Used by: BuildProgram, ToolbarPortalButtons, tests
 */

import type { TPersistMode } from "@/hooks/edit-persist";

export interface IShouldShowBuilderStartInput {
    hevyLinkCount: number | null;
    /** True after a successful **Save** this tab. */
    hasSaveBaseline: boolean;
    /** Unsaved content or undo vs last **Save**. */
    isDirty: boolean;
    persistMode: TPersistMode;
    programId: number | null;
}

/**
 * Coerce a chat / save id into a positive program id, or null.
 *
 * @param value - `programs.id` from Save or `chat_history.program_id`
 */
export function coerceProgramId(
    value: number | string | null | undefined,
): number | null {
    if (typeof value === "number" && Number.isInteger(value) && value > 0) {
        return value;
    }
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        if (Number.isInteger(parsed) && parsed > 0) {
            return parsed;
        }
    }
    return null;
}

/**
 * Program id **Start** may use. Sync entries have none even if a linked
 * program exists. Session Save wins over the chat row (same session, before
 * chat-ids refetch).
 *
 * @param input.chatProgramId - `chat_history.program_id` for this chat
 * @param input.persistMode - Toolbar persist mode
 * @param input.savedProgramId - Id from this session's successful Save
 */
export function prescriptionProgramIdForStart(input: {
    chatProgramId: number | null;
    persistMode: TPersistMode;
    savedProgramId: number | null;
}): number | null {
    if (input.persistMode !== "save") {
        return null;
    }
    return input.savedProgramId ?? input.chatProgramId;
}

/**
 * **Start** occupies the persist slot iff prescription persist ∧ this-session
 * **Save** ∧ clean grid ∧ `programs.id` ∧ zero links. `hevyLinkCount` null
 * means links are unknown — keep **Start** hidden (slot stays **Save**).
 *
 * @param input.hevyLinkCount - Link row count, or null while unknown
 * @param input.hasSaveBaseline - Successful **Save** in this tab
 * @param input.isDirty - Grid does not match last **Save**
 * @param input.persistMode - Save vs Sync
 * @param input.programId - Saved Proxima program id
 */
export function shouldShowBuilderStart(
    input: IShouldShowBuilderStartInput,
): boolean {
    if (input.persistMode !== "save") {
        return false;
    }
    if (input.programId == null) {
        return false;
    }
    if (!input.hasSaveBaseline) {
        return false;
    }
    if (input.isDirty) {
        return false;
    }
    return input.hevyLinkCount === 0;
}

/**
 * Profile href that carries this program so overview can select it (ADR 0016 / 02).
 *
 * @param programId - Saved Proxima program id
 */
export function builderStartHref(programId: number): string {
    return `/profile?programId=${programId}`;
}
