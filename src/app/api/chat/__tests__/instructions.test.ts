/**
 * @vitest-environment node
 */
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import * as path from "node:path";

import { instructions } from "@/app/api/chat/instructions/instructions";
import { constraintPreferencesUpdateSchema, getTools } from "@/app/api/chat/tools/tools";
import { initializeConstraintProfile } from "@/app/api/chat/constraints";
import { initializeTrainingProfile } from "@/app/api/chat/training-profile";
import { REPLACE_LIFT_MESSAGE_PREFIX, replaceLiftMessage } from "@/app/api/chat/sanity/stalemate";

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
            // ADR 0030 / 01: no separate plan tool and no week-named land tool.
            expect(prompt).not.toMatch(/\bplan[A-Z]\w*|\bbuild[A-Z]*Week\b/);
            expect(prompt).toContain("readProgram");
            expect(prompt).not.toContain('purpose "edit"');
            expect(prompt).not.toContain('purpose "analyze"');
            expect(prompt).not.toContain("getCurrentProgram");
            expect(prompt).toContain("buildProgram");
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
            expect(prompt).not.toContain("Periodization after buildProgram");
            expect(prompt).not.toContain("mutateProgram payloads");
            expect(prompt).not.toContain("list every active constraint");
            expect(prompt).toContain("Before mutateProgram (mandatory)");
            expect(prompt).toContain("Empty training days are rejected");
            expect(prompt).toContain("explicit remove is allowed");
            expect(prompt).not.toContain("Honor the Active Constraint Profile");
            expect(prompt).not.toContain("put a replacement");
            expect(prompt).not.toContain("**Session size:**");
            expect(prompt).toContain("Exercise objection");
            expect(prompt).toContain("Mutation proposal");
            expect(prompt).toContain("I've updated");
            expect(prompt).toContain("Your program is now");
            expect(prompt).toContain("Constraint Profile");
            expect(prompt).toContain("Constraint profile persistence");
            expect(prompt).toContain("updateConstraintProfile");
            expect(prompt).toContain("After questionnaire");
            expect(prompt).toContain("do not call");
            expect(prompt).toContain("nothing to persist");
        });

        it("teaches Periodization as the wave on buildProgram: full retry after Soft-fail, summary after First build", () => {
            const prompt = instructions({
                hevyProgram: [],
                daysPerWeek: 4,
                programLength: 8,
            });

            expect(prompt).toContain("**Periodization wave**");
            expect(prompt).toContain("required **Periodization wave**");
            expect(prompt).toContain("call **buildProgram** again with the full input (a corrected wave goes on that same call)");
            expect(prompt).toContain("not a **mutateProgram** batch");
            expect(prompt).toContain("short summary of what landed, not an Accept ask");
            expect(prompt).not.toContain("periodize after buildProgram");
            expect(prompt).not.toContain("post-build periodization");
            expect(prompt).not.toContain("optional week-by-week progression");
        });

        it("buildProgram / readProgram descriptions teach the wave on the land call, not post-buildProgram mutate", () => {
            const tools = getTools({});
            const describe = (name: keyof typeof tools) =>
                (tools[name] as { description?: string }).description ?? "";

            expect(describe("buildProgram")).toContain("required **Periodization wave**");
            expect(describe("buildProgram")).toContain("applies the wave from this same call");
            expect(describe("buildProgram")).toContain("call buildProgram again with the full input");
            expect(describe("readProgram")).not.toMatch(/periodiz/i);
            expect(describe("readProgram")).toContain("live-grid **mutateProgram**");
        });

        it("keeps thin Before-mutate and User-stated change; drops cut essays", () => {
            const prompt = instructions({
                hevyProgram: [],
                daysPerWeek: 4,
                programLength: 8,
            });

            expect(prompt).toContain("Before mutateProgram (mandatory)");
            expect(prompt).toContain("Empty training days are rejected");
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
            expect(prompt).not.toContain("removeChatRefinements");
            expect(prompt).not.toContain("addChatRefinements");
            expect(prompt).toContain("addInjuries");
            expect(prompt).toContain("Injuries & health issues");
            expect(prompt).toMatch(/never periodization/i);
            expect(prompt).toMatch(/can't kneel/);
            expect(prompt).toMatch(/no overhead/);
            expect(prompt).toMatch(/do not strip "can't kneel"/);
            expect(prompt).toMatch(/never.*preferred split/i);
            expect(prompt).toMatch(/adapt the program/i);
            expect(prompt).toMatch(/do not edit the profile down/i);
            // ADR 0031 / 03: preference + Training null clears
            expect(prompt).toContain("preferences: { <key>: null }");
            expect(prompt).toContain("splitType: null");
            expect(prompt).toMatch(/never swap to Full Body/);
            expect(prompt).toContain("passing `null` for that field");
            expect(prompt).toContain("Program length and days per week are not cleared through these tools");
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
            expect(description).toContain("Injuries & health issues");
            expect(description).toMatch(/Never put periodization/i);
            // ADR 0031 / 03
            expect(description).toContain("preferences: { splitType: null }");
            expect(description).toMatch(/Replacing a preference with another catalog id/);
            expect(description).toMatch(/never "relax" a preference by swapping to Full Body/);
            expect(description).toContain("Program length and days per week are not cleared through this tool");
        });

        it("updateTrainingProfile tool description teaches null clears on User-stated change (ADR 0031 / 03)", () => {
            const tools = getTools({
                trainingProfile: initializeTrainingProfile({}),
            });
            const description =
                (tools.updateTrainingProfile as { description?: string }).description ?? "";

            expect(description).toContain("pass null for that field");
            expect(description).toContain("User-stated change");
            expect(description).toContain("sex: null");
            expect(description).toContain("age: null");
            expect(description).toMatch(/Never clear a Training profile field to unlock a program style/);
            expect(description).toContain("Program length and days per week are not cleared through this tool");
        });

        it("preference field describe teaches null clear vs replace (ADR 0031 / 03)", () => {
            expect(constraintPreferencesUpdateSchema.description).toContain("null clears on User-stated change only");
            expect(constraintPreferencesUpdateSchema.description).toMatch(/Replacing with another id/);
            expect(constraintPreferencesUpdateSchema.description).toContain("removeInjuries");

            const prefsObject = constraintPreferencesUpdateSchema._def.innerType as {
                shape: { splitType: { description?: string } };
            };
            const splitDescribe = prefsObject.shape.splitType.description ?? "";
            expect(splitDescribe).toContain("null to clear on User-stated change only");
            expect(splitDescribe).toMatch(/Replacing with another catalog id is a set, not a clear/);
            expect(splitDescribe).toMatch(/Never clear to unlock a split or program style/);
        });

        it("includes workflow when program is non-empty", () => {
            const prompt = instructions({
                hevyProgram: [
                    { id: "1", title: "Day 1", folder_id: 0, order: "1", notes: "", created_at: "", updated_at: "", exercises: [] },
                ],
                daysPerWeek: 3,
                programLength: 4,
            });

            // ADR 0030 / 01: no separate plan tool and no week-named land tool.
            expect(prompt).not.toMatch(/\bplan[A-Z]\w*|\bbuild[A-Z]*Week\b/);
            expect(prompt).toContain("readProgram");
            expect(prompt).not.toContain('purpose "edit"');
            expect(prompt).not.toContain('purpose "analyze"');
            expect(prompt).not.toContain("getCurrentProgram");
            expect(prompt).toContain("buildProgram");
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
                excludeEquipment: " none, band ",
            });

            expect(prompt).toContain("Questionnaire preferences");
            expect(prompt).toContain("Exclude equipment: none, band");
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

        it("anon + missing key: call openHevyExportGate; Save then Start; no builder Export", () => {
            const prompt = instructions({
                hevyProgram: [{ id: "1", title: "Day 1", folder_id: 0, notes: "", exercises: [] }],
                daysPerWeek: 4,
                programLength: 8,
                isAuthenticated: false,
                hasHevyApiKey: false,
            });
            expect(prompt).toContain("authenticated = **no**");
            expect(prompt).toContain("Hevy API key on file = **no**");
            expect(prompt).toContain("openHevyExportGate");
            expect(prompt).toContain("toolbar persist slot");
            expect(prompt).toContain("**Save**");
            expect(prompt).toContain("**Start**");
            expect(prompt).not.toContain("**Week Export**");
            expect(prompt).not.toContain("Never tell them to click **Export**");
            expect(prompt).not.toContain("profile **Week Export**");
            expect(prompt).not.toContain("**Export** button in the top-right");
            expect(prompt).not.toContain("sign in first");
        });

        it("authenticated + hasHevyApiKey: text-only Save then Start; do not call gate", () => {
            const prompt = instructions({
                hevyProgram: [{ id: "1", title: "Day 1", folder_id: 0, notes: "", exercises: [] }],
                daysPerWeek: 4,
                programLength: 8,
                isAuthenticated: true,
                hasHevyApiKey: true,
            });
            expect(prompt).toContain("authenticated = **yes**");
            expect(prompt).toContain("Hevy API key on file = **yes**");
            expect(prompt).toContain("Both prerequisites done");
            expect(prompt).toContain("Do **not** call **openHevyExportGate**");
            expect(prompt).toContain("toolbar persist slot");
            expect(prompt).toContain("**Save**");
            expect(prompt).toContain("**Start**");
            expect(prompt).not.toContain("**Week Export**");
            expect(prompt).not.toContain("Never tell them to click **Export**");
            expect(prompt).not.toContain("profile **Week Export**");
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

        it("teaches fetch / ask intent on a pasted Hevy share link, never import by default", () => {
            const prompt = instructions({
                hevyProgram: [],
                daysPerWeek: 4,
                programLength: 8,
            });
            expect(prompt).toContain("Hevy share links");
            expect(prompt).toContain("fetchHevyShareFolder");
            expect(prompt).toContain("**never** load it onto the program grid by default");
            expect(prompt).toContain("needs an explicit yes");
            expect(prompt).toContain("Hevy's share API may have changed");
        });

        it("omits Previous Session Context on the Edit path", () => {
            const prompt = instructions({
                hevyProgram: [{ id: "1", title: "Day 1", folder_id: 0, notes: "", exercises: [] }],
                daysPerWeek: 4,
                programLength: 8,
            });
            expect(prompt).toContain("A program currently exists");
            expect(prompt).not.toContain("Previous Session Context");
        });

        it("keeps Hevy share guidance on the Edit path too", () => {
            const prompt = instructions({
                hevyProgram: [{ id: "1", title: "Day 1", folder_id: 0, notes: "", exercises: [] }],
                daysPerWeek: 4,
                programLength: 8,
            });
            expect(prompt).toContain("Hevy share links");
            expect(prompt).toContain("fetchHevyShareFolder");
        });

        it("teaches confirmed importHevyShareFolder on an empty grid, never gated by the questionnaire", () => {
            const prompt = instructions({
                hevyProgram: [],
                daysPerWeek: 4,
                programLength: 8,
            });
            expect(prompt).toContain("importHevyShareFolder");
            expect(prompt).toContain("The grid is currently empty");
            expect(prompt).toContain("explicitly agreed");
            expect(prompt).toContain("`confirmed: true`");
            expect(prompt).toContain("questionnaire is not required");
            expect(prompt).toContain("never gated behind the questionnaire");
            // Loaded week is already on the grid - no rebuild, and expand is a separate ask.
            expect(prompt).toContain("do **not** call **buildProgram** to recreate that week");
            expect(prompt).toContain("separate ask");
            // Expand is First build: plan + wave + roles-only on one buildProgram, not mutateProgram.
            expect(prompt).toContain("expanding is **First build**");
            expect(prompt).toContain("**expandHevyShareSeed** only");
            expect(prompt).toContain("Do not periodize the seed with **mutateProgram**");
        });

        it("teaches Questionnaire gate not needed vs wait, and Training profile asks", () => {
            const prompt = instructions({
                hevyProgram: [],
                daysPerWeek: 4,
                programLength: 8,
            });
            expect(prompt).toMatch(/not needed/i);
            expect(prompt).toContain("update my profile");
            expect(prompt).toContain("edit my info");
        });

        it("tells the agent the grid is occupied so import refusal is expected", () => {
            const prompt = instructions({
                hevyProgram: [{ id: "1", title: "Day 1", folder_id: 0, notes: "", exercises: [] }],
                daysPerWeek: 4,
                programLength: 8,
            });
            expect(prompt).toContain("The grid currently holds 1 routines");
            expect(prompt).toContain("will refuse and nothing is loaded");
            expect(prompt).toContain("Do not retry the tool");
        });

        it("Questionnaire-active refuse copy present", () => {
            const prompt = instructions({
                hevyProgram: [{ id: "1", title: "Day 1", folder_id: 0, notes: "", exercises: [] }],
                daysPerWeek: 4,
                programLength: 8,
            });
            expect(prompt).toContain("Questionnaire gate active");
            expect(prompt).toContain("finish or dismiss the questions first");
        });

        it("teaches Program stalemate card replies: replace-lift keeps the limit, clear is a User-stated change", () => {
            const prompt = instructions({
                hevyProgram: [],
                daysPerWeek: 4,
                programLength: 8,
            });
            const clicked = replaceLiftMessage({
                id: "pair:injuries:knee pain:Squat (Barbell)",
                field: "injuries",
                constraint: "Knee Pain",
                exerciseTitle: "Squat (Barbell)",
                why: "",
            });

            expect(clicked.startsWith(REPLACE_LIFT_MESSAGE_PREFIX)).toBe(true);
            expect(prompt).toContain("**Program stalemate card replies:**");
            expect(prompt).toContain(`\`${REPLACE_LIFT_MESSAGE_PREFIX} swap <title>`);
            expect(prompt).toContain("means keep that limit");
            expect(prompt).toContain("Do **not** remove the limit");
            expect(prompt).toContain("`I no longer have this constraint: <limit>` is a **User-stated change**");
            expect(prompt).toContain("call **buildProgram** again with the full input");
            expect(prompt).toContain("not a **mutateProgram** proposal");
        });

        it("teaches near-duplicate injury avoidance in the prompt and updateConstraintProfile (C8)", () => {
            const prompt = instructions({
                hevyProgram: [],
                daysPerWeek: 4,
                programLength: 8,
            });
            const tools = getTools({
                constraintProfile: initializeConstraintProfile({}),
            });
            const description =
                (tools.updateConstraintProfile as { description?: string }).description ?? "";

            expect(prompt).toContain("do **not** add an entry that sounds very similar to one already saved");
            expect(description).toContain("Do not add an injury that sounds very similar to one already saved");
        });
    });

    describe("build-program and mutate-program skills (ADR 0030 / 04)", () => {
        const readSkill = (name: string) =>
            readFileSync(path.join(process.cwd(), ".agents", "skills", name, "SKILL.md"), "utf8");
        const buildSkill = readSkill("build-program");
        const mutateSkill = readSkill("mutate-program");

        it("names no separate plan tool and no week-named land tool", () => {
            for (const skill of [buildSkill, mutateSkill]) {
                expect(skill).not.toMatch(/planProgram|buildWeek/);
            }
        });

        it("build-program teaches buildProgram once with a required wave that Andy writes", () => {
            expect(buildSkill).toContain("### buildProgram once");
            expect(buildSkill).toContain("required `periodizationWave`");
            expect(buildSkill).toContain("you still write a full wave yourself");
            expect(buildSkill).toContain("Code never fills in a wave for you");
            expect(buildSkill).not.toContain("default wave");
        });

        it("build-program teaches the stalemate card replies and near-duplicate injuries", () => {
            expect(buildSkill).toContain("### After a Program stalemate");
            expect(buildSkill).toContain(`**\`${REPLACE_LIFT_MESSAGE_PREFIX} swap <title>`);
            expect(buildSkill).toContain("Do not remove the limit");
            expect(buildSkill).toContain("**`I no longer have this constraint: <limit>`** This is a **User-stated change**");
            expect(buildSkill).toContain("Do not add an entry that sounds very similar to one already there");
        });

        it("build-program and mutate-program teach preference null clears (ADR 0031 / 03)", () => {
            expect(buildSkill).toContain("preferences: { splitType: null }");
            expect(buildSkill).toMatch(/Do not "relax" a preference by swapping to Full Body/);
            expect(buildSkill).toContain("**`I no longer have a split preference`**");
            expect(buildSkill).toContain("pass `null` for that field only");
            expect(buildSkill).toContain("Program length and days per week are not cleared through this tool");

            expect(mutateSkill).toContain("preferences: { <key>: null }");
            expect(mutateSkill).toMatch(/never swap to Full Body/);
            expect(mutateSkill).toContain("Program length and days per week are not cleared through this tool");
        });

        it("mutate-program keeps replace-lift out of mutateProgram and avoids near-duplicate injuries", () => {
            expect(mutateSkill).toContain("it is **First build**");
            expect(mutateSkill).toContain("Do not call **mutateProgram** for it");
            expect(mutateSkill).toContain("Do not add an entry that sounds very similar to one already there");
        });
    });
});
