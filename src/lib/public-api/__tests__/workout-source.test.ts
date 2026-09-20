import { describe, expect, it } from "vitest";
import {
    HEVY_RESERVED_SOURCE,
    isPublicApiWorkoutSource,
    isReservedHevySource,
    PUBLIC_API_WORKOUT_SOURCES,
    PUBLIC_API_WORKOUT_SOURCE_SET,
} from "../workout-source";

/** ADR 0026 v1 list — hardcoded so a silent drop in the module fails this file. */
const V1_PUBLIC_API_SOURCES = [
    "manual",
    "strong",
    "macrofactor_workouts",
    "fitbod",
    "gravl",
    "apple_health",
    "jefit",
    "caliber",
    "boostcamp",
    "liftosaur",
    "strengthlog",
    "alpha_progression",
    "stronglifts",
    "setgraph",
    "rp_hypertrophy",
    "juggernaut",
] as const;

describe("PUBLIC_API_WORKOUT_SOURCES", () => {
    it("lists the v1 closed Workout source slugs and not hevy", () => {
        expect([...PUBLIC_API_WORKOUT_SOURCES]).toEqual([...V1_PUBLIC_API_SOURCES]);
        expect(PUBLIC_API_WORKOUT_SOURCE_SET.has(HEVY_RESERVED_SOURCE)).toBe(false);
    });
});

describe("isPublicApiWorkoutSource", () => {
    it("accepts every listed slug", () => {
        for (const slug of V1_PUBLIC_API_SOURCES) {
            expect(isPublicApiWorkoutSource(slug)).toBe(true);
        }
    });

    it("rejects hevy and unknown slugs", () => {
        expect(isPublicApiWorkoutSource("hevy")).toBe(false);
        expect(isPublicApiWorkoutSource("other")).toBe(false);
        expect(isPublicApiWorkoutSource("Strong")).toBe(false);
        expect(isPublicApiWorkoutSource("")).toBe(false);
    });
});

describe("isReservedHevySource", () => {
    it("is true only for hevy", () => {
        expect(isReservedHevySource("hevy")).toBe(true);
        expect(isReservedHevySource(HEVY_RESERVED_SOURCE)).toBe(true);
        expect(isReservedHevySource("manual")).toBe(false);
        expect(isReservedHevySource("strong")).toBe(false);
        expect(isReservedHevySource("Hevy")).toBe(false);
    });
});
