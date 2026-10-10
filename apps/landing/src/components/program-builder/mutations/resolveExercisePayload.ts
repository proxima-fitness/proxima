// SPDX-License-Identifier: AGPL-3.0-only

import type { TInsertExercisePayload, TSwapExerciseTemplateMinimalTo } from "./schemas";

export type { TSwapExerciseTemplateMinimalTo } from "./schemas";

export type TResolveSwapTemplateToResult =
    | { ok: true; payload: TSwapExerciseTemplateMinimalTo & { title: string } }
    | { ok: false; reason: string };

/** Catalog title for swap `to` when preserve_sets is true. Ignores a model-supplied name. */
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

    return { ok: true, payload: { ...to, title: canonicalTitle } };
}

export type TResolveExercisePayloadResult =
    | { ok: true; payload: TInsertExercisePayload }
    | { ok: false; reason: string };

/** Catalog title from template id; fail when the id is unknown. Ignores a model-supplied name. */
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

    return { ok: true, payload: { ...payload, title: canonicalTitle } };
}
