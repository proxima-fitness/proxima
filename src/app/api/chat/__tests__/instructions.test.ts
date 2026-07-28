/**
 * @vitest-environment node
 */
import { describe, it, expect, vi } from "vitest";

import { instructions } from "@/app/api/chat/instructions/instructions";
import { getTools } from "@/app/api/chat/tools/tools";
import { initializeConstraintProfile } from "@/app/api/chat/constraints";
import { initializeTrainingProfile } from "@/app/api/chat/training-profile";

vi.mock("@/api/user-constraints", () => ({
    upsertUserConstraints: vi.fn(async () => {}),
}));

vi.mock("@/api/user-training-profile", () => ({
    upsertUserTrainingProfile: vi.fn(async () => {}),
    emptyUserTrainingProfile: () => ({
        age: null,
        sex: "",
        heightCm: null,
        experienceLevel: "",
        physiquePhase: "",
        trainingFocus: "",
        activityLevel: "",
        sessionDurationMin: null,
    }),
}));

vi.mock("@/components/program-builder/api/hevy", () => ({
    getHevyExercises: vi.fn(async () => []),
}));

describe("chat instructions.ts", () => {
    describe("instructions()", () => {
        it("includes daysPerWeek, programLength, and workflow tokens for empty program", () => {
            const prompt = instructions({
                hevyProgram: [],
                daysPerWeek: 4,
                programLength: 8,
            });

            expect(prompt).toContain("4");
            expect(prompt).toContain("8");
            expect(prompt).toContain("planProgram");
            expect(prompt).toContain("readProgram");
            expect(prompt).not.toContain('purpose "edit"');
            expect(prompt).not.toContain('purpose "analyze"');
            expect(prompt).not.toContain("getCurrentProgram");
            expect(prompt).toContain("buildWeek");
            expect(prompt).toContain("mutateProgram");
            expect(prompt).not.toContain("modifyProgram");
            expect(prompt).toContain("getMoreInfoQuestions");
            expect(prompt).toContain("openHevyExportGate");
            expect(prompt).toContain("Mandatory skill loading");
            expect(prompt).toContain("loadSkill");
            expect(prompt).toContain("build-program");
            expect(prompt).toContain("mutate-program");
            expect(prompt).toContain("first message");
            expect(prompt).not.toContain("two flows");
            expect(prompt).not.toContain("Periodization after buildWeek");
            expect(prompt).not.toContain("mutateProgram payloads");
            expect(prompt).not.toContain("list every active constraint");
            expect(prompt).toContain("Before mutateProgram (mandatory)");
            expect(prompt).toContain("Honor the Active Constraint Profile");
            expect(prompt).toContain("Exercise objection");
            expect(prompt).toContain("Constraint Profile");
            expect(prompt).toContain("Constraint profile persistence");
            expect(prompt).toContain("updateConstraintProfile");
            expect(prompt).toContain("After questionnaire");
            expect(prompt).toContain("do not call");
            expect(prompt).toContain("nothing to persist");
        });

        it("keeps thin Before-mutate and User-stated change; drops cut essays", () => {
            const prompt = instructions({
                hevyProgram: [],
                daysPerWeek: 4,
                programLength: 8,
            });

            expect(prompt).toContain("Before mutateProgram (mandatory)");
            expect(prompt).toContain("zero exercise rows");
            expect(prompt).toContain("Constraint profile persistence");
            expect(prompt).not.toContain("Program tools - two flows");
            expect(prompt).not.toContain("All slot targeting is **0-based**");
            expect(prompt).not.toMatch(/full conversation/i);
        });

        it("encodes User-stated change soft policy for constraint removals", () => {
            const prompt = instructions({
                hevyProgram: [],
                daysPerWeek: 4,
                programLength: 8,
            });

            expect(prompt).toContain("User-stated change");
            expect(prompt).toContain("Edit profile");
            expect(prompt).toContain("removeExcludedEquipment");
            expect(prompt).toContain("removeInjuries");
            expect(prompt).toContain("removeExcludedAreas");
            expect(prompt).toContain("removeChatRefinements");
            expect(prompt).toMatch(/never.*preferred split/i);
            expect(prompt).toMatch(/adapt the program/i);
            expect(prompt).toMatch(/do not edit the profile down/i);
        });

        it("updateConstraintProfile tool description mirrors User-stated change soft policy", () => {
            const tools = getTools({
                constraintProfile: initializeConstraintProfile({}),
            });
            const description =
                (tools.updateConstraintProfile as { description?: string }).description ?? "";

            expect(description).toContain("User-stated change");
            expect(description).toContain("Edit profile");
            expect(description).toMatch(/Never call removeExcludedEquipment/i);
            expect(description).toMatch(/adapt the program to the profile/i);
            expect(description).toMatch(/do not edit the profile down/i);
        });

        it("includes workflow when program is non-empty", () => {
            const prompt = instructions({
                hevyProgram: [
                    { id: "1", title: "Day 1", folder_id: 0, order: "1", notes: "", created_at: "", updated_at: "", exercises: [] },
                ],
                daysPerWeek: 3,
                programLength: 4,
            });

            expect(prompt).toContain("planProgram");
            expect(prompt).toContain("readProgram");
            expect(prompt).not.toContain('purpose "edit"');
            expect(prompt).not.toContain('purpose "analyze"');
            expect(prompt).not.toContain("getCurrentProgram");
            expect(prompt).toContain("buildWeek");
            expect(prompt).toContain("3");
            expect(prompt).toContain("4");
        });

        it("includes health in questionnaire preferences when healthIssues is non-empty", () => {
            const prompt = instructions({
                hevyProgram: [],
                daysPerWeek: 4,
                programLength: 8,
                healthIssues: " knee, lower_back ",
            });

            expect(prompt).toContain("Questionnaire preferences");
            expect(prompt).toContain("Health / injury: knee, lower_back");
            expect(prompt).toContain("exercise selection, volume, and movement choices");
        });

        it("omits questionnaire preferences line when healthIssues is whitespace-only and no other prefs", () => {
            const prompt = instructions({
                hevyProgram: [],
                daysPerWeek: 4,
                programLength: 8,
                healthIssues: "   ",
            });

            expect(prompt).not.toContain("Questionnaire preferences");
        });

        it("includes exclude equipment in questionnaire preferences when set", () => {
            const prompt = instructions({
                hevyProgram: [],
                daysPerWeek: 4,
                programLength: 8,
                excludeEquipment: " bodyweight, band ",
            });

            expect(prompt).toContain("Questionnaire preferences");
            expect(prompt).toContain("Exclude equipment: bodyweight, band");
        });

        it("includes questionnaire preferences when any of split / variability / progression / deload / peak / warmups are set", () => {
            const prompt = instructions({
                hevyProgram: [],
                daysPerWeek: 4,
                programLength: 8,
                splitType: "ppl",
                exerciseVariability: "little",
                progressionSystem: "linear",
                deloadWeek: "yes",
                peakWeek: "no",
                warmupExercises: "yes",
            });

            expect(prompt).toContain("Questionnaire preferences");
            expect(prompt).toContain("Preferred split: ppl");
            expect(prompt).toContain("Exercise variability: little");
            expect(prompt).toContain("Progression system: linear");
            expect(prompt).toContain("Deload week: yes");
            expect(prompt).toContain("Peak week: no");
            expect(prompt).toContain("Warmup exercises: yes");
        });

        it("includes warmup exercises preference when set alone", () => {
            const prompt = instructions({
                hevyProgram: [],
                daysPerWeek: 4,
                programLength: 8,
                warmupExercises: "no",
            });

            expect(prompt).toContain("Questionnaire preferences");
            expect(prompt).toContain("Warmup exercises: no");
        });

        it("omits questionnaire preferences line when health, exclude equipment, and split-related fields are empty", () => {
            const prompt = instructions({
                hevyProgram: [],
                daysPerWeek: 4,
                programLength: 8,
                healthIssues: "",
                excludeEquipment: "",
                splitType: "  ",
                exerciseVariability: "",
            });

            expect(prompt).not.toContain("Questionnaire preferences");
        });

        it("includes Active Training Profile block when any field is set", () => {
            const prompt = instructions({
                hevyProgram: [],
                daysPerWeek: 4,
                programLength: 8,
                trainingProfile: initializeTrainingProfile({
                    age: 28,
                    sex: "male",
                    heightCm: 180,
                    experienceLevel: "intermediate",
                    physiquePhase: "bulk",
                    trainingFocus: "powerbuilding",
                    activityLevel: "moderate",
                    sessionDurationMin: 60,
                }),
            });

            expect(prompt).toContain("## Active Training Profile");
            expect(prompt).toContain("Age: 28");
            expect(prompt).toContain("Sex: male");
            expect(prompt).toContain("Height: 180 cm");
            expect(prompt).toContain("Experience level: intermediate");
            expect(prompt).toContain("Physique phase: bulk");
            expect(prompt).toContain("Training focus: powerbuilding");
            expect(prompt).toContain("Activity level: moderate");
            expect(prompt).toContain("Session duration cap: 60 min");
            expect(prompt).toContain("updateTrainingProfile");
            expect(prompt).toContain("Training profile persistence");
        });

        it("omits Active Training Profile block when all fields empty", () => {
            const prompt = instructions({
                hevyProgram: [],
                daysPerWeek: 4,
                programLength: 8,
                trainingProfile: initializeTrainingProfile({}),
            });

            expect(prompt).not.toContain("## Active Training Profile");
        });

        it("includes getWorkoutHistory guidance when hasWorkoutHistoryAccess is true", () => {
            const prompt = instructions({
                hevyProgram: [],
                daysPerWeek: 4,
                programLength: 8,
                hasWorkoutHistoryAccess: true,
            });

            expect(prompt).toContain("getWorkoutHistory");
            expect(prompt).toContain("Workout history:");
            expect(prompt).toContain("logged training");
        });

        it("omits getWorkoutHistory guidance for free users", () => {
            const prompt = instructions({
                hevyProgram: [],
                daysPerWeek: 4,
                programLength: 8,
                hasWorkoutHistoryAccess: false,
            });

            expect(prompt).not.toContain("getWorkoutHistory");
            expect(prompt).not.toContain("Workout history:");
        });

        it("includes Latest Body Measurement block when a measurement is present", () => {
            const prompt = instructions({
                hevyProgram: [],
                daysPerWeek: 4,
                programLength: 8,
                latestBodyMeasurement: {
                    id: "bm-1",
                    user_id: "user-1",
                    source: "hevy",
                    external_id: "2024-08-14",
                    measured_on: "2024-08-14",
                    weight_kg: 80.5,
                    lean_mass_kg: 65,
                    fat_percent: 18.5,
                    neck_cm: null,
                    shoulder_cm: null,
                    chest_cm: null,
                    left_bicep_cm: null,
                    right_bicep_cm: null,
                    left_forearm_cm: null,
                    right_forearm_cm: null,
                    abdomen: null,
                    waist: 80,
                    hips: null,
                    left_thigh: null,
                    right_thigh: null,
                    left_calf: null,
                    right_calf: null,
                    created_at: "2024-08-14T00:00:00Z",
                    updated_at: "2024-08-14T00:00:00Z",
                },
            });

            expect(prompt).toContain("## Latest Body Measurement");
            expect(prompt).toContain("Measured on: 2024-08-14");
            expect(prompt).toContain("Weight: 80.5 kg");
            expect(prompt).toContain("Waist: 80 cm");
        });

        it("omits Latest Body Measurement block when absent", () => {
            const prompt = instructions({
                hevyProgram: [],
                daysPerWeek: 4,
                programLength: 8,
                latestBodyMeasurement: null,
            });

            expect(prompt).not.toContain("## Latest Body Measurement");
        });

        it("includes getBodyMeasurements guidance when hasBodyMeasurementsAccess is true", () => {
            const prompt = instructions({
                hevyProgram: [],
                daysPerWeek: 4,
                programLength: 8,
                hasBodyMeasurementsAccess: true,
            });

            expect(prompt).toContain("getBodyMeasurements");
            expect(prompt).toContain("Body measurements:");
            expect(prompt).toContain("measurement history or trends");
        });

        it("omits getBodyMeasurements guidance for free users but still injects latest when present", () => {
            const prompt = instructions({
                hevyProgram: [],
                daysPerWeek: 4,
                programLength: 8,
                hasBodyMeasurementsAccess: false,
                latestBodyMeasurement: {
                    id: "bm-1",
                    user_id: "user-1",
                    source: "hevy",
                    external_id: "2024-08-14",
                    measured_on: "2024-08-14",
                    weight_kg: 80.5,
                    lean_mass_kg: null,
                    fat_percent: null,
                    neck_cm: null,
                    shoulder_cm: null,
                    chest_cm: null,
                    left_bicep_cm: null,
                    right_bicep_cm: null,
                    left_forearm_cm: null,
                    right_forearm_cm: null,
                    abdomen: null,
                    waist: null,
                    hips: null,
                    left_thigh: null,
                    right_thigh: null,
                    left_calf: null,
                    right_calf: null,
                    created_at: "2024-08-14T00:00:00Z",
                    updated_at: "2024-08-14T00:00:00Z",
                },
            });

            expect(prompt).not.toContain("getBodyMeasurements");
            expect(prompt).not.toContain("Body measurements:");
            expect(prompt).toContain("## Latest Body Measurement");
            expect(prompt).toContain("Weight: 80.5 kg");
        });
        it("includes weight display unit guidance for lbs UI", () => {
            const prompt = instructions({
                hevyProgram: [],
                daysPerWeek: 4,
                programLength: 8,
                isInLbs: true,
            });
            expect(prompt).toContain("Weight units");
            expect(prompt).toContain("lbs (pounds)");
            expect(prompt).toContain("weight_display");
        });

        it("anon + missing key: call openHevyExportGate; Save + Week Export chrome; no builder Export", () => {
            const prompt = instructions({
                hevyProgram: [{ id: "1", title: "Day 1", folder_id: 0, notes: "", exercises: [] }],
                daysPerWeek: 4,
                programLength: 8,
                isAuthenticated: false,
                hasHevyApiKey: false,
            });
            expect(prompt).toContain("Upload to Hevy / Week Export");
            expect(prompt).toContain("authenticated = **no**");
            expect(prompt).toContain("Hevy API key on file = **no**");
            expect(prompt).toContain("openHevyExportGate");
            expect(prompt).toContain("toolbar **Save**");
            expect(prompt).toContain("**Week Export**");
            expect(prompt).toContain("Never tell them to click **Export** in the builder toolbar");
            expect(prompt).not.toContain("**Export** button in the top-right");
            expect(prompt).not.toContain("sign in first");
        });

        it("authenticated + hasHevyApiKey: text-only Save / Week Export; do not call gate", () => {
            const prompt = instructions({
                hevyProgram: [{ id: "1", title: "Day 1", folder_id: 0, notes: "", exercises: [] }],
                daysPerWeek: 4,
                programLength: 8,
                isAuthenticated: true,
                hasHevyApiKey: true,
            });
            expect(prompt).toContain("Upload to Hevy / Week Export");
            expect(prompt).toContain("authenticated = **yes**");
            expect(prompt).toContain("Hevy API key on file = **yes**");
            expect(prompt).toContain("Both prerequisites done");
            expect(prompt).toContain("Do **not** call **openHevyExportGate**");
            expect(prompt).toContain("toolbar **Save**");
            expect(prompt).toContain("**Week Export**");
            expect(prompt).not.toContain("**Export** button in the top-right");
        });

        it("empty program: refuse openHevyExportGate", () => {
            const prompt = instructions({
                hevyProgram: [],
                daysPerWeek: 4,
                programLength: 8,
                isAuthenticated: false,
                hasHevyApiKey: false,
            });
            expect(prompt).toContain("Empty program");
            expect(prompt).toContain("Do **not** call **openHevyExportGate**");
            expect(prompt).toContain("build (or finish) a program first");
        });

        it("Questionnaire-active refuse copy present", () => {
            const prompt = instructions({
                hevyProgram: [{ id: "1", title: "Day 1", folder_id: 0, notes: "", exercises: [] }],
                daysPerWeek: 4,
                programLength: 8,
            });
            expect(prompt).toContain("Questionnaire gate active");
            expect(prompt).toContain("dismiss or complete the questionnaire");
        });
    });
});

