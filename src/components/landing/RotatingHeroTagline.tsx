"use client";

/**
 * @module RotatingHeroTagline
 * Homepage hero headline. Cycles four space-themed lines by decrypting
 * ciphertext left to right. Used by: Prompt.
 * Depends on: motion, motion/react.
 */

import { useEffect, useState, type ReactNode } from "react";
import { animate } from "motion";
import { useReducedMotion } from "motion/react";

export const HERO_TAGLINES = [
    "The universe finally revolves around you.",
    "Small star. Massive pull.",
    "Plans change. Your program should too.",
    "Ground control for your training.",
] as const;

export const HERO_TAGLINE_HOLD_MS = 5000;

/** Left-to-right decrypt. Unrevealed letters stay as stable ciphertext. */
export const SCRAMBLE_STAGGER_S = 0.05;
export const SCRAMBLE_CHAR_DURATION_S = 0.14;
export const SCRAMBLE_TICK_S = 0.08;
/** Nostromo / Isolation HUD: rings, hashes, chevrons. No Latin. */
export const SCRAMBLE_CIPHER = "⌬⌖⊗⊙⎔⎕◆▲▼▰ᐃᐅᐊᐁ";

const HEADING_CLASS =
    "grid w-full px-4 text-center font-tertiary text-6xl font-bold leading-[1.08] tracking-tight text-foreground max-sm:px-6 max-sm:text-4xl dark:drop-shadow-[0_0_22px_rgba(51,187,207,0.28)]";

const LETTER_OR_DIGIT = /[A-Za-z0-9]/;

interface IGlyphSlotsProps {
    frame: string;
    target: string;
}

/** Advance through HERO_TAGLINES, wrapping to 0. */
export function nextHeroTaglineIndex(index: number): number {
    return (index + 1) % HERO_TAGLINES.length;
}

/** Seconds until the last character of `text` locks. */
export function scrambleDurationS(text: string): number {
    if (text.length === 0) {
        return 0;
    }
    return (text.length - 1) * SCRAMBLE_STAGGER_S + SCRAMBLE_CHAR_DURATION_S;
}

/** Stable cipher glyph for one character index. */
export function cipherGlyph(index: number, ch: string): string {
    if (!LETTER_OR_DIGIT.test(ch)) {
        return ch;
    }
    const n = (index * 13 + ch.charCodeAt(0) * 7) % SCRAMBLE_CIPHER.length;
    return SCRAMBLE_CIPHER[n] ?? ch;
}

function noiseGlyph(random: () => number): string {
    const pick = Math.floor(random() * SCRAMBLE_CIPHER.length);
    return SCRAMBLE_CIPHER[pick] ?? SCRAMBLE_CIPHER[0];
}

/**
 * One decrypt frame. Left of the frontier is plaintext. Right of it is a
 * fixed cipher. The frontier flickers through cipher glyphs, then locks.
 *
 * @param target - Settled tagline.
 * @param elapsedS - Seconds into the decrypt.
 * @param random - Injected RNG so tests can pin the frontier flicker.
 */
export function scrambleFrame(
    target: string,
    elapsedS: number,
    random: () => number = Math.random,
): string {
    if (target.length === 0) {
        return target;
    }
    let out = "";
    for (let i = 0; i < target.length; i++) {
        const ch = target[i];
        if (!LETTER_OR_DIGIT.test(ch)) {
            out += ch;
            continue;
        }
        const start = i * SCRAMBLE_STAGGER_S;
        const lockAt = start + SCRAMBLE_CHAR_DURATION_S;
        if (elapsedS >= lockAt) {
            out += ch;
            continue;
        }
        if (elapsedS < start) {
            out += cipherGlyph(i, ch);
            continue;
        }
        out += noiseGlyph(random);
    }
    return out;
}

/**
 * One slot per destination letter. An invisible copy of the real character
 * sets width, so cipher glyphs cannot shove the line around.
 */
function GlyphSlots({ frame, target }: IGlyphSlotsProps) {
    const nodes: ReactNode[] = [];
    let i = 0;
    while (i < target.length) {
        if (target[i] === " ") {
            nodes.push(
                <span
                    key={ i }
                    className="inline-block w-[0.3em]"
                >
                    { "\u00a0" }
                </span>,
            );
            i += 1;
            continue;
        }
        const start = i;
        while (i < target.length && target[i] !== " ") {
            i += 1;
        }
        const word = target.slice(start, i);
        nodes.push(
            <span
                key={ start }
                className="inline-block whitespace-nowrap"
            >
                { Array.from(word).map((targetCh, offset) => {
                    const idx = start + offset;
                    const shown = frame[idx] ?? targetCh;
                    return (
                        <span
                            key={ idx }
                            className="relative inline-block overflow-hidden align-bottom"
                        >
                            <span
                                className="invisible"
                                aria-hidden
                            >
                                { targetCh }
                            </span>
                            <span className="absolute inset-0 flex items-center justify-center">
                                { shown }
                            </span>
                        </span>
                    );
                }) }
            </span>,
        );
    }
    return (
        <span
            data-testid="hero-tagline"
            data-frame={ frame }
        >
            { nodes }
        </span>
    );
}

function TaglineSizers() {
    return (
        <>
            { HERO_TAGLINES.map((line) => (
                <span
                    key={ line }
                    aria-hidden
                    className="invisible col-start-1 row-start-1"
                >
                    { line }
                </span>
            )) }
        </>
    );
}

interface IDecryptLineProps {
    play: boolean;
    text: string;
}

/**
 * One tagline. Remount with a new `text` key so decrypt state starts clean.
 */
function DecryptLine({ play, text }: IDecryptLineProps) {
    const [frame, setFrame] = useState(() => (play ? scrambleFrame(text, 0) : text));

    // Clock subscription: decrypt progress comes from Motion's animate loop.
    useEffect(() => {
        if (!play) {
            return;
        }
        const duration = scrambleDurationS(text);
        let lastTick = -1;
        const controls = animate(0, duration, {
            duration,
            ease: "linear",
            onUpdate: (elapsed) => {
                const tick = Math.floor(elapsed / SCRAMBLE_TICK_S);
                if (tick === lastTick) {
                    return;
                }
                lastTick = tick;
                setFrame(scrambleFrame(text, elapsed));
            },
            onComplete: () => {
                setFrame(text);
            },
        });
        return () => {
            controls.stop();
        };
    }, [play, text]);

    return (
        <GlyphSlots
            frame={ play ? frame : text }
            target={ text }
        />
    );
}

/**
 * Landing h1 that rotates HERO_TAGLINES. Height is reserved with stacked
 * invisible copies so the prompt below does not jump.
 */
export function RotatingHeroTagline() {
    const reduceMotion = Boolean(useReducedMotion());
    const [index, setIndex] = useState(0);
    const [cycleCount, setCycleCount] = useState(0);
    const active = HERO_TAGLINES[index];
    const play = cycleCount > 0 && !reduceMotion;

    // Clock subscription: taglines advance on a timer, not a user event.
    useEffect(() => {
        if (reduceMotion) {
            return;
        }
        const id = window.setInterval(() => {
            setIndex((current) => nextHeroTaglineIndex(current));
            setCycleCount((count) => count + 1);
        }, HERO_TAGLINE_HOLD_MS);
        return () => {
            window.clearInterval(id);
        };
    }, [reduceMotion]);

    return (
        <h1
            className={ HEADING_CLASS }
            aria-label={ active }
        >
            <TaglineSizers />
            <span
                className="relative col-start-1 row-start-1 overflow-x-clip"
                aria-hidden
            >
                <DecryptLine
                    key={ `${cycleCount}-${active}` }
                    play={ play }
                    text={ active }
                />
            </span>
        </h1>
    );
}
