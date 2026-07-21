/**
 * Regression: agent must round in display unit, not weight_kg space.
 * Integer kg can still show fractional lbs (60 kg → 132.25 lbs).
 */
import { describe, it, expect } from "vitest";

import {
    formatWeight,
    KG_TO_LBS,
    LBS_TO_KG,
    roundWeightKgToDisplayDecimals,
} from "@/lib/weightUtils";
import { instructions } from "@/app/api/chat/instructions/instructions";
import { formatReadProgramForModel } from "@/app/api/chat/tools/read-program";
import { buildMessageContextBody } from "@/app/(app)/(with-toolbar)/build-program/use-build-program-chat";

/** What the user sees in the program grid for that stored kg. */
function looksWholeInUi(weightKg: number, isInLbs: boolean): boolean {
    return /^\d+$/.test(formatWeight(weightKg, isInLbs, "kg"));
}

describe("weight display unit vs agent kg mismatch", () => {
    it("integer kg still shows fractional lbs in UI (user-reported 60 kg → 132.25)", () => {
        expect(formatWeight(60, true, "kg")).toBe("132.25");
        expect(looksWholeInUi(60, true)).toBe(false);
    });

    it("roundWeightKgToDisplayDecimals(…, lbs, 0) makes UI whole", () => {
        const storedKg = roundWeightKgToDisplayDecimals(60, true, 0);
        expect(Math.round(60 * KG_TO_LBS)).toBe(132);
        expect(storedKg).toBeCloseTo(132 * LBS_TO_KG, 6);
        expect(looksWholeInUi(storedKg, true)).toBe(true);
        expect(formatWeight(storedKg, true, "kg")).toBe("132");
    });

    it("chat instructions include display unit when isInLbs is set", () => {
        const lbsPrompt = instructions({
            hevyProgram: [],
            daysPerWeek: 4,
            programLength: 8,
            isInLbs: true,
        });
        expect(lbsPrompt).toContain("lbs (pounds)");
        expect(lbsPrompt).toContain("Weight units");
        expect(lbsPrompt).toContain("132.25");

        const kgPrompt = instructions({
            hevyProgram: [],
            daysPerWeek: 4,
            programLength: 8,
            isInLbs: false,
        });
        expect(kgPrompt).toContain("kg (kilograms)");
    });

    it("chat request body includes isInLbs", () => {
        const body = buildMessageContextBody({
            messageText: "hello",
            hevyProgram: [],
            chatId: "",
            daysPerWeek: "4",
            programLength: "8",
            excludeAreas: [],
            excludeEquipment: [],
            healthIssues: [],
            splitType: "",
            exerciseVariability: "",
            progressionSystem: "",
            deloadWeek: "",
            peakWeek: "",
            warmupExercises: "",
            isInLbs: true,
        });
        expect(body.isInLbs).toBe(true);
    });

    it("readProgram model output includes weight_display in lbs", () => {
        const program: THevyRoutine[] = [
            {
                id: "1",
                folder_id: 0,
                order: "1",
                title: "Day 1",
                notes: "",
                created_at: "",
                updated_at: "",
                exercises: [
                    {
                        index: 0,
                        title: "Bench",
                        notes: "",
                        rest_seconds: "90",
                        exercise_template_id: "ex-1",
                        supersets_id: null,
                        reason: "",
                        sets: [
                            {
                                index: 0,
                                type: "normal",
                                weight_kg: 60,
                                reps: 8,
                                distance_meters: null,
                                duration_seconds: null,
                                rpe: null,
                                custom_metric: null,
                                rep_range: null,
                            },
                        ],
                    },
                ],
            },
        ];
        const formatted = formatReadProgramForModel(program, true);
        expect(formatted).toContain("User weight display unit: lbs");
        expect(formatted).toContain('"weight_kg":60');
        expect(formatted).toContain('"weight_display":"132.25 lbs"');
    });
});
