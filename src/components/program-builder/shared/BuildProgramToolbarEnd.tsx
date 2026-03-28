/**
 * @module BuildProgramToolbarEnd
 * Build-program toolbar right side: mode menu (mobile only) + Export or Sync button.
 * On sm+, mode is exposed via the breadcrumb dropdown. On sub-sm, it shows inline here.
 * Depends on: BuildProgramModeMenu, StepButton. Used by: build-program layout, Navbar, MobileSidebarHeader.
 */
"use client";

import { Suspense } from "react";
import { BuildProgramModeMenu } from "./BuildProgramModeMenu";
import { StepButton } from "./StepButton";

export function BuildProgramToolbarEnd() {
    return (
        <div className="flex items-center gap-2 min-w-0">
            <Suspense fallback={null}>
                <BuildProgramModeMenu triggerClassName="sm:hidden" />
            </Suspense>
            <StepButton />
        </div>
    );
}
