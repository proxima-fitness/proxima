import { describe, expect, it } from "vitest";

import type { TAgentProgramOperation } from "@/components/program-builder/mutations/agentSchema";
import {
    describeProgramOperation,
    getMutateProgramObjectives,
} from "@/components/program-builder/utils/helpers";

describe("describeProgramOperation", () => {
    it("describes swap_exercise_template with minimal to payload", () => {
        const operation: TAgentProgramOperation = {
            op: "swap_exercise_template",
            from_exercise_template_id: "BENCH_BB",
            to: { exercise_template_id: "3601968B" },
        };

        expect(describeProgramOperation(operation)).toBe(
            "Swap BENCH_BB → 3601968B (all weeks/days)",
        );
    });

    it("describes swap_exercise_template with title in to payload", () => {
        const operation: TAgentProgramOperation = {
            op: "swap_exercise_template",
            from_exercise_template_id: "BENCH_BB",
            to: {
                exercise_template_id: "3601968B",
                title: "Dumbbell Bench Press",
            },
        };

        expect(describeProgramOperation(operation)).toBe(
            "Swap BENCH_BB → Dumbbell Bench Press (all weeks/days)",
        );
    });

    it("does not throw when swap_exercise_template to is missing (streaming partial input)", () => {
        const operation = {
            op: "swap_exercise_template",
            from_exercise_template_id: "BENCH_BB",
        } as TAgentProgramOperation;

        expect(describeProgramOperation(operation)).toBe(
            "Swap BENCH_BB → … (all weeks/days)",
        );
    });
});

describe("getMutateProgramObjectives", () => {
    it("maps program-wide swap batch without throwing on partial ops", () => {
        const operations = [
            {
                op: "swap_exercise_template",
                from_exercise_template_id: "BENCH_BB",
            },
            {
                op: "swap_exercise_template",
                from_exercise_template_id: "SQUAT_BB",
                to: { exercise_template_id: "DCFF3E9F", title: "Goblet Squat" },
            },
        ] as TAgentProgramOperation[];

        const objectives = getMutateProgramObjectives(operations);

        expect(objectives).toHaveLength(1);
        expect(objectives[0]?.details).toEqual([
            "Swap BENCH_BB → … (all weeks/days)",
            "Swap SQUAT_BB → Goblet Squat (all weeks/days)",
        ]);
    });
});
