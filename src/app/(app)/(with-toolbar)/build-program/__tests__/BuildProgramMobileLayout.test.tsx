import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

import { BuildProgramMobileLayout } from "@/app/(app)/(with-toolbar)/build-program/BuildProgramMobileLayout";

describe("build-program BuildProgramMobileLayout.tsx", () => {
    it("renders mobile container with expected height + ensures chat content uses min-h-0/overflow-hidden", () => {
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

