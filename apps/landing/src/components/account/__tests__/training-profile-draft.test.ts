import { describe, expect, it } from "vitest";

import { emptyUserTrainingProfile } from "@/api/user-training-profile";

import {
    cloneTrainingProfileDraft,
    cmToInches,
    heightCmToImperial,
    imperialToHeightCm,
    inchesToCm,
    isTrainingProfileDraftDirty,
    parseOptionalInt,
    seedTrainingProfileDraft,
    splitImperialHeight,
} from "../training-profile-draft";

describe("cloneTrainingProfileDraft", () => {
    it("copies fields without sharing reference", () => {
        const source = emptyUserTrainingProfile();
        source.age = 30;
        const clone = cloneTrainingProfileDraft(source);
        clone.age = 40;
        expect(source.age).toBe(30);
        expect(clone.age).toBe(40);
    });
});

describe("seedTrainingProfileDraft", () => {
    it("returns empty profile when null", () => {
        expect(seedTrainingProfileDraft(null)).toEqual(emptyUserTrainingProfile());
    });

    it("clones existing profile", () => {
        const profile = { ...emptyUserTrainingProfile(), age: 25, sex: "male" as const };
        expect(seedTrainingProfileDraft(profile)).toEqual(profile);
    });
});

describe("isTrainingProfileDraftDirty", () => {
    it("is false when draft matches baseline", () => {
        const baseline = { ...emptyUserTrainingProfile(), age: 28, heightCm: 180 };
        const draft = cloneTrainingProfileDraft(baseline);
        expect(isTrainingProfileDraftDirty(baseline, draft)).toBe(false);
    });

    it("detects field changes including prefer-not-to-say sex clear", () => {
        const baseline = {
            ...emptyUserTrainingProfile(),
            sex: "male" as const,
            heightCm: 175,
        };
        const draft = cloneTrainingProfileDraft(baseline);
        draft.sex = "";
        expect(isTrainingProfileDraftDirty(baseline, draft)).toBe(true);

        draft.sex = "male";
        draft.heightCm = 180;
        expect(isTrainingProfileDraftDirty(baseline, draft)).toBe(true);
    });
});

describe("height conversion", () => {
    it("round-trips 180 cm via imperial inches", () => {
        const totalInches = cmToInches(180);
        expect(inchesToCm(totalInches)).toBe(180);
        const { feet, inches } = splitImperialHeight(totalInches);
        expect(imperialToHeightCm(feet, inches)).toBe(180);
    });

    it("maps unset height to null imperial parts", () => {
        expect(heightCmToImperial(null)).toEqual({ feet: null, inches: null });
        expect(imperialToHeightCm(null, 0)).toBeNull();
    });

    it("converts 5 ft 10 in to canonical cm", () => {
        expect(imperialToHeightCm(5, 10)).toBe(178);
    });
});

describe("parseOptionalInt", () => {
    it("parses ints and rejects empty", () => {
        expect(parseOptionalInt("60")).toBe(60);
        expect(parseOptionalInt("")).toBeNull();
        expect(parseOptionalInt("abc")).toBeNull();
    });
});
