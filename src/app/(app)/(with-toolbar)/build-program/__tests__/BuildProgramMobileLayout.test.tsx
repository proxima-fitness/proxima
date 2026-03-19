import { describe, it, expect, afterEach } from "vitest";
import { useEffect, useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { BuildProgramMobileLayout } from "@/app/(app)/(with-toolbar)/build-program/BuildProgramMobileLayout";

afterEach(() => {
    cleanup();
});

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

    it("keeps chat panel mounted when switching tabs (avoids MessageBubbles ref reset / program tab snap-back)", () => {
        const mountCounts = { n: 0 };
        function MountSpy() {
            useEffect(() => {
                mountCounts.n += 1;
            }, []);
            return null;
        }

        function ControlledLayout() {
            const [mobileTab, setMobileTab] = useState("chat");
            return (
                <BuildProgramMobileLayout
                    mobileTab={mobileTab}
                    onMobileTabChange={setMobileTab}
                    hasProgramContent={true}
                    chatPanel={<MountSpy />}
                    routineContent={null}
                />
            );
        }

        render(<ControlledLayout />);
        expect(mountCounts.n).toBe(1);

        fireEvent.click(screen.getByRole("tab", { name: "Program" }));
        expect(mountCounts.n).toBe(1);

        fireEvent.click(screen.getByRole("tab", { name: "Chat" }));
        expect(mountCounts.n).toBe(1);
    });
});

