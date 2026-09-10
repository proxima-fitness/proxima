/**
 * @module BuildProgramToolbarEnd
 * Build-program toolbar right side: Sign in (anon). Logged-in persist is the
 * toolbar portal (Save / Sync). New path has no Export.
 * Depends on: StepButton. Used by: build-program layout, Navbar, MobileSidebarHeader.
 */
"use client";

import { StepButton } from "./StepButton";

/** Sign in CTA, or null when logged in (persist lives in the toolbar portal). */
export function BuildProgramToolbarEnd() {
    return <StepButton />;
}
