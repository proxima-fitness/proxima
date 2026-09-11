/**
 * @module overview-start
 *
 * Program overview landing from **Start** (ADR 0016 / 02).
 */
import { describe, expect, it } from "vitest";
import {
    parseOverviewProgramId,
    resolveOverviewProgramId,
    shouldHighlightOverviewExport,
} from "@/hooks/overview-start";

describe("parseOverviewProgramId", () => {
    it("reads the Start program id from the query", () => {
        expect(
            parseOverviewProgramId(new URLSearchParams("programId=22")),
        ).toBe(22);
    });

    it("rejects missing or malformed values", () => {
        expect(parseOverviewProgramId(new URLSearchParams())).toBeNull();
        expect(
            parseOverviewProgramId(new URLSearchParams("programId=share-not-an-id")),
        ).toBeNull();
        expect(parseOverviewProgramId(new URLSearchParams("programId=0"))).toBeNull();
    });
});

describe("resolveOverviewProgramId", () => {
    it("selects program B when Start lands with that programId", () => {
        expect(
            resolveOverviewProgramId({
                activeProgramIds: [11, 22],
                pickedProgramId: null,
                queryProgramId: 22,
            }),
        ).toBe(22);
    });

    it("falls back to the first program when the query is absent or unknown", () => {
        expect(
            resolveOverviewProgramId({
                activeProgramIds: [11, 22],
                pickedProgramId: null,
                queryProgramId: null,
            }),
        ).toBe(11);
        expect(
            resolveOverviewProgramId({
                activeProgramIds: [11, 22],
                pickedProgramId: null,
                queryProgramId: 99,
            }),
        ).toBe(11);
    });

    it("lets a picker click override the Start query", () => {
        expect(
            resolveOverviewProgramId({
                activeProgramIds: [11, 22],
                pickedProgramId: 11,
                queryProgramId: 22,
            }),
        ).toBe(11);
    });

    it("returns null when there are no active programs", () => {
        expect(
            resolveOverviewProgramId({
                activeProgramIds: [],
                pickedProgramId: null,
                queryProgramId: 22,
            }),
        ).toBeNull();
    });
});

describe("shouldHighlightOverviewExport", () => {
    it("highlights Export when the program has zero Program-Hevy links", () => {
        expect(
            shouldHighlightOverviewExport({
                hevyLinkCount: 0,
                linksLoading: false,
            }),
        ).toBe(true);
    });

    it("does not highlight Export when a Program-Hevy link exists", () => {
        expect(
            shouldHighlightOverviewExport({
                hevyLinkCount: 1,
                linksLoading: false,
            }),
        ).toBe(false);
    });

    it("does not highlight Export while links are still loading", () => {
        expect(
            shouldHighlightOverviewExport({
                hevyLinkCount: 0,
                linksLoading: true,
            }),
        ).toBe(false);
    });
});
