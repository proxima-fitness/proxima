/**
 * The **Hevy share import** grid gate lives on the server, so the request body has to carry
 * an honest grid-state flag on every turn - including the turns where the `hevyProgram`
 * snapshot is deliberately withheld because the message is not program talk.
 */
import { describe, expect, it } from "vitest";

import { buildMessageContextBody } from "../use-build-program-chat";
import { isMessageAboutProgram } from "@/components/program-builder/utils/helpers";

const DAY_WITH_EXERCISES: THevyRoutine = {
    id: "1",
    title: "Push",
    folder_id: 0,
    order: "1",
    notes: "",
    created_at: "",
    updated_at: "",
    exercises: [
        {
            index: 0,
            title: "Bench Press (Barbell)",
            notes: "",
            rest_seconds: "90",
            exercise_template_id: "TEMPLATE_BENCH",
            supersets_id: null,
            sets: [],
        },
    ],
};

const PLACEHOLDER_DAY: THevyRoutine = { ...DAY_WITH_EXERCISES, exercises: [] };

function bodyFor(messageText: string, hevyProgram: THevyRoutine[]) {
    return buildMessageContextBody({
        messageText,
        hevyProgram,
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
}

describe("chat request body grid state", () => {
    it("reports an occupied grid even when the program snapshot is withheld", () => {
        const confirmation = "ok load it";
        // Guard the premise: a bare confirmation is not program talk, so the snapshot is dropped.
        expect(isMessageAboutProgram(confirmation)).toBe(false);

        const body = bodyFor(confirmation, [DAY_WITH_EXERCISES]);

        expect(body.hevyProgram).toEqual([]);
        expect(body.programHasExercises).toBe(true);
    });

    it("treats New-path day placeholders as an empty grid", () => {
        expect(bodyFor("ok load it", [PLACEHOLDER_DAY]).programHasExercises).toBe(false);
        expect(bodyFor("ok load it", []).programHasExercises).toBe(false);
    });

    it("still reports an occupied grid when the snapshot is sent", () => {
        const body = bodyFor("modify my program please", [DAY_WITH_EXERCISES]);

        expect(body.hevyProgram).toHaveLength(1);
        expect(body.programHasExercises).toBe(true);
    });
});
