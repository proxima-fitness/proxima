"use client";

import type { ComponentProps } from "react";
import { memo } from "react";
import type { ImperativePanelHandle } from "react-resizable-panels";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Agent } from "@/components/program-builder/shared/agent/Agent";

export type TBuildProgramDesktopLayoutAgentProps = Omit<
    ComponentProps<typeof Agent>,
    "sidebarPosition" | "onTogglePosition" | "onToggleExpand" | "onToggleHide" | "isExpanded"
>;

export interface IProps {
    sidebarPosition: "left" | "right";
    sidebarPanelRef: React.RefObject<ImperativePanelHandle | null>;
    sidebarSize: number;
    onSidebarResize: (size: number) => void;
    isChatHidden: boolean;
    agentProps: TBuildProgramDesktopLayoutAgentProps;
    routineContent: React.ReactNode;
    onTogglePosition: () => void;
    onToggleExpand: () => void;
    onToggleHide: () => void;
    isExpanded: boolean;
    maxSidebarSize: number;
}

const SIDEBAR_PANEL_CLASS =
    "border-extraLightGray bg-white sm:bg-extraLightGray dark:bg-extraDarkGray dark:text-white overflow-hidden";
const MAIN_PANEL_CLASS = "bg-white dark:bg-darkGray";

function BuildProgramDesktopLayoutInner({
    sidebarPosition,
    sidebarPanelRef,
    sidebarSize,
    onSidebarResize,
    isChatHidden,
    agentProps,
    routineContent,
    onTogglePosition,
    onToggleExpand,
    onToggleHide,
    isExpanded,
    maxSidebarSize,
}: IProps) {
    const sidebarPanel = (
        <ResizablePanel
            ref={sidebarPanelRef}
            id="sidebar"
            order={sidebarPosition === "left" ? 1 : 2}
            defaultSize={sidebarSize}
            onResize={onSidebarResize}
            minSize={0}
            maxSize={maxSidebarSize}
            collapsible
            className={SIDEBAR_PANEL_CLASS}
        >
            <Agent
                {...agentProps}
                sidebarPosition={sidebarPosition}
                onTogglePosition={onTogglePosition}
                onToggleExpand={onToggleExpand}
                onToggleHide={onToggleHide}
                isExpanded={isExpanded}
            />
        </ResizablePanel>
    );

    const mainPanel = (
        <ResizablePanel
            id="main-content"
            order={sidebarPosition === "left" ? 2 : 1}
            minSize={30}
            className={MAIN_PANEL_CLASS}
        >
            <div className="sm:pl-8 w-full max-w-full max-sm:overflow-x-hidden h-full flex flex-col">
                {routineContent}
            </div>
        </ResizablePanel>
    );

    const handle = !isChatHidden ? <ResizableHandle withHandle className="" /> : null;

    return (
        <div className="max-sm:hidden sm:block flex-1 min-h-0">
            <ResizablePanelGroup direction="horizontal">
                {sidebarPosition === "left" ? (
                    <>
                        {sidebarPanel}
                        {handle}
                        {mainPanel}
                    </>
                ) : (
                    <>
                        {mainPanel}
                        {handle}
                        {sidebarPanel}
                    </>
                )}
            </ResizablePanelGroup>
        </div>
    );
}

export const BuildProgramDesktopLayout = memo(BuildProgramDesktopLayoutInner);
