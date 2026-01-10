"use client";

import { BuildProgramPage } from "@/components/program-builder/shared/BuildProgramPage";
import { useState, useEffect } from "react";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
  } from "@/components/ui/resizable";
import { RePrompt } from "@/components/program-builder/shared/RePrompt";

const SIDEBAR_POSITION_KEY = "andy-sidebar-position";
const SIDEBAR_SIZE_KEY = "andy-sidebar-size";

export function BuildProgramClient() {
    const [sidebarPosition, setSidebarPosition] = useState<"left" | "right">("left");
    const [sidebarSize, setSidebarSize] = useState(20);

    // Load sidebar position and size from localStorage on mount
    useEffect(() => {
        const savedPosition = localStorage.getItem(SIDEBAR_POSITION_KEY) as "left" | "right" | null;
        if (savedPosition === "left" || savedPosition === "right") {
            setSidebarPosition(savedPosition);
        }
        const savedSize = localStorage.getItem(SIDEBAR_SIZE_KEY);
        if (savedSize) {
            const size = parseFloat(savedSize);
            if (size >= 20 && size <= 70) {
                setSidebarSize(size);
            }
        }
    }, []);

    const toggleSidebarPosition = () => {
        setSidebarPosition((prev) => {
            const newPosition = prev === "left" ? "right" : "left";
            localStorage.setItem(SIDEBAR_POSITION_KEY, newPosition);
            return newPosition;
        });
    };

    return (
        <>
            <div className="max-sm:hidden sm:block">
                <ResizablePanelGroup
                    direction="horizontal"
                >
                {sidebarPosition === "left" ? (
                    <>
                        <ResizablePanel
                            id="sidebar"
                            order={1}
                            defaultSize={sidebarSize}
                            onResize={(size) => {
                                setSidebarSize(size);
                                localStorage.setItem(SIDEBAR_SIZE_KEY, size.toString());
                            }}
                            minSize={20}
                            maxSize={70}
                            className="border-extraLightGray bg-extraLightGray dark:bg-extraDarkGray dark:text-white"
                        >
                            <RePrompt sidebarPosition={sidebarPosition} onTogglePosition={toggleSidebarPosition} />
                        </ResizablePanel>
                        <ResizableHandle withHandle className="" />
                        <ResizablePanel
                            id="main-content"
                            order={2}
                            minSize={30}
                        >
                            <BuildProgramPage />
                        </ResizablePanel>
                    </>
                ) : (
                    <>
                        <ResizablePanel
                            id="main-content"
                            order={1}
                            minSize={30}
                        >
                            <BuildProgramPage />
                        </ResizablePanel>
                        <ResizableHandle withHandle className="" />
                        <ResizablePanel
                            id="sidebar"
                            order={2}
                            defaultSize={sidebarSize}
                            onResize={(size) => {
                                setSidebarSize(size);
                                localStorage.setItem(SIDEBAR_SIZE_KEY, size.toString());
                            }}
                            minSize={20}
                            maxSize={70}
                            className="border-extraLightGray bg-extraLightGray dark:bg-extraDarkGray dark:text-white"
                        >
                            <RePrompt sidebarPosition={sidebarPosition} onTogglePosition={toggleSidebarPosition} />
                        </ResizablePanel>
                    </>
                )}
                </ResizablePanelGroup>
            </div>
            <div className="max-sm:block sm:hidden">
                    <BuildProgramPage />
            </div>
        </>
    );
}
