import { describe, expect, it } from "vitest";
import { extractHevyCreatedRoutineId } from "../hevy";

describe("extractHevyCreatedRoutineId", () => {
    it("reads top-level id", () => {
        expect(extractHevyCreatedRoutineId({ id: "abc-123", message: "ok" })).toBe("abc-123");
    });

    it("reads nested routine.id", () => {
        expect(extractHevyCreatedRoutineId({ routine: { id: "nested-id", title: "Day 1" } })).toBe(
            "nested-id",
        );
    });

    it("returns null for missing or empty ids", () => {
        expect(extractHevyCreatedRoutineId(null)).toBeNull();
        expect(extractHevyCreatedRoutineId({})).toBeNull();
        expect(extractHevyCreatedRoutineId({ id: "" })).toBeNull();
        expect(extractHevyCreatedRoutineId({ routine: { title: "x" } })).toBeNull();
    });
});
