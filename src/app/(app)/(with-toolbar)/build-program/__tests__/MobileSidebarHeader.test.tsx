import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ usePathname: () => "/build-program" }));
vi.mock("@/components/CustomSidebarTrigger", () => ({ CustomTrigger: () => null }));
vi.mock("@/components/program-builder/shared/BuildProgramToolbarEnd", () => ({
    BuildProgramToolbarEnd: () => null,
}));

import { MobileSidebarHeader } from "@/components/header/MobileSidebarHeader";

describe("MobileSidebarHeader.tsx", () => {
    it("renders a banner header hidden on small viewports (sm:hidden)", () => {
        render(<MobileSidebarHeader />);

        const header = screen.getByRole("banner");
        expect(header).toBeTruthy();
        expect(header.className).toContain("sm:hidden");
    });
});

