"use client";

import { memo, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";

/** ~width of “My Proxima Program”; wrapper is w-fit max-w-[20ch] */
const TITLE_INPUT_CLASS =
    "h-9 w-full min-w-0 text-center text-base font-semibold tracking-tight sm:text-sm";

const DESKTOP_MIN_WIDTH = "(min-width: 640px)";

interface IBuildProgramToolbarTitleProps {
    value: string;
    onChange: (value: string) => void;
}

/**
 * Desktop-only (sm+): portals the program name into #toolbar-program-title-portal.
 * Renders nothing below the sm breakpoint so there is no title UI on mobile.
 */
function BuildProgramToolbarTitleInner({ value, onChange }: IBuildProgramToolbarTitleProps) {
    const [target, setTarget] = useState<HTMLElement | null>(null);

    useLayoutEffect(() => {
        const mq = window.matchMedia(DESKTOP_MIN_WIDTH);
        const sync = () => {
            if (!mq.matches) {
                queueMicrotask(() => setTarget(null));
                return;
            }
            const el = document.getElementById("toolbar-program-title-portal");
            queueMicrotask(() => setTarget(el));
        };
        sync();
        mq.addEventListener("change", sync);
        return () => mq.removeEventListener("change", sync);
    }, []);

    if (target === null) return null;

    return createPortal(
        <Input
            id="build-program-title-input"
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Progam Title"
            aria-label="Progam Title"
            autoComplete="off"
            containerClassName="w-fit max-w-[20ch]"
            className={TITLE_INPUT_CLASS}
        />,
        target
    );
}

export const BuildProgramToolbarTitle = memo(BuildProgramToolbarTitleInner);
