// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from "vitest";

import { emptyUserConstraintProfileRecord } from "@/api/user-constraints";

import {
    addFreeformItem,
    cloneConstraintProfileDraft,
    isConstraintProfileDraftDirty,
    removeItemAt,
    setPreferenceValue,
} from "../constraint-profile-draft";

describe("cloneConstraintProfileDraft", () => {
    it("deep-clones arrays and preferences", () => {
        const source = emptyUserConstraintProfileRecord();
        source.injuries.push("knee");
        source.preferences.splitType = "ppl";

        const clone = cloneConstraintProfileDraft(source);
        clone.injuries.push("shoulder");
        clone.preferences.splitType = "ul";

        expect(source.injuries).toEqual(["knee"]);
        expect(source.preferences.splitType).toBe("ppl");
        expect(clone.injuries).toEqual(["knee", "shoulder"]);
        expect(clone.preferences.splitType).toBe("ul");
    });
});

describe("isConstraintProfileDraftDirty", () => {
    it("is false when draft matches baseline", () => {
        const baseline = emptyUserConstraintProfileRecord();
        baseline.injuries = ["knee"];
        const draft = cloneConstraintProfileDraft(baseline);

        expect(isConstraintProfileDraftDirty(baseline, draft)).toBe(false);
    });

    it("detects list and preference changes", () => {
        const baseline = emptyUserConstraintProfileRecord();
        const draft = cloneConstraintProfileDraft(baseline);
        draft.injuries = ["knee"];
        expect(isConstraintProfileDraftDirty(baseline, draft)).toBe(true);

        draft.injuries = [];
        draft.preferences.splitType = "ppl";
        expect(isConstraintProfileDraftDirty(baseline, draft)).toBe(true);

        draft.preferences.splitType = "";
        draft.rawStatements = ["said something"];
        expect(isConstraintProfileDraftDirty(baseline, draft)).toBe(true);
    });
});

describe("addFreeformItem", () => {
    it("trims, rejects empty, and dedupes case-insensitively", () => {
        expect(addFreeformItem(["knee"], "  ")).toEqual(["knee"]);
        expect(addFreeformItem(["knee"], "Knee")).toEqual(["knee"]);
        expect(addFreeformItem(["knee"], " shoulder ")).toEqual(["knee", "shoulder"]);
    });
});

describe("removeItemAt", () => {
    it("removes by index and no-ops out of range", () => {
        expect(removeItemAt(["a", "b"], 0)).toEqual(["b"]);
        expect(removeItemAt(["a"], 3)).toEqual(["a"]);
    });
});

describe("setPreferenceValue", () => {
    it("sets and clears preference keys", () => {
        const prefs = emptyUserConstraintProfileRecord().preferences;
        const next = setPreferenceValue(prefs, "splitType", "  ppl  ");
        expect(next.splitType).toBe("ppl");
        expect(setPreferenceValue(next, "splitType", "  ").splitType).toBe("");
    });
});
