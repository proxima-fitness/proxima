// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from "vitest";

import { exerciseMatchKey, normalizeExerciseTitle } from "./index";

describe("normalizeExerciseTitle", () => {
    it("lowercases, collapses whitespace, trims", () => {
        expect(normalizeExerciseTitle("  Bench   Press  ")).toBe("bench press");
    });

    it("preserves parentheses and word order", () => {
        expect(normalizeExerciseTitle("Cable Twist (Up to Down)")).toBe(
            "cable twist (up to down)",
        );
        expect(normalizeExerciseTitle("Cable Twist (Down to up)")).toBe(
            "cable twist (down to up)",
        );
    });
});

describe("exerciseMatchKey", () => {
    it("strips parens and sorts tokens so word-order variants collide", () => {
        expect(exerciseMatchKey("Cable Twist (Up to Down)")).toBe(
            exerciseMatchKey("Cable Twist (Down to up)"),
        );
        expect(exerciseMatchKey("Cable Twist (Up to Down)")).toBe(
            "cable down to twist up",
        );
    });
});
