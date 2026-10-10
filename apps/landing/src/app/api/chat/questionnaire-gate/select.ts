// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module chat/questionnaire-gate/select
 *
 * Rule-picks Questionnaire gate questions (ADR 0023). The agent must not choose extras.
 *
 * Depends on: form-options catalogs, TConstraintProfile, TTrainingProfile
 * Used by: getMoreInfoQuestions tool
 */

import {
    sampleQuestions,
    sampleQuestionsAdvanced,
    sampleQuestionsCore,
} from "@/assets/constants/form-options";
import type { TConstraintProfile } from "@/app/api/chat/constraints";

/** Matches builder gym-default excludes in `use-program-request-state`. Unconfirmed defaults are not a Constraint profile. */
export const GYM_DEFAULT_EXCLUDED_EQUIPMENT = [
    "band",
    "suspension",
    "resistance_band",
    "plate",
    "other",
] as const;

const GYM_DEFAULT_EXCLUDED_EQUIPMENT_SET = new Set<string>(GYM_DEFAULT_EXCLUDED_EQUIPMENT);

const PROGRAM_FORMAT_QUESTION_IDS = new Set(["program-length", "days-per-week"]);

const TRAINING_PROFILE_QUESTION_IDS = new Set([
    "age",
    "sex",
    "height",
    "experience-level",
    "physique-phase",
    "training-focus",
    "activity-level",
    "session-duration",
]);

const PROFILE_EDIT_PHRASES = [
    "update my profile",
    "edit my info",
    "edit my information",
    "fill in my training profile",
    "fill my training profile",
    "update my training profile",
    "edit my training profile",
    "add my training profile",
] as const;

export type TQuestionnaireGateReason =
    | "first-time"
    | "program-format"
    | "training-profile"
    | "none";

export type TQuestionnaireGateCompleteAction = "build" | "save";

export type TQuestionnaireGateSelection = {
    reason: TQuestionnaireGateReason;
    questions: TQuestion[];
    allowSkip: boolean;
    completeAction: TQuestionnaireGateCompleteAction;
    initialAnswers: Record<string, string | string[]>;
};

export type TSelectQuestionnaireGateInput = {
    userRequest?: string | null;
    persistedConstraintProfile?: TConstraintProfile | null;
    sessionConstraintProfile?: TConstraintProfile | null;
    daysPerWeek?: string | number | null;
    programLength?: string | number | null;
    trainingProfile?: TTrainingProfile | null;
};

function emptySelection(
    reason: TQuestionnaireGateReason,
    completeAction: TQuestionnaireGateCompleteAction = "build",
): TQuestionnaireGateSelection {
    return {
        reason,
        questions: [],
        allowSkip: false,
        completeAction,
        initialAnswers: {},
    };
}

function normalizeText(text: string): string {
    return text.toLowerCase().replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, "-");
}

function hasProfileEditPhrase(text: string): boolean {
    const normalized = normalizeText(text);
    return PROFILE_EDIT_PHRASES.some((phrase) => normalized.includes(phrase));
}

function isNewProgramRequest(text: string): boolean {
    const normalized = normalizeText(text);
    return (
        /\b(build|create|generate|make)\b/.test(normalized) &&
        /\b(program|routine|workout)\b/.test(normalized)
    );
}

/** True when this message is a Training profile / "update my profile" ask, not a new-program request. */
export function isTrainingProfileAsk(userRequest?: string | null): boolean {
    const text = userRequest?.trim() ?? "";
    if (!text) return false;
    if (!hasProfileEditPhrase(text)) return false;
    if (isNewProgramRequest(text)) return false;
    return true;
}

function hasNamedPositiveCount(value: string | number | null | undefined): boolean {
    if (value == null || value === "") return false;
    const n = Number(value);
    return Number.isFinite(n) && n > 0;
}

function requestNamesProgramLength(text: string): boolean {
    return /(\d+)\s*-?\s*week/.test(normalizeText(text));
}

function requestNamesDaysPerWeek(text: string): boolean {
    const normalized = normalizeText(text);
    if (/every\s+day/.test(normalized)) return true;
    if (/(\d)\s*x\s*(?:\/|\s*(?:a|per)\s*)?(?:week|wk)/.test(normalized)) return true;
    if (/(\d)\s*days?\s*(?:a|per)\s*week/.test(normalized)) return true;
    if (/\b(\d)\s*day\s+(?:program|split|routine)\b/.test(normalized)) return true;
    return false;
}

function equipmentBeyondGymDefaults(equipment: string[]): boolean {
    return equipment.some((value) => !GYM_DEFAULT_EXCLUDED_EQUIPMENT_SET.has(value.trim().toLowerCase()));
}

/**
 * True when the profile has captured constraints, not only unconfirmed gym-default excludes.
 *
 * @param profile - Persisted or session Constraint profile
 */
export function hasRealConstraintProfile(
    profile: TConstraintProfile | null | undefined,
): boolean {
    if (!profile) return false;
    if (profile.injuries.length > 0) return true;
    if (profile.excludedAreas.length > 0) return true;
    if (Object.values(profile.preferences).some((value) => value.trim() !== "")) return true;
    return equipmentBeyondGymDefaults(profile.excludedEquipment);
}

function trainingProfileInitialAnswers(
    profile: TTrainingProfile | null | undefined,
): Record<string, string | string[]> {
    if (!profile) return {};
    const answers: Record<string, string | string[]> = {};
    if (profile.age != null) answers.age = String(profile.age);
    if (profile.sex) answers.sex = profile.sex;
    if (profile.heightCm != null) answers.height = String(profile.heightCm);
    if (profile.experienceLevel) answers["experience-level"] = profile.experienceLevel;
    if (profile.physiquePhase) answers["physique-phase"] = profile.physiquePhase;
    if (profile.trainingFocus) answers["training-focus"] = profile.trainingFocus;
    if (profile.activityLevel) answers["activity-level"] = profile.activityLevel;
    if (profile.sessionDurationMin != null) {
        answers["session-duration"] = String(profile.sessionDurationMin);
    }
    return answers;
}

/**
 * Picks Questionnaire gate questions for this request.
 *
 * @param input.userRequest - Latest user text (tool `userRequest` or the chat message)
 * @param input.persistedConstraintProfile - DB Constraint profile; null when unsigned-in / no row
 * @param input.sessionConstraintProfile - Request-body session seed (gym defaults are not "real")
 */
export function selectQuestionnaireGateQuestions(
    input: TSelectQuestionnaireGateInput,
): TQuestionnaireGateSelection {
    const userRequest = input.userRequest ?? "";
    const trainingAnswers = trainingProfileInitialAnswers(input.trainingProfile);

    if (isTrainingProfileAsk(userRequest)) {
        return {
            reason: "training-profile",
            questions: sampleQuestionsAdvanced.filter((question) =>
                TRAINING_PROFILE_QUESTION_IDS.has(question.id),
            ),
            allowSkip: false,
            completeAction: "save",
            initialAnswers: trainingAnswers,
        };
    }

    const hasProfile =
        hasRealConstraintProfile(input.persistedConstraintProfile) ||
        hasRealConstraintProfile(input.sessionConstraintProfile);

    if (!hasProfile) {
        return {
            reason: "first-time",
            questions: sampleQuestions,
            allowSkip: true,
            completeAction: "build",
            initialAnswers: trainingAnswers,
        };
    }

    const hasLength =
        hasNamedPositiveCount(input.programLength) || requestNamesProgramLength(userRequest);
    const hasDays =
        hasNamedPositiveCount(input.daysPerWeek) || requestNamesDaysPerWeek(userRequest);

    if (hasLength && hasDays) {
        return emptySelection("none");
    }

    const neededIds = new Set<string>();
    if (!hasLength) neededIds.add("program-length");
    if (!hasDays) neededIds.add("days-per-week");

    return {
        reason: "program-format",
        questions: sampleQuestionsCore.filter((question) =>
            PROGRAM_FORMAT_QUESTION_IDS.has(question.id) && neededIds.has(question.id),
        ),
        allowSkip: false,
        completeAction: "build",
        initialAnswers: {},
    };
}
