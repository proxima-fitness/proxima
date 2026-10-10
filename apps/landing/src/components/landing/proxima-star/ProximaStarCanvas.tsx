// SPDX-License-Identifier: AGPL-3.0-only

"use client";

/**
 * @module proxima-star/ProximaStarCanvas
 * Client canvas host for the adapted Optimized Black Hole pipeline.
 * WebGPU init is an external GPU/DOM sync; dispose on unmount.
 * Depends on: renderer. Used by: ProximaStarCanvasDynamic.
 */
import { useReducedMotion } from "motion/react";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";
import { createRenderer } from "./renderer";

const DESKTOP_MEDIA = "(min-width: 768px)";

/** Full-bleed hero canvas. Opacity is set on the DOM node when GPU init finishes. */
export function ProximaStarCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const reduceMotion = useReducedMotion();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";

    // GPU canvas: init, observers, and rAF live outside React; dispose on unmount.
    useEffect(() => {
        if (!isDark) return;
        const desktop = window.matchMedia(DESKTOP_MEDIA);
        let cancelled = false;
        let renderer: ReturnType<typeof createRenderer> | undefined;

        const stop = () => {
            renderer?.dispose();
            renderer = undefined;
            const canvas = canvasRef.current;
            if (canvas) canvas.style.opacity = "0";
        };

        const start = () => {
            const canvas = canvasRef.current;
            if (cancelled || !canvas || !desktop.matches) return;
            renderer = createRenderer({
                canvas,
                animate: reduceMotion !== true,
            });
            void renderer.ready.then(() => {
                if (!cancelled && renderer) canvas.style.opacity = "1";
            });
        };

        const onChange = () => {
            stop();
            start();
        };

        start();
        desktop.addEventListener("change", onChange);
        return () => {
            cancelled = true;
            desktop.removeEventListener("change", onChange);
            stop();
        };
    }, [isDark, reduceMotion]);

    if (!isDark) return null;

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 hidden h-full w-full touch-none opacity-0 transition-opacity duration-500 md:block"
            aria-hidden
        />
    );
}
