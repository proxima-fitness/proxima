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

const startable = {
    persistMode: "save" as const,
    programId: 9,
    hevyLinkCount: 0,
    hasSaveBaseline: true,
    isDirty: false,
};

describe("shouldShowBuilderStart", () => {
    it("hides Start on an unsaved New path grid", () => {
        expect(
            shouldShowBuilderStart({
                ...startable,
                programId: null,
                hasSaveBaseline: false,
            }),
        ).toBe(false);
    });

    it("shows Start after this-session Save when clean with zero Program-Hevy links", () => {
        expect(shouldShowBuilderStart(startable)).toBe(true);
    });

    it("hides Start when the grid is dirty after Save", () => {
        expect(shouldShowBuilderStart({ ...startable, isDirty: true })).toBe(false);
    });

    it("hides Start until a Save in this tab even if a program id exists", () => {
        expect(shouldShowBuilderStart({ ...startable, hasSaveBaseline: false })).toBe(
            false,
        );
    });

    it("hides Start after the first Week Export (a link exists)", () => {
        expect(shouldShowBuilderStart({ ...startable, hevyLinkCount: 1 })).toBe(false);
    });

    it("hides Start on Edit current week", () => {
        expect(
            shouldShowBuilderStart({
                ...startable,
                persistMode: "sync",
            }),
        ).toBe(false);
    });

    it("hides Start while link count is unknown", () => {
        expect(shouldShowBuilderStart({ ...startable, hevyLinkCount: null })).toBe(
            false,
        );
    });
});

describe("builderStartHref", () => {
    it("lands on that program's overview and does not Week Export", () => {
        expect(builderStartHref(9)).toBe("/profile?programId=9");
        expect(builderStartHref(9)).not.toMatch(/export/i);
    });
});
