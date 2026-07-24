/**
 * @module BuildProgramToolbarEnd
 * Build-program toolbar right side: Sign in (anon) or Sync (edit+hevy). New path has no Export.
 * Depends on: StepButton. Used by: build-program layout, Navbar, MobileSidebarHeader.
 */
"use client";

import { StepButton } from "./StepButton";

/** Sign in / Sync CTA, or null on New path (Save lives in toolbar portal). */
export function BuildProgramToolbarEnd() {
    return <StepButton />;
}
