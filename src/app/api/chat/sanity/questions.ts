/**
 * @module chat/sanity/questions
 *
 * Named Program sanity check Nouls for one AI SDK `experimental_evaluate`
 * (ADR 0025 / 03, C7). Code skips a question when its premise is empty
 * (no `splitType` → no `constraint.splitHonor`). Question ids are for our
 * fail policy; Jev only sees `instructions` / `criteria`.
 *
 * Constraint ids are fail-closed and have no User-stated exception on a
 * **First build**. Case 1 runs once on the plated + stamped mesocycle
 * (ADR 0027 / 04). `constraint.progressionHonor` is not asked: **Progression**
 * is not built, and the Periodization wave is not a progression system.
 * Skill phase honors (week intent, stimulus, periodization coverage) are not
 * asked (ADR 0032 C1): the matrix of title + set count + RPE cannot prove
 * Accumulation / Intensification / Peak semantics. Deload / peak hardness is
 * code (`week-coverage.ts`, ADR 0032 C2–C3), so `constraint.deloadHonor` and
 * `constraint.peakHonor` are not asked either.
 * Later standalone mutations (Case 2) omit whole-program Constraint questions
 * (split / variability) and Training / skill questions so a
 * pre-existing grid cannot lock out every batch. Delta Constraint questions
 * (injury / equipment / warmup) stay only when `changedDays` is non-empty.
 * Age / sex / height and `skill.exerciseObjectionReplace` are never asked.
 *
 * Injury and equipment are asked per pair (ADR 0030 / 02, C4): one question
 * per unique exercise title × each saved injury or excluded-equipment string.
 * First build reads titles from the full stamped mesocycle; Case 2 reads only
 * `changedDays`. No pair cap. Pair ids are fail-closed Constraint ids.
 *
 * Depends on: ./types, ./snapshot
 * Used by: evaluate.ts
 */

import { uniqueExerciseTitles } from "./snapshot";
import type {
    TConstraintPair,
    TConstraintPairField,
    TProgramSanitySnapshot,
} from "./types";

/** Whole-profile Constraint question ids. Fail-any, fail-closed, no User-stated exception. */
export const CONSTRAINT_QUESTION_IDS = [
    "constraint.splitHonor",
    "constraint.variabilityHonor",
    "constraint.warmupPolicy",
] as const;

export type TConstraintQuestionId = (typeof CONSTRAINT_QUESTION_IDS)[number];

/** Training-profile question ids. First-build only; User-stated exception + fail-open. */
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
    "skill.programTypeHonor",
] as const;

export type TSkillQuestionId = (typeof SKILL_QUESTION_IDS)[number];

export type THonorQuestionId =
    | TConstraintQuestionId
    | TTrainingQuestionId
    | TSkillQuestionId;

export const CONSTRAINT_QUESTION_ID_SET: ReadonlySet<string> = new Set(CONSTRAINT_QUESTION_IDS);

/** Pair id family per Constraint profile array (ADR 0030 C4). */
export const CONSTRAINT_PAIR_ID_PREFIX: Record<TConstraintPairField, string> = {
    injuries: "constraint.injury.",
    excludedEquipment: "constraint.equipment.",
};

/**
 * True for an injury / equipment pair id.
 *
 * @param id - Honor question id or Soft-fail `error`
 */
export function isConstraintPairId(id: string): boolean {
    return (
        id.startsWith(CONSTRAINT_PAIR_ID_PREFIX.injuries) ||
        id.startsWith(CONSTRAINT_PAIR_ID_PREFIX.excludedEquipment)
    );
}

/**
 * Fail-closed Constraint id: whole-profile honor or pair.
 *
 * @param id - Honor question id
 */
export function isConstraintQuestionId(id: string): boolean {
    return CONSTRAINT_QUESTION_ID_SET.has(id) || isConstraintPairId(id);
}

function pairSlug(value: string): string {
    const slug = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return slug || "x";
}

/**
 * Stable pair id for one exercise title × one saved string. Same inputs give
 * the same id on every retry, so Soft-fail counts per pair (C7).
 *
 * @param field - `injuries` or `excludedEquipment`
 * @param exerciseTitle - Exercise title on the matrix
 * @param constraint - Exact saved Constraint profile string
 * @returns e.g. `constraint.injury.squat-barbell.knee-pain`
 */
export function constraintPairId(
    field: TConstraintPairField,
    exerciseTitle: string,
    constraint: string,
): string {
    return `${CONSTRAINT_PAIR_ID_PREFIX[field]}${pairSlug(exerciseTitle)}.${pairSlug(constraint)}`;
}
export const TRAINING_OR_SKILL_QUESTION_ID_SET: ReadonlySet<string> = new Set([
    ...TRAINING_QUESTION_IDS,
    ...SKILL_QUESTION_IDS,
]);

/** Options for {@link buildSanityQuestions}. */
export type TBuildSanityQuestionsOptions = {
    /**
     * Case 1: the stamped **First build** snapshot from `buildProgram`.
     * Default true so callers that omit it keep the full first-build set.
     */
    firstBuild?: boolean;
};

/**
 * TypeSafe Noul body. `criteria` pins yes / no so Jev 1.13 does not invent a spectrum.
 * `pair` is ours only (the evaluate call strips it) so a miss can carry
 * structured Soft-fail detail.
 */
export type TNoulQuestion = {
    type: "noul";
    instructions: string;
    criteria: {
        true: string;
        false: string;
    };
    pair?: TConstraintPair;
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

function injuryPairNoul(pair: TConstraintPair): TNoulQuestion {
    return {
        ...noul(
            `Does the exercise ${JSON.stringify(pair.exerciseTitle)} in \`matrix\` honor the saved injury ${JSON.stringify(pair.constraint)} from \`constraintProfile.injuries\`?`,
            "That exercise does not aggravate that injury, or it is already a joint-friendly variation (machine, seated, limited ROM, supported). Rehab-appropriate work for that joint counts as honor. An exercise that does not load the injured area is honor.",
            "That exercise clearly loads an aggravating pattern for that injury (for example a deep loaded squat or lunge with a knee or ankle limit) with no accommodation.",
        ),
        pair,
    };
}

function equipmentPairNoul(pair: TConstraintPair): TNoulQuestion {
    return {
        ...noul(
            `Does the exercise ${JSON.stringify(pair.exerciseTitle)} in \`matrix\` avoid the excluded equipment ${JSON.stringify(pair.constraint)} from \`constraintProfile.excludedEquipment\`?`,
            "That exercise does not require that excluded equipment type. Catalog types are distinct: a barbell is not `plate`, a cable is not `band`, and a machine is not `other` (sled/box/rope).",
            "That exercise requires excluded equipment of that same catalog type.",
        ),
        pair,
    };
}

/**
 * One pair question per title × saved string (C4). No cap.
 *
 * @param questions - Map to add to
 * @param field - Constraint profile array
 * @param titles - Unique exercise titles in scope
 * @param constraints - Non-empty saved strings
 */
function addPairQuestions(
    questions: TSanityQuestions,
    field: TConstraintPairField,
    titles: string[],
    constraints: string[],
): void {
    for (const exerciseTitle of titles) {
        for (const constraint of constraints) {
            const id = constraintPairId(field, exerciseTitle, constraint);
            if (questions[id]) continue;
            const pair: TConstraintPair = { id, field, constraint, exerciseTitle };
            questions[id] = field === "injuries" ? injuryPairNoul(pair) : equipmentPairNoul(pair);
        }
    }
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
 * @param snapshot - Compact result after apply / stamped **First build**
 * @param options.firstBuild - See {@link TBuildSanityQuestionsOptions.firstBuild}
 * @returns Question map; omitted keys are empty-premise skips
 */
export function buildSanityQuestions(
    snapshot: TProgramSanitySnapshot,
    options: TBuildSanityQuestionsOptions = {},
): TSanityQuestions {
    const firstBuild = options.firstBuild !== false;
    const hasChangedDays = snapshot.changedDays.length > 0;
    const askWholeProgramConstraints = firstBuild;
    const askDeltaConstraints = firstBuild || hasChangedDays;
    const askTrainingOrSkill = firstBuild;

    const questions: TSanityQuestions = {};
    const constraints = snapshot.constraintProfile;
    const training = snapshot.trainingProfile;
    const prefs = constraints?.preferences;
    const injuries = (constraints?.injuries ?? []).filter(hasText);
    const excludedEquipment = (constraints?.excludedEquipment ?? []).filter(hasText);
    const hasWeekIntents = snapshot.weekIntents.length > 0;
    const hasExercises = snapshot.matrix.some((row) => row.exercises.length > 0);
    const hasProgramType = hasText(training?.trainingFocus) || hasWeekIntents;

    if (askDeltaConstraints && (injuries.length > 0 || excludedEquipment.length > 0)) {
        // First build: every title on the stamped mesocycle. Case 2: changed days only.
        const titles = uniqueExerciseTitles(
            snapshot.matrix,
            firstBuild ? undefined : snapshot.changedDays,
        );
        addPairQuestions(questions, "injuries", titles, injuries);
        addPairQuestions(questions, "excludedEquipment", titles, excludedEquipment);
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
