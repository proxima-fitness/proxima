/**
 * @module useHevySuccessConfetti
 * Shared confetti effect for Hevy export/sync success. Returns a fire function,
 * a reset function, and the overlay node to mount in the consuming component.
 * Used by: Hevy export/sync success flows.
 */
"use client";

import { useState, useRef, useEffect } from "react";
import Confetti from "react-confetti";

const CONFETTI_DURATION_MS = 6500;

export function useHevySuccessConfetti() {
    const [showConfetti, setShowConfetti] = useState(false);
    const [confettiNonce, setConfettiNonce] = useState(0);
    const [confettiSize, setConfettiSize] = useState({ width: 0, height: 0 });
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const resetConfetti = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setShowConfetti(false);
    };

    const fireConfetti = () => {
        if (typeof window !== "undefined") {
            setConfettiSize({ width: window.innerWidth, height: window.innerHeight });
        }
        setConfettiNonce((n) => n + 1);
        setShowConfetti(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            setShowConfetti(false);
            timeoutRef.current = null;
        }, CONFETTI_DURATION_MS);
    };

    const confettiOverlay =
        showConfetti && confettiSize.width > 0 && confettiSize.height > 0 ? (
            <div className="pointer-events-none fixed inset-0 z-100" aria-hidden>
                <Confetti
                    key={confettiNonce}
                    width={confettiSize.width}
                    height={confettiSize.height}
                    recycle={false}
                    numberOfPieces={220}
                />
            </div>
        ) : null;

    return { confettiOverlay, fireConfetti, resetConfetti };
}
