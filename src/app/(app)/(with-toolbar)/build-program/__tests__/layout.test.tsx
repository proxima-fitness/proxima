import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

// Mock dependencies used by ProgramBuilderLayout so we only assert its wrapper classes.
vi.mock("@/components/program-builder/shared/Breadcrumbs", () => ({ Breadcrumbs: () => null }));
vi.mock("@/app/(app)/(with-toolbar)/build-program/BuildProgram", () => ({ BuildProgram: () => null }));
vi.mock("@/components/program-builder/shared/BuildProgramSkeletonSSR", () => ({
    BuildProgramSkeletonSSR: () => null,
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/build-program" }));
vi.mock("@/components/CustomSidebarTrigger", () => ({ CustomTrigger: () => null }));

import ProgramBuilderLayout from "@/app/(app)/(with-toolbar)/build-program/layout";

describe("build-program layout.tsx", () => {
    afterEach(() => {
        cleanup();
    });

    it("renders sticky toolbar layout with overflow-hidden + mobile viewport height", () => {
        render(<ProgramBuilderLayout>{null}</ProgramBuilderLayout>);

        const root = document.querySelector(".overflow-hidden");
        expect(root).toBeTruthy();

        const className = root?.className ?? "";
        expect(className).toContain("overflow-hidden");
        expect(className).toContain("max-sm:h-[calc(100dvh-4rem)]");
        expect(className).toContain("flex-col");
        expect(className).toContain("flex");
    });

    it("keeps Save portal target for ToolbarPortalButtons (ADR 0007)", () => {
        render(<ProgramBuilderLayout>{null}</ProgramBuilderLayout>);

        const savePortal = document.getElementById("toolbar-save-portal");
        expect(savePortal).toBeTruthy();
        // empty:hidden collapses gap until Save portals in; not permanently hidden
        expect(savePortal?.classList.contains("hidden")).toBe(false);
        expect(savePortal?.classList.contains("empty:hidden")).toBe(true);
    });

    it("collapses empty undo portal so Legend–Save gap stays even", () => {
        render(<ProgramBuilderLayout>{null}</ProgramBuilderLayout>);

        const undoPortal = document.getElementById("toolbar-undo-portal");
        expect(undoPortal).toBeTruthy();
        expect(undoPortal?.classList.contains("empty:hidden")).toBe(true);
    });
});

