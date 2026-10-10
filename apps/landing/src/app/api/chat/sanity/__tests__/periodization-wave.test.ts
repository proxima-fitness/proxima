/**
 * @module chat/sanity/periodization-wave tests
 *
 * Periodization wave refine (ADR 0027 / 02, C3 input). Schema Soft-fail
 * cases: week identity, week-1 zeros, later weeks change mains (ADR 0032 / 03),
 * accessory iff deload/peak, rep range only on a Block boundary.
 */

import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
    periodizationWaveSchema,
    refinePeriodizationWave,
} from "@/app/api/chat/sanity/periodization-wave";

const accumulationDeloadBlocks = [
    { name: "Accumulation", weeks: [1, 2, 3], intent: "Volume" },
    { name: "Deload", weeks: [4], intent: "Unload" },
];

const validFourWeekWave = {
    weeks: [
        { week: 1, main: { rpeDelta: 0, setCountDelta: 0 } },
        { week: 2, main: { rpeDelta: 0, setCountDelta: 1 } },
        { week: 3, main: { rpeDelta: 1, setCountDelta: 1 } },
        {
            week: 4,
            main: { rpeDelta: -2, setCountDelta: -1 },
            accessory: { rpeDelta: -2, setCountDelta: -1 },
            mainRepRange: { start: 8, end: 10 },
        },
    ],
};

function parseWave(input: {
    durationWeeks: number;
    blocks: Array<{ name: string; weeks: number[]; intent: string }>;
    periodizationWave: unknown;
}) {
    return z
        .object({
            durationWeeks: z.number(),
            blocks: z.array(
                z.object({
                    name: z.string(),
                    weeks: z.array(z.number()),
                    intent: z.string(),
                }),
            ),
            periodizationWave: periodizationWaveSchema,
        })
        .superRefine(refinePeriodizationWave)
        .safeParse(input);
}

describe("periodizationWaveSchema + refinePeriodizationWave", () => {
    it("accepts a four-week climb with accessory and rep range on the deload block start", () => {
        const parsed = parseWave({
            durationWeeks: 4,
            blocks: accumulationDeloadBlocks,
            periodizationWave: validFourWeekWave,
        });
        expect(parsed.success).toBe(true);
    });

    it("accepts an eight-week wave with accessory only on peak/taper weeks and rep range only on later block starts", () => {
        const parsed = parseWave({
            durationWeeks: 8,
            blocks: [
                { name: "Accumulation", weeks: [1, 2, 3], intent: "Volume, RPE 6-8" },
                { name: "Intensification", weeks: [4, 5, 6], intent: "Heavier" },
                { name: "Peak", weeks: [7, 8], intent: "Taper" },
            ],
            periodizationWave: {
                weeks: [
                    { week: 1, main: { rpeDelta: 0, setCountDelta: 0 } },
                    { week: 2, main: { rpeDelta: 0, setCountDelta: 1 } },
                    { week: 3, main: { rpeDelta: 1, setCountDelta: 1 } },
                    {
                        week: 4,
                        main: { rpeDelta: 1, setCountDelta: 0 },
                        mainRepRange: { start: 5, end: 8 },
                    },
                    { week: 5, main: { rpeDelta: 2, setCountDelta: 0 } },
                    { week: 6, main: { rpeDelta: 2, setCountDelta: 0 } },
                    {
                        week: 7,
                        main: { rpeDelta: 2, setCountDelta: -1 },
                        accessory: { rpeDelta: -1, setCountDelta: -1 },
                        mainRepRange: { start: 3, end: 5 },
                    },
                    {
                        week: 8,
                        main: { rpeDelta: 0, setCountDelta: -2 },
                        accessory: { rpeDelta: -2, setCountDelta: -2 },
                    },
                ],
            },
        });
        expect(parsed.success).toBe(true);
    });

    it("rejects a wave whose week list is not 1..durationWeeks exactly once", () => {
        const missingWeekThree = parseWave({
            durationWeeks: 4,
            blocks: accumulationDeloadBlocks,
            periodizationWave: {
                weeks: [
                    { week: 1, main: { rpeDelta: 0, setCountDelta: 0 } },
                    { week: 2, main: { rpeDelta: 0, setCountDelta: 1 } },
                    { week: 4, main: { rpeDelta: -2, setCountDelta: -1 }, accessory: { rpeDelta: -2, setCountDelta: -1 } },
                    { week: 4, main: { rpeDelta: -2, setCountDelta: -1 }, accessory: { rpeDelta: -2, setCountDelta: -1 } },
                ],
            },
        });
        expect(missingWeekThree.success).toBe(false);

        const shortWave = parseWave({
            durationWeeks: 4,
            blocks: accumulationDeloadBlocks,
            periodizationWave: {
                weeks: [
                    { week: 1, main: { rpeDelta: 0, setCountDelta: 0 } },
                    { week: 2, main: { rpeDelta: 0, setCountDelta: 1 } },
                ],
            },
        });
        expect(shortWave.success).toBe(false);
    });

    it("rejects week 1 when main deltas are not both 0", () => {
        const parsed = parseWave({
            durationWeeks: 4,
            blocks: accumulationDeloadBlocks,
            periodizationWave: {
                weeks: [
                    { week: 1, main: { rpeDelta: 1, setCountDelta: 0 } },
                    { week: 2, main: { rpeDelta: 0, setCountDelta: 1 } },
                    { week: 3, main: { rpeDelta: 1, setCountDelta: 1 } },
                    {
                        week: 4,
                        main: { rpeDelta: -2, setCountDelta: -1 },
                        accessory: { rpeDelta: -2, setCountDelta: -1 },
                    },
                ],
            },
        });
        expect(parsed.success).toBe(false);
    });

    it("rejects week 1 accessory or mainRepRange", () => {
        const withAccessory = parseWave({
            durationWeeks: 4,
            blocks: accumulationDeloadBlocks,
            periodizationWave: {
                weeks: [
                    {
                        week: 1,
                        main: { rpeDelta: 0, setCountDelta: 0 },
                        accessory: { rpeDelta: 0, setCountDelta: 0 },
                    },
                    { week: 2, main: { rpeDelta: 0, setCountDelta: 1 } },
                    { week: 3, main: { rpeDelta: 1, setCountDelta: 1 } },
                    {
                        week: 4,
                        main: { rpeDelta: -2, setCountDelta: -1 },
                        accessory: { rpeDelta: -2, setCountDelta: -1 },
                    },
                ],
            },
        });
        expect(withAccessory.success).toBe(false);

        const withRepRange = parseWave({
            durationWeeks: 4,
            blocks: accumulationDeloadBlocks,
            periodizationWave: {
                weeks: [
                    {
                        week: 1,
                        main: { rpeDelta: 0, setCountDelta: 0 },
                        mainRepRange: { start: 8, end: 12 },
                    },
                    { week: 2, main: { rpeDelta: 0, setCountDelta: 1 } },
                    { week: 3, main: { rpeDelta: 1, setCountDelta: 1 } },
                    {
                        week: 4,
                        main: { rpeDelta: -2, setCountDelta: -1 },
                        accessory: { rpeDelta: -2, setCountDelta: -1 },
                    },
                ],
            },
        });
        expect(withRepRange.success).toBe(false);
    });

    it("requires accessory on a claimed deload/unload/taper/peak week and forbids it otherwise", () => {
        const missingDeloadAccessory = parseWave({
            durationWeeks: 4,
            blocks: accumulationDeloadBlocks,
            periodizationWave: {
                weeks: [
                    { week: 1, main: { rpeDelta: 0, setCountDelta: 0 } },
                    { week: 2, main: { rpeDelta: 0, setCountDelta: 1 } },
                    { week: 3, main: { rpeDelta: 1, setCountDelta: 1 } },
                    { week: 4, main: { rpeDelta: -2, setCountDelta: -1 } },
                ],
            },
        });
        expect(missingDeloadAccessory.success).toBe(false);

        const extraVolumeAccessory = parseWave({
            durationWeeks: 4,
            blocks: accumulationDeloadBlocks,
            periodizationWave: {
                weeks: [
                    { week: 1, main: { rpeDelta: 0, setCountDelta: 0 } },
                    {
                        week: 2,
                        main: { rpeDelta: 0, setCountDelta: 1 },
                        accessory: { rpeDelta: 0, setCountDelta: 0 },
                    },
                    { week: 3, main: { rpeDelta: 1, setCountDelta: 1 } },
                    {
                        week: 4,
                        main: { rpeDelta: -2, setCountDelta: -1 },
                        accessory: { rpeDelta: -2, setCountDelta: -1 },
                    },
                ],
            },
        });
        expect(extraVolumeAccessory.success).toBe(false);
    });

    it("does not treat easy or recovery alone as an accessory week", () => {
        const blocks = [
            { name: "Accumulation", weeks: [1, 2, 3], intent: "Volume" },
            { name: "Easy", weeks: [4], intent: "Recovery" },
        ];
        const withoutAccessory = parseWave({
            durationWeeks: 4,
            blocks,
            periodizationWave: {
                weeks: [
                    { week: 1, main: { rpeDelta: 0, setCountDelta: 0 } },
                    { week: 2, main: { rpeDelta: 0, setCountDelta: 1 } },
                    { week: 3, main: { rpeDelta: 1, setCountDelta: 1 } },
                    {
                        week: 4,
                        main: { rpeDelta: -1, setCountDelta: 0 },
                        mainRepRange: { start: 8, end: 10 },
                    },
                ],
            },
        });
        expect(withoutAccessory.success).toBe(true);

        const withAccessory = parseWave({
            durationWeeks: 4,
            blocks,
            periodizationWave: {
                weeks: [
                    { week: 1, main: { rpeDelta: 0, setCountDelta: 0 } },
                    { week: 2, main: { rpeDelta: 0, setCountDelta: 1 } },
                    { week: 3, main: { rpeDelta: 1, setCountDelta: 1 } },
                    {
                        week: 4,
                        main: { rpeDelta: -1, setCountDelta: 0 },
                        accessory: { rpeDelta: -1, setCountDelta: 0 },
                    },
                ],
            },
        });
        expect(withAccessory.success).toBe(false);
    });

    it("allows mainRepRange only on the first week of a block that starts after week 1", () => {
        const onWeekTwo = parseWave({
            durationWeeks: 4,
            blocks: accumulationDeloadBlocks,
            periodizationWave: {
                weeks: [
                    { week: 1, main: { rpeDelta: 0, setCountDelta: 0 } },
                    {
                        week: 2,
                        main: { rpeDelta: 0, setCountDelta: 1 },
                        mainRepRange: { start: 8, end: 10 },
                    },
                    { week: 3, main: { rpeDelta: 1, setCountDelta: 1 } },
                    {
                        week: 4,
                        main: { rpeDelta: -2, setCountDelta: -1 },
                        accessory: { rpeDelta: -2, setCountDelta: -1 },
                    },
                ],
            },
        });
        expect(onWeekTwo.success).toBe(false);

        const omittedOnBoundary = parseWave({
            durationWeeks: 4,
            blocks: accumulationDeloadBlocks,
            periodizationWave: {
                weeks: [
                    { week: 1, main: { rpeDelta: 0, setCountDelta: 0 } },
                    { week: 2, main: { rpeDelta: 0, setCountDelta: 1 } },
                    { week: 3, main: { rpeDelta: 1, setCountDelta: 1 } },
                    {
                        week: 4,
                        main: { rpeDelta: -2, setCountDelta: -1 },
                        accessory: { rpeDelta: -2, setCountDelta: -1 },
                    },
                ],
            },
        });
        expect(omittedOnBoundary.success).toBe(true);
    });

    it("rejects a later week whose mains are flat with no mainRepRange", () => {
        const parsed = parseWave({
            durationWeeks: 4,
            blocks: accumulationDeloadBlocks,
            periodizationWave: {
                weeks: [
                    { week: 1, main: { rpeDelta: 0, setCountDelta: 0 } },
                    { week: 2, main: { rpeDelta: 0, setCountDelta: 0 } },
                    { week: 3, main: { rpeDelta: 1, setCountDelta: 1 } },
                    {
                        week: 4,
                        main: { rpeDelta: -2, setCountDelta: -1 },
                        accessory: { rpeDelta: -2, setCountDelta: -1 },
                    },
                ],
            },
        });
        expect(parsed.success).toBe(false);
        if (parsed.success) return;
        const issue = parsed.error.issues.find((i) => i.message.startsWith("Week 2 mains"));
        expect(issue?.message).toContain("must change from week 1");
        expect(issue?.path).toEqual(["periodizationWave", "weeks", 1, "main"]);
    });

    it("accepts a later week that moves only RPE or only set count", () => {
        const rpeOnly = parseWave({
            durationWeeks: 4,
            blocks: accumulationDeloadBlocks,
            periodizationWave: {
                weeks: [
                    { week: 1, main: { rpeDelta: 0, setCountDelta: 0 } },
                    { week: 2, main: { rpeDelta: 1, setCountDelta: 0 } },
                    { week: 3, main: { rpeDelta: 2, setCountDelta: 0 } },
                    {
                        week: 4,
                        main: { rpeDelta: -1, setCountDelta: 0 },
                        accessory: { rpeDelta: -1, setCountDelta: 0 },
                    },
                ],
            },
        });
        expect(rpeOnly.success).toBe(true);

        const setsOnly = parseWave({
            durationWeeks: 4,
            blocks: accumulationDeloadBlocks,
            periodizationWave: {
                weeks: [
                    { week: 1, main: { rpeDelta: 0, setCountDelta: 0 } },
                    { week: 2, main: { rpeDelta: 0, setCountDelta: 1 } },
                    { week: 3, main: { rpeDelta: 0, setCountDelta: 2 } },
                    {
                        week: 4,
                        main: { rpeDelta: 0, setCountDelta: -1 },
                        accessory: { rpeDelta: 0, setCountDelta: -1 },
                    },
                ],
            },
        });
        expect(setsOnly.success).toBe(true);
    });

    it("accepts flat mains with a mainRepRange on a Block boundary but not off one", () => {
        const onBoundary = parseWave({
            durationWeeks: 4,
            blocks: [
                { name: "Accumulation", weeks: [1, 2], intent: "Volume" },
                { name: "Intensification", weeks: [3, 4], intent: "Heavier" },
            ],
            periodizationWave: {
                weeks: [
                    { week: 1, main: { rpeDelta: 0, setCountDelta: 0 } },
                    { week: 2, main: { rpeDelta: 0, setCountDelta: 1 } },
                    {
                        week: 3,
                        main: { rpeDelta: 0, setCountDelta: 0 },
                        mainRepRange: { start: 4, end: 6 },
                    },
                    { week: 4, main: { rpeDelta: 1, setCountDelta: 0 } },
                ],
            },
        });
        expect(onBoundary.success).toBe(true);

        const offBoundary = parseWave({
            durationWeeks: 4,
            blocks: accumulationDeloadBlocks,
            periodizationWave: {
                weeks: [
                    { week: 1, main: { rpeDelta: 0, setCountDelta: 0 } },
                    {
                        week: 2,
                        main: { rpeDelta: 0, setCountDelta: 0 },
                        mainRepRange: { start: 8, end: 10 },
                    },
                    { week: 3, main: { rpeDelta: 1, setCountDelta: 1 } },
                    {
                        week: 4,
                        main: { rpeDelta: -2, setCountDelta: -1 },
                        accessory: { rpeDelta: -2, setCountDelta: -1 },
                    },
                ],
            },
        });
        expect(offBoundary.success).toBe(false);
    });
});
