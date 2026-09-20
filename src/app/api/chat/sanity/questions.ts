/**
 * @module chat/sanity/questions
 *
 * Named Program sanity check Nouls for one AI SDK `experimental_evaluate`
 * (ADR 0025 / 03, C7). Code skips a question when its premise is empty
 * (no `splitType` → no `constraint.splitHonor`). Question ids are for our
 * fail policy; Jev only sees `instructions` / `criteria`.
 *
 * Constraint ids are fail-closed and have no User-stated exception on
 * Andy-authored snapshots. First `buildWeek` is week 1 only, so progression,
 * week-intent, and stimulus questions wait until later weeks are in `matrix`.
 * Standalone later mutations omit whole-program Constraint questions
 * (split / variability / progression / deload / peak) and Training / skill
 * questions so a pre-existing grid cannot lock out every batch. Delta
 * Constraint questions (injury / equipment / warmup) stay only when
 * `changedDays` is non-empty.
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

/** Options for {@link buildSanityQuestions}. */
export type TBuildSanityQuestionsOptions = {
    /**
     * First `buildWeek` or same-turn periodization. Default true so callers
     * that omit it keep the Andy-authored question set.
     */
    andyAuthored?: boolean;
};

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
 * @param options.andyAuthored - See {@link TBuildSanityQuestionsOptions.andyAuthored}
 * @returns Question map; omitted keys are empty-premise skips
 */
export function buildSanityQuestions(
    snapshot: TProgramSanitySnapshot,
    options: TBuildSanityQuestionsOptions = {},
): TSanityQuestions {
    const andyAuthored = options.andyAuthored !== false;
    const hasChangedDays = snapshot.changedDays.length > 0;
    const askWholeProgramConstraints = andyAuthored;
    const askDeltaConstraints = andyAuthored || hasChangedDays;
    const askTrainingOrSkill = andyAuthored;

    const questions: TSanityQuestions = {};
    const constraints = snapshot.constraintProfile;
    const training = snapshot.trainingProfile;
    const prefs = constraints?.preferences;
    const injuries = (constraints?.injuries ?? []).filter(hasText);
    const excludedEquipment = (constraints?.excludedEquipment ?? []).filter(hasText);
    const hasLaterWeekChange = snapshot.changedDays.some((day) => day.week > 1);
    const hasLaterWeek = snapshot.matrix.some((row) => row.week > 1);
    const hasWeekIntents = snapshot.weekIntents.length > 0;
    const hasExercises = snapshot.matrix.some((row) => row.exercises.length > 0);
    const hasProgramType = hasText(training?.trainingFocus) || hasWeekIntents;

    if (askDeltaConstraints && injuries.length > 0) {
        questions["constraint.injurySemantic"] = noul(
            "Does `matrix` honor every limit in `constraintProfile.injuries`?",
            "Listed injuries are accommodated: aggravating patterns are absent or replaced with joint-friendly variations (machine, seated, limited ROM, supported). Rehab-appropriate work for a listed joint counts as honor.",
            "The week clearly loads an aggravating pattern for a listed injury (for example a deep loaded squat or lunge with knee or ankle limits) with no accommodation.",
        );
    }
    if (askDeltaConstraints && excludedEquipment.length > 0) {
        questions["constraint.equipmentSemantic"] = noul(
            "Does `matrix` honor `constraintProfile.excludedEquipment`?",
            "No listed exercise requires an excluded equipment type. Catalog types are distinct: a barbell is not `plate`, a cable is not `band`, and a machine is not `other` (sled/box/rope).",
            "At least one exercise requires excluded equipment of that same catalog type.",
        );
    }
    if (askWholeProgramConstraints && hasText(prefs?.splitType)) {
        questions["constraint.splitHonor"] = noul(
            "Does `matrix` honor `constraintProfile.preferences.splitType`?",
            "Day titles and exercise grouping match the stated split.",
            "The week is a different split than the stated preference.",
        );
    }
    if (askWholeProgramConstraints && hasText(prefs?.exerciseVariability)) {
        questions["constraint.variabilityHonor"] = noul(
            "Does `matrix` honor `constraintProfile.preferences.exerciseVariability`?",
            "Exercise variety across days matches the stated variability preference.",
            "Variety is clearly higher or lower than the stated preference.",
        );
    }
    if (askWholeProgramConstraints && hasLaterWeek && hasText(prefs?.progressionSystem)) {
        questions["constraint.progressionHonor"] = noul(
            "Does `matrix` honor `constraintProfile.preferences.progressionSystem` across the weeks that are present?",
            "Later weeks add load or reps in a way that matches the stated system. Target RPE on sets is compatible with linear and double progression. Only judge weeks present in `matrix`.",
            "Later weeks clearly follow a different progression system than the preference.",
        );
    }
    if (askWholeProgramConstraints && prefs?.deloadWeek === "yes") {
        questions["constraint.deloadHonor"] = noul(
            "Do the deload days in `matrix` honor a real deload given `weekIntents` and `constraintProfile.preferences.deloadWeek`?",
            "Claimed deload days are meaningfully easier in working-set count or RPE than week 1. `matchesWeek1Stimulus` is already computed; do not count.",
            "Claimed deload days still train hard, or the easier week is missing.",
        );
    }
    if (askWholeProgramConstraints && prefs?.peakWeek === "yes") {
        questions["constraint.peakHonor"] = noul(
            "Does `matrix` honor `constraintProfile.preferences.peakWeek` given `weekIntents`?",
            "A peak week is present and harder than surrounding weeks in a way that matches the preference.",
            "The stated peak-week preference is ignored.",
        );
    }
    if (askDeltaConstraints && hasText(prefs?.warmupExercises)) {
        questions["constraint.warmupPolicy"] = noul(
            "Does `matrix` honor `constraintProfile.preferences.warmupExercises`?",
            "Warmup presence matches the stated warmup preference.",
            "Warmups contradict the stated preference (missing when wanted, or present when not).",
        );
    }

    if (askTrainingOrSkill && training?.sessionDurationMin != null) {
        questions["training.sessionDurationFit"] = noul(
            "Does `matrix` fit `trainingProfile.sessionDurationMin` as a session-length cap?",
            "Each day's working work would finish near or under that many minutes for this trainee.",
            "At least one day is clearly too long or too empty for that cap.",
        );
        questions[userRequestedId("training.sessionDurationFit")] = userRequestedNoul(
            "a session shorter or longer than `trainingProfile.sessionDurationMin` minutes",
        );
    }
    if (askTrainingOrSkill && hasText(training?.experienceLevel)) {
        questions["training.experienceFit"] = noul(
            "Does `matrix` fit `trainingProfile.experienceLevel`?",
            "Volume, exercise choice, and complexity match that experience level.",
            "The week is clearly too advanced or too simple for that experience level.",
        );
        questions[userRequestedId("training.experienceFit")] = userRequestedNoul(
            "a week that does not fit `trainingProfile.experienceLevel`",
        );
    }
    if (askTrainingOrSkill && hasText(training?.physiquePhase)) {
        questions["training.physiquePhaseFit"] = noul(
            "Does `matrix` fit `trainingProfile.physiquePhase`?",
            "Volume and stimulus are reasonable for that phase. A cut or fat-loss phase can be a normal hypertrophy week at moderate volume. Do not require extra cardio, circuits, or an extreme volume cut.",
            "The week is clearly the wrong phase (for example a peaking max-out week on a cut, or a long deficit-style starvation week on a bulk).",
        );
        questions[userRequestedId("training.physiquePhaseFit")] = userRequestedNoul(
            "a week that does not fit `trainingProfile.physiquePhase`",
        );
    }
    if (askTrainingOrSkill && hasText(training?.trainingFocus)) {
        questions["training.trainingFocusFit"] = noul(
            "Does `matrix` fit `trainingProfile.trainingFocus`?",
            "Lift selection and set style match that focus. Fat-loss lifting is still resistance training; a machine or cable PPL is a fit. Do not require metcon, HIIT, or circuits.",
            "The week is aimed at a clearly different focus (for example a meet-peak powerlifting week when the focus is fat loss).",
        );
        questions[userRequestedId("training.trainingFocusFit")] = userRequestedNoul(
            "a week that does not fit `trainingProfile.trainingFocus`",
        );
    }
    if (askTrainingOrSkill && hasText(training?.activityLevel)) {
        questions["training.activityLevelFit"] = noul(
            "Does `matrix` fit `trainingProfile.activityLevel`?",
            "Weekly load is appropriate for that activity level.",
            "Weekly load is clearly too high or too low for that activity level.",
        );
        questions[userRequestedId("training.activityLevelFit")] = userRequestedNoul(
            "a week that does not fit `trainingProfile.activityLevel`",
        );
    }

    if (askTrainingOrSkill && hasExercises) {
        questions["skill.sessionShape"] = noul(
            "Does each day in `matrix` have a sound session shape (main lifts, accessories, not a thin or overloaded day)?",
            "Each training day has a coherent main-plus-accessories shape for its split role. A 3-4 exercise machine day is complete. Do not require 6 or more movements.",
            "A day is empty, is a single random lift, or mixes unrelated roles with no structure.",
        );
        questions[userRequestedId("skill.sessionShape")] = userRequestedNoul(
            "a thin, short, or unusually shaped training day",
        );
    }
    if (askTrainingOrSkill && hasLaterWeek && hasWeekIntents && hasExercises) {
        questions["skill.stimulusHonor"] = noul(
            "Do the days present in `matrix` honor the intent listed for those same weeks in `weekIntents` and the training goal?",
            "Stimulus matches the claimed intent for weeks that appear in `matrix`. Ignore weeks that are not in `matrix`. A normal hypertrophy week on a fat-loss or cut profile is a fit. Do not count rows; `matchesWeek1Stimulus` is already computed.",
            "A present week clearly fights its own claimed intent or the training goal.",
        );
        questions[userRequestedId("skill.stimulusHonor")] = userRequestedNoul(
            "stimulus that does not match the claimed week intent or goal",
        );
    }
    if (askTrainingOrSkill && hasLaterWeek && hasWeekIntents) {
        questions["skill.weekIntentHonor"] = noul(
            "Does each week in `matrix` honor its `weekIntents` name and intent?",
            "The week's days match that block's claimed intent.",
            "A week is labeled one intent but trained as another.",
        );
        questions[userRequestedId("skill.weekIntentHonor")] = userRequestedNoul(
            "a week that ignores its plan intent",
        );
    }
    if (askTrainingOrSkill && hasLaterWeekChange) {
        questions["skill.periodizationCoverage"] = noul(
            "Do the later-week days in `changedDays` semantically honor the periodization those days claim?",
            "The already-changed days are a real progression, deload, or peak versus week 1. Do not count how many days changed.",
            "The changed days are token edits that do not honor the claimed periodization.",
        );
        questions[userRequestedId("skill.periodizationCoverage")] = userRequestedNoul(
            "periodization that does not really change later weeks",
        );
    }
    if (askTrainingOrSkill && hasProgramType) {
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
