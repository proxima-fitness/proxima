import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

// Mock dependencies used by ProgramBuilderLayout so we only assert its wrapper classes.
vi.mock("@/components/program-builder/shared/Breadcrumbs", () => ({ Breadcrumbs: () => null }));
vi.mock("@/components/program-builder/shared/BuildProgramToolbarEnd", () => ({
    BuildProgramToolbarEnd: () => null,
}));
vi.mock("@/app/(app)/(with-toolbar)/build-program/BuildProgram", () => ({ BuildProgram: () => null }));
vi.mock("@/components/program-builder/shared/BuildProgramSkeletonSSR", () => ({
    BuildProgramSkeletonSSR: () => null,
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/build-program" }));
vi.mock("@/components/CustomSidebarTrigger", () => ({ CustomTrigger: () => null }));

import ProgramBuilderLayout from "@/app/(app)/(with-toolbar)/build-program/layout";

describe("build-program layout.tsx", () => {
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
});

