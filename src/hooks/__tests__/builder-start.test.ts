/**
 * @module builder-start
 *
 * **Start** visibility (ADR 0016 / 01).
 */
import { describe, expect, it } from "vitest";
import {
    builderStartHref,
    coerceProgramId,
    prescriptionProgramIdForStart,
    shouldShowBuilderStart,
} from "../builder-start";

describe("coerceProgramId", () => {
    it("accepts a positive integer", () => {
        expect(coerceProgramId(42)).toBe(42);
        expect(coerceProgramId("42")).toBe(42);
    });

    it("rejects missing or non-positive values", () => {
        expect(coerceProgramId(null)).toBeNull();
        expect(coerceProgramId(undefined)).toBeNull();
        expect(coerceProgramId(0)).toBeNull();
        expect(coerceProgramId("share-not-an-id")).toBeNull();
    });
});

describe("prescriptionProgramIdForStart", () => {
    it("is null on Edit current week / Hevy-only even when a program id exists", () => {
        expect(
            prescriptionProgramIdForStart({
                persistMode: "sync",
                savedProgramId: 11,
                chatProgramId: 11,
            }),
        ).toBeNull();
    });

    it("prefers this session's Save over the chat row", () => {
        expect(
            prescriptionProgramIdForStart({
                persistMode: "save",
                savedProgramId: 9,
                chatProgramId: 3,
            }),
        ).toBe(9);
    });

    it("uses the chat row after reload when this session has not Saved", () => {
        expect(
            prescriptionProgramIdForStart({
                persistMode: "save",
                savedProgramId: null,
                chatProgramId: 9,
            }),
        ).toBe(9);
    });
});

describe("shouldShowBuilderStart", () => {
    it("hides Start on an unsaved New path grid", () => {
        expect(
            shouldShowBuilderStart({
                persistMode: "save",
                programId: null,
                hevyLinkCount: 0,
            }),
        ).toBe(false);
    });

    it("shows Start after Save when the program has zero Program-Hevy links", () => {
        expect(
            shouldShowBuilderStart({
                persistMode: "save",
                programId: 9,
                hevyLinkCount: 0,
            }),
        ).toBe(true);
    });

    it("hides Start after the first Week Export (a link exists)", () => {
        expect(
            shouldShowBuilderStart({
                persistMode: "save",
                programId: 9,
                hevyLinkCount: 1,
            }),
        ).toBe(false);
    });

    it("hides Start on Edit current week", () => {
        expect(
            shouldShowBuilderStart({
                persistMode: "sync",
                programId: 9,
                hevyLinkCount: 0,
            }),
        ).toBe(false);
    });

    it("hides Start while link count is unknown", () => {
        expect(
            shouldShowBuilderStart({
                persistMode: "save",
                programId: 9,
                hevyLinkCount: null,
            }),
        ).toBe(false);
    });
});

describe("builderStartHref", () => {
    it("lands on that program's overview and does not Week Export", () => {
        expect(builderStartHref(9)).toBe("/profile?programId=9");
        expect(builderStartHref(9)).not.toMatch(/export/i);
    });
});
