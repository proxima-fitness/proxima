/**
 * @module chat/sanity/questions
 *
 * Named Program sanity check Nouls for one TypeSafe `POST /v1/systemone`
 * (ADR 0025 / 03, C7). Code skips a question when its premise is empty
 * (no `splitType` → no `constraint.splitHonor`). Question ids are for our
 * fail policy; Jev only sees `instructions` / `criteria`.
 *
 * Constraint ids are fail-closed and have no User-stated exception.
 * Training / skill ids each get a `userRequested.<id>` companion Noul.
 * Age / sex / height and `skill.exerciseObjectionReplace` are never asked.
 *
 * Depends on: ./types
 * Used by: evaluate.ts
 */

import type { TProgramSanitySnapshot } from "./types";

/** Constraint-profile question ids. Fail-any, fail-closed, no User-stated exception. */
export const CONSTRAINT_QUESTION_IDS = [
    "constraint.injurySemantic",
    "constraint.equipmentSemantic",
    "constraint.splitHonor",
    "constraint.variabilityHonor",
    "constraint.progressionHonor",
    "constraint.deloadHonor",
    "constraint.peakHonor",
    "constraint.warmupPolicy",
] as const;

export type TConstraintQuestionId = (typeof CONSTRAINT_QUESTION_IDS)[number];

/** Training-profile question ids. Andy-authored only; User-stated exception + fail-open. */
export const TRAINING_QUESTION_IDS = [
    "training.sessionDurationFit",
    "training.experienceFit",
    "training.physiquePhaseFit",
    "training.trainingFocusFit",
    "training.activityLevelFit",
] as const;

export type TTrainingQuestionId = (typeof TRAINING_QUESTION_IDS)[number];

/** Skill-principle question ids. Same exception / confidence policy as Training. */
export const SKILL_QUESTION_IDS = [
    "skill.sessionShape",
    "skill.weekIntentHonor",
    "skill.stimulusHonor",
    "skill.periodizationCoverage",
    "skill.programTypeHonor",
] as const;

export type TSkillQuestionId = (typeof SKILL_QUESTION_IDS)[number];

export type THonorQuestionId =
    | TConstraintQuestionId
    | TTrainingQuestionId
    | TSkillQuestionId;

export const CONSTRAINT_QUESTION_ID_SET: ReadonlySet<string> = new Set(CONSTRAINT_QUESTION_IDS);
export const TRAINING_OR_SKILL_QUESTION_ID_SET: ReadonlySet<string> = new Set([
    ...TRAINING_QUESTION_IDS,
    ...SKILL_QUESTION_IDS,
]);

/** TypeSafe Noul body. `criteria` pins yes / no so Jev 1.13 does not invent a spectrum. */
export type TNoulQuestion = {
    type: "noul";
    instructions: string;
    criteria: {
        true: string;
        false: string;
    };
};

export type TSanityQuestions = Record<string, TNoulQuestion>;

/**
 * Companion id for a Training / skill User-stated exception Noul.
 *
 * @param id - Honor question id (`training.sessionDurationFit`, …)
 * @returns `userRequested.<id>`
 */
export function userRequestedId(id: string): string {
    return `userRequested.${id}`;
}

function hasText(value: string | null | undefined): boolean {
    return typeof value === "string" && value.trim().length > 0;
}

function noul(instructions: string, yes: string, no: string): TNoulQuestion {
    return {
        type: "noul",
        instructions,
        criteria: { true: yes, false: no },
    };
}

function userRequestedNoul(outcome: string): TNoulQuestion {
    return noul(
        `Did \`userMessage\` ask for this specific outcome: ${outcome}?`,
        "The user named that outcome in `userMessage`.",
        "The user did not ask for that outcome.",
    );
}

/**
 * Applicable Nouls for this snapshot. Keys are question ids. Empty object
 * means evaluate should not call TypeSafe.
 *
 * @param snapshot - Compact result after apply / first `buildWeek`
 * @returns Question map; omitted keys are empty-premise skips
 */
export function buildSanityQuestions(snapshot: TProgramSanitySnapshot): TSanityQuestions {
    const questions: TSanityQuestions = {};
    const constraints = snapshot.constraintProfile;
    const training = snapshot.trainingProfile;
    const prefs = constraints?.preferences;
    const injuries = (constraints?.injuries ?? []).filter(hasText);
    const excludedEquipment = (constraints?.excludedEquipment ?? []).filter(hasText);
    const hasLaterWeekChange = snapshot.changedDays.some((day) => day.week > 1);
    const hasWeekIntents = snapshot.weekIntents.length > 0;
    const hasExercises = snapshot.matrix.some((row) => row.exercises.length > 0);
    const hasProgramType = hasText(training?.trainingFocus) || hasWeekIntents;

    if (injuries.length > 0) {
        questions["constraint.injurySemantic"] = noul(
            "Does `matrix` honor every limit in `constraintProfile.injuries`?",
            "No exercise or set prescription would aggravate or ignore a listed injury or health limit, including limits that do not name a muscle group.",
            "At least one listed injury or health limit is ignored or contradicted.",
        );
    }
    if (excludedEquipment.length > 0) {
        questions["constraint.equipmentSemantic"] = noul(
            "Does `matrix` honor `constraintProfile.excludedEquipment`?",
            "No listed exercise requires excluded equipment, including names a catalog string match would miss.",
            "At least one exercise uses or requires excluded equipment.",
        );
    }
    if (hasText(prefs?.splitType)) {
        questions["constraint.splitHonor"] = noul(
            "Does `matrix` honor `constraintProfile.preferences.splitType`?",
            "Day titles and exercise grouping match the stated split.",
            "The week is a different split than the stated preference.",
        );
    }
    if (hasText(prefs?.exerciseVariability)) {
        questions["constraint.variabilityHonor"] = noul(
            "Does `matrix` honor `constraintProfile.preferences.exerciseVariability`?",
            "Exercise variety across days matches the stated variability preference.",
            "Variety is clearly higher or lower than the stated preference.",
        );
    }
    if (hasText(prefs?.progressionSystem)) {
        questions["constraint.progressionHonor"] = noul(
            "Does `matrix` honor `constraintProfile.preferences.progressionSystem`?",
            "Set prescriptions match the stated progression system (for example RPE-based vs linear).",
            "The prescriptions use a different progression system than the preference.",
        );
    }
    if (prefs?.deloadWeek === "yes") {
        questions["constraint.deloadHonor"] = noul(
            "Do the deload days in `matrix` honor a real deload given `weekIntents` and `constraintProfile.preferences.deloadWeek`?",
            "Claimed deload days are meaningfully easier in working-set count or RPE than week 1. `matchesWeek1Stimulus` is already computed; do not count.",
            "Claimed deload days still train hard, or the easier week is missing.",
        );
    }
    if (hasText(prefs?.peakWeek)) {
        questions["constraint.peakHonor"] = noul(
            "Does `matrix` honor `constraintProfile.preferences.peakWeek` given `weekIntents`?",
            "A peak week is present and harder than surrounding weeks in a way that matches the preference.",
            "The stated peak-week preference is ignored.",
        );
    }
    if (hasText(prefs?.warmupExercises)) {
        questions["constraint.warmupPolicy"] = noul(
            "Does `matrix` honor `constraintProfile.preferences.warmupExercises`?",
            "Warmup presence matches the stated warmup preference.",
            "Warmups contradict the stated preference (missing when wanted, or present when not).",
        );
    }

    if (training?.sessionDurationMin != null) {
        questions["training.sessionDurationFit"] = noul(
            "Does `matrix` fit `trainingProfile.sessionDurationMin` as a session-length cap?",
            "Each day's working work would finish near or under that many minutes for this trainee.",
            "At least one day is clearly too long or too empty for that cap.",
        );
        questions[userRequestedId("training.sessionDurationFit")] = userRequestedNoul(
            "a session shorter or longer than `trainingProfile.sessionDurationMin` minutes",
        );
    }
    if (hasText(training?.experienceLevel)) {
        questions["training.experienceFit"] = noul(
            "Does `matrix` fit `trainingProfile.experienceLevel`?",
            "Volume, exercise choice, and complexity match that experience level.",
            "The week is clearly too advanced or too simple for that experience level.",
        );
        questions[userRequestedId("training.experienceFit")] = userRequestedNoul(
            "a week that does not fit `trainingProfile.experienceLevel`",
        );
    }
    if (hasText(training?.physiquePhase)) {
        questions["training.physiquePhaseFit"] = noul(
            "Does `matrix` fit `trainingProfile.physiquePhase`?",
            "Volume and stimulus match that physique phase.",
            "The week fights that physique phase.",
        );
        questions[userRequestedId("training.physiquePhaseFit")] = userRequestedNoul(
            "a week that does not fit `trainingProfile.physiquePhase`",
        );
    }
    if (hasText(training?.trainingFocus)) {
        questions["training.trainingFocusFit"] = noul(
            "Does `matrix` fit `trainingProfile.trainingFocus`?",
            "Lift selection and set style match that training focus.",
            "The week is aimed at a different training focus.",
        );
        questions[userRequestedId("training.trainingFocusFit")] = userRequestedNoul(
            "a week that does not fit `trainingProfile.trainingFocus`",
        );
    }
    if (hasText(training?.activityLevel)) {
        questions["training.activityLevelFit"] = noul(
            "Does `matrix` fit `trainingProfile.activityLevel`?",
            "Weekly load is appropriate for that activity level.",
            "Weekly load is clearly too high or too low for that activity level.",
        );
        questions[userRequestedId("training.activityLevelFit")] = userRequestedNoul(
            "a week that does not fit `trainingProfile.activityLevel`",
        );
    }

    if (hasExercises) {
        questions["skill.sessionShape"] = noul(
            "Does each day in `matrix` have a sound session shape (main lifts, accessories, not a thin or overloaded day)?",
            "Each training day is a complete, balanced session.",
            "At least one day is thin, chaotic, or overloaded.",
        );
        questions[userRequestedId("skill.sessionShape")] = userRequestedNoul(
            "a thin, short, or unusually shaped training day",
        );
        questions["skill.stimulusHonor"] = noul(
            "Does the working-set count and RPE in `matrix` honor the week's intent in `weekIntents` and the user's training goal?",
            "Stimulus matches the claimed week intent and goal. Do not count rows; `matchesWeek1Stimulus` is already computed.",
            "Stimulus fights the claimed week intent or goal.",
        );
        questions[userRequestedId("skill.stimulusHonor")] = userRequestedNoul(
            "stimulus that does not match the claimed week intent or goal",
        );
    }
    if (hasWeekIntents) {
        questions["skill.weekIntentHonor"] = noul(
            "Does each week in `matrix` honor its `weekIntents` name and intent?",
            "The week's days match that block's claimed intent.",
            "A week is labeled one intent but trained as another.",
        );
        questions[userRequestedId("skill.weekIntentHonor")] = userRequestedNoul(
            "a week that ignores its plan intent",
        );
    }
    if (hasLaterWeekChange) {
        questions["skill.periodizationCoverage"] = noul(
            "Do the later-week days in `changedDays` semantically honor the periodization those days claim?",
            "The already-changed days are a real progression, deload, or peak versus week 1. Do not count how many days changed.",
            "The changed days are token edits that do not honor the claimed periodization.",
        );
        questions[userRequestedId("skill.periodizationCoverage")] = userRequestedNoul(
            "periodization that does not really change later weeks",
        );
    }
    if (hasProgramType) {
        questions["skill.programTypeHonor"] = noul(
            "Does `matrix` honor the program type implied by `trainingProfile.trainingFocus` and `weekIntents`?",
            "The week is the kind of program those fields describe.",
            "The week is a different kind of program.",
        );
        questions[userRequestedId("skill.programTypeHonor")] = userRequestedNoul(
            "a program type other than the one implied by training focus or plan",
        );
    }

    return questions;
}
