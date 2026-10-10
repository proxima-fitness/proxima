// SPDX-License-Identifier: AGPL-3.0-only

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ usePathname: () => "/build-program" }));
vi.mock("@/components/CustomSidebarTrigger", () => ({ CustomTrigger: () => null }));

import { MobileSidebarHeader } from "@/components/header/MobileSidebarHeader";

describe("MobileSidebarHeader.tsx", () => {
    afterEach(() => {
        cleanup();
    });

    it("renders a banner header hidden on small viewports (sm:hidden)", () => {
        render(<MobileSidebarHeader />);

        const header = screen.getByRole("banner");
        expect(header).toBeTruthy();
        expect(header.className).toContain("sm:hidden");
        expect(header.getAttribute("data-proxima-mobile-header")).toBe("");
    });

    it("keeps a single Save portal on build-program (no separate Sign in button)", () => {
        render(<MobileSidebarHeader />);

        expect(document.getElementById("toolbar-save-portal-mobile")).toBeTruthy();
        expect(screen.queryByText("Sign in to save")).toBeNull();
        expect(screen.queryByText("Sign in")).toBeNull();
    });
});

