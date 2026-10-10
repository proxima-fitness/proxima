// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Edit current week arrival shape (ADR 0013 / 01).
 */
import { describe, it, expect } from "vitest";
import {
    buildEditArrivalParams,
    orderRoutinesByLink,
    parseEditCurrentWeekArrival,
} from "../edit-current-week-arrival";

function routine(id: string, title: string, folderId = 55): THevyRoutine {
    return {
        id,
        title,
        folder_id: folderId,
        notes: "",
        exercises: [],
    } as THevyRoutine;
}

describe("parseEditCurrentWeekArrival", () => {
    it("reads program + week", () => {
        const params = new URLSearchParams("resume=true&edit=true&program=7&week=3");
        expect(parseEditCurrentWeekArrival(params)).toEqual({ programId: 7, nthWeek: 3 });
    });

    it("treats a lone program or week as absent", () => {
        expect(parseEditCurrentWeekArrival(new URLSearchParams("program=7"))).toEqual({
            programId: null,
            nthWeek: null,
        });
        expect(parseEditCurrentWeekArrival(new URLSearchParams("week=3"))).toEqual({
            programId: null,
            nthWeek: null,
        });
    });

    it("rejects non-positive-integer values", () => {
        expect(parseEditCurrentWeekArrival(new URLSearchParams("program=7&week=0"))).toEqual({
            programId: null,
            nthWeek: null,
        });
        expect(
            parseEditCurrentWeekArrival(new URLSearchParams("program=abc&week=2")),
        ).toEqual({ programId: null, nthWeek: null });
    });
});

describe("orderRoutinesByLink", () => {
    it("hydrates one week in link order", () => {
        const fetched = [routine("r2", "Pull"), routine("r1", "Push"), routine("r3", "Legs")];
        const ordered = orderRoutinesByLink(fetched, ["r1", "r2", "r3"]);

        expect(ordered.map((r) => r.hevyRoutineId)).toEqual(["r1", "r2", "r3"]);
        expect(ordered.map((r) => r.order)).toEqual(["1", "2", "3"]);
        expect(ordered.every((r) => r.folder_id === 0)).toBe(true);
    });

    it("ignores titles entirely — a renamed routine keeps its day", () => {
        // The drift this exists to prevent: title/created_at order disagreeing
        // with the link index that hevy-program-sync uses for nthDay.
        const fetched = [routine("r1", "ZZZ renamed in Hevy"), routine("r2", "1 - Push")];
        const ordered = orderRoutinesByLink(fetched, ["r1", "r2"]);

        expect(ordered.map((r) => r.hevyRoutineId)).toEqual(["r1", "r2"]);
    });

    it("keeps routines added in Hevy, appended after the linked days", () => {
        const fetched = [routine("extra", "Added in Hevy"), routine("r1", "Push")];
        const ordered = orderRoutinesByLink(fetched, ["r1"]);

        expect(ordered.map((r) => r.hevyRoutineId)).toEqual(["r1", "extra"]);
        expect(ordered.map((r) => r.order)).toEqual(["1", "2"]);
    });

    it("tolerates a link id whose routine is gone from the folder", () => {
        const ordered = orderRoutinesByLink([routine("r2", "Pull")], ["r1", "r2"]);

        expect(ordered.map((r) => r.hevyRoutineId)).toEqual(["r2"]);
        expect(ordered[0].order).toBe("1");
    });

    it("falls back to fetch order when the link has no ids", () => {
        const fetched = [routine("r1", "Push"), routine("r2", "Pull")];
        const ordered = orderRoutinesByLink(fetched, []);

        expect(ordered.map((r) => r.hevyRoutineId)).toEqual(["r1", "r2"]);
        expect(ordered.every((r) => r.folder_id === 0)).toBe(true);
    });

    it("returns empty for an empty folder", () => {
        expect(orderRoutinesByLink([], ["r1"])).toEqual([]);
    });

    it("does not mutate the input", () => {
        const fetched = [routine("r1", "Push")];
        orderRoutinesByLink(fetched, ["r1"]);
        expect(fetched[0].folder_id).toBe(55);
        expect(fetched[0].id).toBe("r1");
    });

    // ADR 0013 / 02 — identity split.
    it("moves the Hevy UUID to hevyRoutineId and mints an ordinal builder id", () => {
        const fetched = [
            routine("b459cba5-cd6d-463c-abb6-1f2b3c4d5e6f", "Push"),
            routine("c72a1de9-11aa-4b3c-9d8e-0f1a2b3c4d5e", "Pull"),
        ];
        const ordered = orderRoutinesByLink(fetched, [
            "b459cba5-cd6d-463c-abb6-1f2b3c4d5e6f",
            "c72a1de9-11aa-4b3c-9d8e-0f1a2b3c4d5e",
        ]);

        expect(ordered.map((r) => r.id)).toEqual(["1", "2"]);
        expect(ordered.map((r) => r.hevyRoutineId)).toEqual([
            "b459cba5-cd6d-463c-abb6-1f2b3c4d5e6f",
            "c72a1de9-11aa-4b3c-9d8e-0f1a2b3c4d5e",
        ]);
        // Every id must parse, or the builder mints NaN for the next added day.
        expect(ordered.every((r) => Number.isFinite(Number(r.id)))).toBe(true);
    });

    it("is re-entrant — a second pass matches on hevyRoutineId, not the ordinal id", () => {
        const once = orderRoutinesByLink([routine("r2", "Pull"), routine("r1", "Push")], [
            "r1",
            "r2",
        ]);
        const twice = orderRoutinesByLink(once, ["r1", "r2"]);

        expect(twice.map((r) => r.hevyRoutineId)).toEqual(["r1", "r2"]);
        expect(twice.map((r) => r.id)).toEqual(["1", "2"]);
    });
});

describe("buildEditArrivalParams", () => {
    it("adds program + week for Edit current week", () => {
        expect(buildEditArrivalParams({ programId: 7, nthWeek: 3, folderId: 42 })).toBe(
            "resume=true&edit=true&hevy=true&folder=42&program=7&week=3",
        );
    });

    it("omits program + week for Hevy-only Edit path", () => {
        expect(buildEditArrivalParams({ folderId: 42, extraParams: { search: "stall" } })).toBe(
            "resume=true&edit=true&hevy=true&search=stall&folder=42",
        );
    });

    it("omits folder when the Hevy folder id is unknown", () => {
        expect(buildEditArrivalParams({ programId: 7, nthWeek: 3, folderId: null })).toBe(
            "resume=true&edit=true&hevy=true&program=7&week=3",
        );
    });
});
