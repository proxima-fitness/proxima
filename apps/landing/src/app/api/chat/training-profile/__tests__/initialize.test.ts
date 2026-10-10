// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import { emptyUserTrainingProfile } from "@/api/user-training-profile";
import {
    initializeTrainingProfile,
    trainingProfileHasAnyField,
} from "../initialize";
import { mergeTrainingProfiles } from "../merge";

describe("initializeTrainingProfile", () => {
    it("returns empty profile for blank params", () => {
        expect(initializeTrainingProfile({})).toEqual(emptyUserTrainingProfile());
    });

    it("maps questionnaire advanced wire fields and drops unset sex sentinel", () => {
        const profile = initializeTrainingProfile({
            age: "28",
            sex: "__unset__",
            heightCm: 180,
            experienceLevel: "intermediate",
            physiquePhase: "bulk",
            trainingFocus: "powerbuilding",
            activityLevel: "moderate",
            sessionDurationMin: "60",
        });

        expect(profile).toEqual({
            age: 28,
            sex: "",
            heightCm: 180,
            experienceLevel: "intermediate",
            physiquePhase: "bulk",
            trainingFocus: "powerbuilding",
            activityLevel: "moderate",
            sessionDurationMin: 60,
        });
    });

    it("rejects out-of-range age/height and unknown catalog values", () => {
        const profile = initializeTrainingProfile({
            age: 10,
            sex: "other",
            heightCm: 90,
            experienceLevel: "elite",
            activityLevel: "light activity",
            sessionDurationMin: 7,
        });

        expect(profile).toEqual(emptyUserTrainingProfile());
    });

    it("snaps session duration to 10-minute steps", () => {
        expect(initializeTrainingProfile({ sessionDurationMin: 55 }).sessionDurationMin).toBe(60);
    });
});

describe("trainingProfileHasAnyField", () => {
    it("is false for empty profile", () => {
        expect(trainingProfileHasAnyField(emptyUserTrainingProfile())).toBe(false);
    });

    it("is true when any field set", () => {
        expect(
            trainingProfileHasAnyField({
                ...emptyUserTrainingProfile(),
                age: 30,
            }),
        ).toBe(true);
    });
});

describe("mergeTrainingProfiles", () => {
    it("returns session when no persisted row", () => {
        const session = initializeTrainingProfile({ age: 25, sex: "male" });
        expect(mergeTrainingProfiles(null, session)).toEqual(session);
    });

    it("session non-empty wins; empty session keeps persisted", () => {
        const persisted = initializeTrainingProfile({
            age: 40,
            sex: "female",
            experienceLevel: "advanced",
            heightCm: 170,
        });
        const session = initializeTrainingProfile({
            age: 28,
            experienceLevel: "beginner",
        });

        expect(mergeTrainingProfiles(persisted, session)).toEqual({
            age: 28,
            sex: "female",
            heightCm: 170,
            experienceLevel: "beginner",
            physiquePhase: "",
            trainingFocus: "",
            activityLevel: "",
            sessionDurationMin: null,
        });
    });
});
