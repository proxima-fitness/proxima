/**
 * @module BuildProgramToolbarEnd
 * Build-program toolbar right side: Sign in (anon) or Sync (edit+hevy). New path has no Export.
 * Depends on: StepButton. Used by: build-program layout, Navbar, MobileSidebarHeader.
 */
"use client";

import { StepButton } from "./StepButton";

export function BuildProgramToolbarEnd() {
    return (
        <div className="flex items-center gap-2 min-w-0">
            <StepButton />
        </div>
    );
}
