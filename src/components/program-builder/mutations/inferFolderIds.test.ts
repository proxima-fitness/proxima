import { describe, expect, it } from "vitest";

import { inferMissingFolderIds } from "./inferFolderIds";

const makeDay = (folder_id: number, order: string): THevyRoutine => ({
    id: String(folder_id * 10 + Number(order)),
    folder_id,
    order,
    title: `Week ${folder_id + 1} Day ${order}`,
    notes: "",
    exercises: [],
});

describe("inferMissingFolderIds", () => {
    const program = [
        makeDay(0, "4"),
        makeDay(1, "4"),
        makeDay(2, "4"),
        makeDay(0, "1"),
    ];

    it("fills folderIds for every week sharing dayOrder", () => {
        const inferred = inferMissingFolderIds(program, {
            op: "insert_exercise",
            dayOrder: 4,
            exerciseIndex: 0,
        });

        expect(inferred.folderIds).toEqual([0, 1, 2]);
    });

    it("does not override explicit folderIds", () => {
        const inferred = inferMissingFolderIds(program, {
            op: "insert_exercise",
            folderIds: [0],
            dayOrder: 4,
            exerciseIndex: 0,
        });

        expect(inferred.folderIds).toEqual([0]);
    });

    it("leaves swap_exercise_template unchanged when folderIds omitted", () => {
        const inferred = inferMissingFolderIds(program, {
            op: "swap_exercise_template",
            from_exercise_template_id: "A",
            to: { exercise_template_id: "B" },
        });

        expect(inferred.folderIds).toBeUndefined();
    });
});
