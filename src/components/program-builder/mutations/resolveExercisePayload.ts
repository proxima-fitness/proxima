import type { TInsertExercisePayload, TSwapExerciseTemplateMinimalTo } from "./schemas";

export type { TSwapExerciseTemplateMinimalTo } from "./schemas";

export type TResolveSwapTemplateToResult =
    | { ok: true; payload: TSwapExerciseTemplateMinimalTo & { title: string } }
    | { ok: false; reason: string };

/** Resolve optional title for swap `to` when preserve_sets is true. */
export function resolveSwapTemplateTo(
    to: TSwapExerciseTemplateMinimalTo,
    idToTitle: Map<string, string>,
): TResolveSwapTemplateToResult {
    const templateId = to.exercise_template_id?.trim();
    if (!templateId) {
        return { ok: false, reason: "Missing exercise_template_id" };
    }

    const canonicalTitle = idToTitle.get(templateId);
    if (!canonicalTitle) {
        return {
            ok: false,
            reason: `Unknown exercise_template_id "${templateId}". Call getExerciseList and use only IDs from that list.`,
        };
    }

    const title = to.title?.trim() ? to.title : canonicalTitle;
    return { ok: true, payload: { ...to, title } };
}

export type TResolveExercisePayloadResult =
    | { ok: true; payload: TInsertExercisePayload }
    | { ok: false; reason: string };

/** Resolve optional title from template catalog; fail when template id is unknown. */
export function resolveExercisePayload(
    payload: TInsertExercisePayload,
    idToTitle: Map<string, string>,
): TResolveExercisePayloadResult {
    const templateId = payload.exercise_template_id?.trim();
    if (!templateId) {
        return { ok: false, reason: "Missing exercise_template_id" };
    }

    const canonicalTitle = idToTitle.get(templateId);
    if (!canonicalTitle) {
        return {
            ok: false,
            reason: `Unknown exercise_template_id "${templateId}". Call getExerciseList and use only IDs from that list.`,
        };
    }

    const title = payload.title?.trim() ? payload.title : canonicalTitle;
    return { ok: true, payload: { ...payload, title } };
}
