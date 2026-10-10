// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import type { TConstraintProfile } from "@/app/api/chat/constraints";
import { emptyUserTrainingProfile } from "@/api/user-training-profile";
import {
    sampleQuestions,
    sampleQuestionsCore,
} from "@/assets/constants/form-options";
import {
    GYM_DEFAULT_EXCLUDED_EQUIPMENT,
    hasRealConstraintProfile,
    isTrainingProfileAsk,
    selectQuestionnaireGateQuestions,
} from "../select";

function profile(
    overrides: Omit<Partial<TConstraintProfile>, "preferences"> & {
        preferences?: Partial<TConstraintProfile["preferences"]>;
    } = {},
): TConstraintProfile {
    return {
        injuries: overrides.injuries ?? [],
        excludedEquipment: overrides.excludedEquipment ?? [],
        excludedAreas: overrides.excludedAreas ?? [],
        preferences: {
            splitType: "",
            exerciseVariability: "",
            progressionSystem: "",
            deloadWeek: "",
            peakWeek: "",
            warmupExercises: "",
            ...overrides.preferences,
        },
    };
}

describe("hasRealConstraintProfile", () => {
    it("rejects null and gym-default excludes only", () => {
        expect(hasRealConstraintProfile(null)).toBe(false);
        expect(hasRealConstraintProfile(profile())).toBe(false);
        expect(
            hasRealConstraintProfile(
                profile({ excludedEquipment: [...GYM_DEFAULT_EXCLUDED_EQUIPMENT] }),
            ),
        ).toBe(false);
    });

    it("accepts injuries, extra equipment, areas, or prefs", () => {
        expect(hasRealConstraintProfile(profile({ injuries: ["knee"] }))).toBe(true);
        expect(
            hasRealConstraintProfile(profile({ excludedEquipment: ["barbell"] })),
        ).toBe(true);
        expect(hasRealConstraintProfile(profile({ excludedAreas: ["legs"] }))).toBe(true);
        expect(
            hasRealConstraintProfile(profile({ preferences: { splitType: "ppl" } })),
        ).toBe(true);
    });
});

describe("isTrainingProfileAsk", () => {
    it("matches edit-profile phrasing and ignores new-program requests", () => {
        expect(isTrainingProfileAsk("update my profile")).toBe(true);
        expect(isTrainingProfileAsk("Please edit my info")).toBe(true);
        expect(isTrainingProfileAsk("fill in my training profile")).toBe(true);
        expect(isTrainingProfileAsk("build me a program")).toBe(false);
        expect(isTrainingProfileAsk("build me a program and update my profile")).toBe(
            false,
        );
    });
});

describe("selectQuestionnaireGateQuestions", () => {
    it("returns first-time catalog when there is no real Constraint profile", () => {
        const selected = selectQuestionnaireGateQuestions({
            userRequest: "build me a program",
            persistedConstraintProfile: null,
            sessionConstraintProfile: profile({
                excludedEquipment: [...GYM_DEFAULT_EXCLUDED_EQUIPMENT],
            }),
        });
        expect(selected.reason).toBe("first-time");
        expect(selected.questions).toEqual(sampleQuestions);
        expect(selected.allowSkip).toBe(true);
        expect(selected.completeAction).toBe("build");
    });

    it("prefills Training profile answers on first-time when a profile exists", () => {
        const training = {
            ...emptyUserTrainingProfile(),
            age: 28,
            trainingFocus: "bodybuilding" as const,
        };
        const selected = selectQuestionnaireGateQuestions({
            userRequest: "build me a program",
            trainingProfile: training,
        });
        expect(selected.initialAnswers).toEqual({
            age: "28",
            "training-focus": "bodybuilding",
        });
    });

    it("asks only missing program-format questions for a returning user", () => {
        const persisted = profile({ injuries: ["shoulder"] });
        const missingBoth = selectQuestionnaireGateQuestions({
            userRequest: "build me a new program",
            persistedConstraintProfile: persisted,
        });
        expect(missingBoth.reason).toBe("program-format");
        expect(missingBoth.questions.map((q) => q.id)).toEqual([
            "program-length",
            "days-per-week",
        ]);
        expect(missingBoth.allowSkip).toBe(false);

        const missingDays = selectQuestionnaireGateQuestions({
            userRequest: "build me a 12 week program",
            persistedConstraintProfile: persisted,
            programLength: 12,
        });
        expect(missingDays.questions.map((q) => q.id)).toEqual(["days-per-week"]);

        const namedInText = selectQuestionnaireGateQuestions({
            userRequest: "build me a 8 week 4 day program",
            persistedConstraintProfile: persisted,
        });
        expect(namedInText.reason).toBe("none");
        expect(namedInText.questions).toEqual([]);
    });

    it("skips the gate when returning and body already has length and days", () => {
        const selected = selectQuestionnaireGateQuestions({
            userRequest: "build another program",
            persistedConstraintProfile: profile({ injuries: ["knee"] }),
            programLength: 8,
            daysPerWeek: 4,
        });
        expect(selected.reason).toBe("none");
        expect(selected.questions).toEqual([]);
    });

    it("opens Training profile questions only on an explicit ask", () => {
        const selected = selectQuestionnaireGateQuestions({
            userRequest: "edit my info",
            persistedConstraintProfile: profile({ injuries: ["knee"] }),
            programLength: 8,
            daysPerWeek: 4,
            trainingProfile: {
                ...emptyUserTrainingProfile(),
                age: 31,
            },
        });
        expect(selected.reason).toBe("training-profile");
        expect(selected.completeAction).toBe("save");
        expect(selected.allowSkip).toBe(false);
        expect(selected.questions.every((q) =>
            [
                "age",
                "sex",
                "height",
                "experience-level",
                "physique-phase",
                "training-focus",
                "activity-level",
                "session-duration",
            ].includes(q.id),
        )).toBe(true);
        expect(selected.questions.some((q) => q.id === "program-length")).toBe(false);
        expect(selected.initialAnswers).toEqual({ age: "31" });
    });

    it("keeps core ids aligned with Questionnaire core", () => {
        expect(sampleQuestionsCore.map((q) => q.id)).toEqual([
            "program-length",
            "days-per-week",
            "exclude-equipment",
            "health-issues",
        ]);
    });
});
