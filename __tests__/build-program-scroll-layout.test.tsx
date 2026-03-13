/**
 * @module build-program-scroll-layout.test
 * Vitest suite that guards the Tailwind classes responsible for:
 * - Mobile scroll (content scrolls inside viewport; no double scroll)
 * - Navbar pinned to top on mobile (4rem header, viewport height calc)
 *
 * Depends on: Vitest, @testing-library/react.
 * Used by: CI to prevent regression of build-program scroll/layout fixes.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/components/program-builder/shared/Breadcrumbs", () => ({ Breadcrumbs: () => null }));
vi.mock("@/components/program-builder/shared/StepButton", () => ({ StepButton: () => null }));
vi.mock("@/app/(app)/(with-toolbar)/build-program/BuildProgram", () => ({ BuildProgram: () => null }));
vi.mock("@/components/program-builder/shared/BuildProgramSkeletonSSR", () => ({
    BuildProgramSkeletonSSR: () => null,
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/build-program" }));
vi.mock("@/components/CustomSidebarTrigger", () => ({ CustomTrigger: () => null }));

import ProgramBuilderLayout from "@/app/(app)/(with-toolbar)/build-program/layout";
import BuildProgramPage from "@/app/(app)/(with-toolbar)/build-program/page";
import { BuildProgramMobileLayout } from "@/app/(app)/(with-toolbar)/build-program/BuildProgramMobileLayout";
import { MobileSidebarHeader } from "@/components/header/MobileSidebarHeader";

describe("Build program scroll and mobile navbar layout", () => {
    describe("ProgramBuilderLayout", () => {
        it("layout root has overflow-hidden, mobile viewport height calc (100dvh-4rem), and flex-col", () => {
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

    describe("BuildProgramPage", () => {
        it("page wrapper has min-h-0, overflow-hidden, flex-1 for flex scroll", () => {
            render(<BuildProgramPage />);
            const wrapper = document.querySelector(".min-h-0");
            expect(wrapper).toBeTruthy();
            const className = wrapper?.className ?? "";
            expect(className).toContain("min-h-0");
            expect(className).toContain("overflow-hidden");
            expect(className).toContain("flex-1");
            expect(className).toContain("flex");
            expect(className).toContain("flex-col");
        });
    });

    describe("BuildProgramMobileLayout", () => {
        it("outer container has h-[calc(100vh-4rem)] and flex-col; chat TabsContent has min-h-0 and overflow-hidden", () => {
            const { container } = render(
                <BuildProgramMobileLayout
                    mobileTab="chat"
                    onMobileTabChange={() => {}}
                    hasProgramContent={true}
                    chatPanel={null}
                    routineContent={null}
                />
            );
            const root = container.firstElementChild;
            expect(root).toBeTruthy();
            const containerClass = root?.className ?? "";
            expect(containerClass).toContain("h-[calc(100vh-4rem)]");
            expect(containerClass).toContain("flex-col");

            const scrollable = container.querySelector("[class*='min-h-0']");
            expect(scrollable).toBeTruthy();
            const scrollableClass = scrollable?.className ?? "";
            expect(scrollableClass).toContain("min-h-0");
            expect(scrollableClass).toContain("overflow-hidden");
        });
    });

    describe("MobileSidebarHeader", () => {
        it("header has sm:hidden so navbar is mobile-only and stays pinned on small viewports", () => {
            render(<MobileSidebarHeader />);
            const header = screen.getByRole("banner");
            expect(header).toBeTruthy();
            expect(header.className).toContain("sm:hidden");
        });
    });
});
