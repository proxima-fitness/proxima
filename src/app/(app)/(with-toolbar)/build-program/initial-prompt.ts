import type { Dispatch, SetStateAction } from "react";
import type { FileUIPart } from "ai";
import {
    LONG_PROMPT_PLACEHOLDER,
    PENDING_ATTACHMENTS_KEY,
    PENDING_INITIAL_PROMPT_KEY,
} from "@/assets/constants/ui-constants";
import {
    focusAreasOptions,
    equipmentOptions,
    healthIssuesOptions,
} from "@/assets/constants/form-options";
import {
    inferDaysPerWeek,
    inferProgramLength,
    inferExcludeAreas,
    inferExcludeEquipment,
    inferHealthIssues,
} from "@/components/program-builder/utils/helpers";
import type { IOption } from "@/components/ui/multi-select";
import type { ProgramLengthOption } from "./use-program-request-state";

/** True when the `shareId` query param should load a shared program from the API. */
export function isValidShareId(shareId: string): boolean {
    if (!shareId.trim()) return false;
    const n = Number(shareId);
    return Number.isFinite(n) && n > 0;
}

export function resolveInitialPromptText(search: string): string {
    if (search !== LONG_PROMPT_PLACEHOLDER) return search;
    if (typeof sessionStorage === "undefined") return "";
    return sessionStorage.getItem(PENDING_INITIAL_PROMPT_KEY) ?? "";
}

export function clearLongPromptFromSessionStorage(isLongPromptPlaceholder: boolean): void {
    if (!isLongPromptPlaceholder || typeof sessionStorage === "undefined") return;
    sessionStorage.removeItem(PENDING_INITIAL_PROMPT_KEY);
}

export function readPendingAttachmentFileParts(): FileUIPart[] | undefined {
    if (typeof sessionStorage === "undefined") return undefined;
    try {
        const stored = sessionStorage.getItem(PENDING_ATTACHMENTS_KEY);
        if (!stored) return undefined;
        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed)) return undefined;
        const files = parsed.filter(
            (p): p is FileUIPart =>
                p != null && typeof p === "object" && p.type === "file" && typeof (p as FileUIPart).url === "string",
        );
        sessionStorage.removeItem(PENDING_ATTACHMENTS_KEY);
        return files.length > 0 ? files : undefined;
    } catch {
        return undefined;
    }
}

export interface IProgramRequestInferenceTarget {
    daysPerWeek: string;
    programLength: ProgramLengthOption;
    excludeAreas: IOption[];
    excludeEquipment: IOption[];
    healthIssues: IOption[];
    setDaysPerWeek: Dispatch<SetStateAction<string>>;
    setProgramLength: Dispatch<SetStateAction<ProgramLengthOption>>;
    setExcludeAreas: Dispatch<SetStateAction<IOption[]>>;
    setExcludeEquipment: Dispatch<SetStateAction<IOption[]>>;
    setHealthIssues: Dispatch<SetStateAction<IOption[]>>;
}

export function inferProgramRequestFromPrompt(text: string, target: IProgramRequestInferenceTarget): void {
    if (!target.daysPerWeek) {
        const inferredDays = inferDaysPerWeek(text);
        if (inferredDays) target.setDaysPerWeek(inferredDays);
    }
    if (!target.programLength) {
        const inferredLength = inferProgramLength(text);
        if (inferredLength) target.setProgramLength(inferredLength as ProgramLengthOption);
    }
    if (target.excludeAreas.length === 0) {
        const inferred = inferExcludeAreas(text, focusAreasOptions);
        if (inferred.length > 0) target.setExcludeAreas(inferred);
    }
    if (target.excludeEquipment.length === 0) {
        const inferred = inferExcludeEquipment(text, equipmentOptions);
        if (inferred.length > 0) target.setExcludeEquipment(inferred);
    }
    if (target.healthIssues.length === 0) {
        const inferred = inferHealthIssues(text, healthIssuesOptions);
        if (inferred.length > 0) target.setHealthIssues(inferred);
    }
}
