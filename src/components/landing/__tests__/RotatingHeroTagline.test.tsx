/**
 * @module RotatingHeroTagline tests
 * Tagline index wrap, scramble frames, and the rotating hero headline.
 */
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    cipherGlyph,
    HERO_TAGLINE_HOLD_MS,
    HERO_TAGLINES,
    nextHeroTaglineIndex,
    RotatingHeroTagline,
    scrambleDurationS,
    scrambleFrame,
    SCRAMBLE_CIPHER,
} from "../RotatingHeroTagline";

let reducedMotion = false;

vi.mock("motion/react", async (importOriginal) => {
    const actual = await importOriginal<typeof import("motion/react")>();
    return {
        ...actual,
        useReducedMotion: () => reducedMotion,
    };
});

describe("nextHeroTaglineIndex", () => {
    it("wraps from the last line back to the first", () => {
        expect(nextHeroTaglineIndex(0)).toBe(1);
        expect(nextHeroTaglineIndex(HERO_TAGLINES.length - 1)).toBe(0);
    });
});

describe("scrambleFrame", () => {
    const target = "Ab cd.";

    it("keeps spaces and punctuation, and locks every letter when elapsed is past the duration", () => {
        expect(scrambleFrame(target, scrambleDurationS(target), () => 0)).toBe(
            target,
        );
    });

    it("decrypts the first letter while the rest stays ciphertext", () => {
        const frame = scrambleFrame(target, scrambleDurationS("A"), () => 0);
        expect(frame.startsWith("A")).toBe(true);
        expect(frame.endsWith(".")).toBe(true);
        expect(frame.includes("cd")).toBe(false);
    });

    it("starts as ciphertext and keeps spaces and the period", () => {
        const frame = scrambleFrame(target, 0, () => 0);
        expect(frame).toBe(
            `${SCRAMBLE_CIPHER[0]}${cipherGlyph(1, "b")} ${cipherGlyph(3, "c")}${cipherGlyph(4, "d")}.`,
        );
        expect(/[A-Za-z]/.test(frame)).toBe(false);
    });
});

describe("RotatingHeroTagline", () => {
    afterEach(() => {
        cleanup();
        reducedMotion = false;
        vi.useRealTimers();
    });

    it("starts on the first tagline and advances the accessible name after the hold", () => {
        vi.useFakeTimers();
        render(<RotatingHeroTagline />);

        expect(screen.getByRole("heading", { level: 1 }).getAttribute("aria-label")).toBe(
            HERO_TAGLINES[0],
        );

        act(() => {
            vi.advanceTimersByTime(HERO_TAGLINE_HOLD_MS);
        });

        expect(screen.getByRole("heading", { level: 1 }).getAttribute("aria-label")).toBe(
            HERO_TAGLINES[1],
        );
    });

    it("stays on the first tagline when the visitor prefers reduced motion", () => {
        reducedMotion = true;
        vi.useFakeTimers();
        render(<RotatingHeroTagline />);

        act(() => {
            vi.advanceTimersByTime(HERO_TAGLINE_HOLD_MS * 2);
        });

        expect(screen.getByRole("heading", { level: 1 }).getAttribute("aria-label")).toBe(
            HERO_TAGLINES[0],
        );
        expect(screen.getByTestId("hero-tagline").getAttribute("data-frame")).toBe(
            HERO_TAGLINES[0],
        );
    });
});
