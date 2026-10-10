// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import {
    parseProposalAction,
    splitProposalHeading,
} from "@/components/program-builder/utils/mutation-proposal-view";

describe("splitProposalHeading", () => {
    it("splits a single week and day title", () => {
        expect(splitProposalHeading("Week 2, Upper Pull")).toEqual({
            dayTitle: "Upper Pull",
            weekPath: "Week 2",
        });
    });

    it("keeps a fused week list on the path, not the day title", () => {
        expect(splitProposalHeading("Weeks 4, 8, Push Day (Strength Focus)")).toEqual({
            dayTitle: "Push Day (Strength Focus)",
            weekPath: "Weeks 4, 8",
        });
    });

    it("splits All weeks", () => {
        expect(splitProposalHeading("All weeks, Push Day")).toEqual({
            dayTitle: "Push Day",
            weekPath: "All weeks",
        });
    });

    it("returns a week-only heading with an empty day title", () => {
        expect(splitProposalHeading("Week 4")).toEqual({
            dayTitle: "",
            weekPath: "Week 4",
        });
    });

    it("returns a title-only heading with an empty week path", () => {
        expect(splitProposalHeading("Day 1")).toEqual({
            dayTitle: "Day 1",
            weekPath: "",
        });
    });
});

describe("parseProposalAction", () => {
    it("parses rename, swap, replace, notes, add, and remove", () => {
        expect(parseProposalAction("Rename Push to Upper Push")).toEqual({
            from: "Push",
            kind: "pair",
            to: "Upper Push",
            verb: "Title",
        });
        expect(parseProposalAction("Swap Romanian Deadlift for Seated Leg Curl")).toEqual({
            from: "Romanian Deadlift",
            kind: "pair",
            to: "Seated Leg Curl",
            verb: "Swap",
        });
        expect(parseProposalAction("Replace Face Pull with Rear Delt Fly")).toEqual({
            from: "Face Pull",
            kind: "pair",
            to: "Rear Delt Fly",
            verb: "Replace",
        });
        expect(parseProposalAction("Set notes on Push Day (Strength Focus)")).toEqual({
            from: "Push Day (Strength Focus)",
            kind: "pair",
            to: "added",
            verb: "Notes",
        });
        expect(parseProposalAction("Add Face Pull")).toEqual({
            from: null,
            kind: "pair",
            to: "Face Pull",
            verb: "Add",
        });
        expect(parseProposalAction("Remove Romanian Deadlift")).toEqual({
            from: "Romanian Deadlift",
            kind: "pair",
            to: null,
            verb: "Remove",
        });
    });

    it("leaves unknown action sentences as plain text", () => {
        expect(parseProposalAction("Create superset (Bench Press, Overhead Press)")).toEqual({
            kind: "plain",
            text: "Create superset (Bench Press, Overhead Press)",
        });
    });
});
