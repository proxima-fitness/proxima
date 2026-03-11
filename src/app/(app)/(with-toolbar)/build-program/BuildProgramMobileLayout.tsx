"use client";

import { memo, useCallback } from "react";
import { Agent } from "@/components/program-builder/shared/agent/Agent";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Calendar, MessageSquare } from "lucide-react";
import type { TBuildProgramDesktopLayoutAgentProps } from "./BuildProgramDesktopLayout";

export interface IProps {
    mobileTab: string;
    onMobileTabChange: (value: string) => void;
    hasProgramContent: boolean;
    agentProps: TBuildProgramDesktopLayoutAgentProps;
    routineContent: React.ReactNode;
    onToggleHide: () => void;
}

const CHAT_TRIGGER_CLASS =
    "flex-1 data-[state=active]:font-semibold data-[state=active]:text-lightSecondary data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-800 rounded-lg py-2 flex flex-row items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors";
const PROGRAM_TRIGGER_CLASS_ACTIVE =
    "flex-1 rounded-lg py-2 flex flex-row items-center justify-center gap-2 transition-colors data-[state=active]:font-semibold data-[state=active]:text-lightSecondary data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900";
const PROGRAM_TRIGGER_CLASS_DISABLED = "flex-1 rounded-lg py-2 flex flex-row items-center justify-center gap-2 transition-colors opacity-50 cursor-not-allowed";

function BuildProgramMobileLayoutInner({
    mobileTab,
    onMobileTabChange,
    hasProgramContent,
    agentProps,
    routineContent,
    onToggleHide,
}: IProps) {
    const handleValueChange = useCallback(
        (value: string) => {
            if (value === "program" && !hasProgramContent) return;
            onMobileTabChange(value);
        },
        [hasProgramContent, onMobileTabChange]
    );

    return (
        <div className="max-sm:block sm:hidden h-[calc(100vh-4rem)] flex flex-col relative">
            <Tabs value={mobileTab} onValueChange={handleValueChange} className="flex flex-col h-full">
                <TabsContent value="chat" className="flex-1 m-0 mt-0 px-4 pb-20">
                    <Agent
                        {...agentProps}
                        sidebarPosition="left"
                        onTogglePosition={() => {}}
                        onToggleExpand={() => {}}
                        onToggleHide={onToggleHide}
                        isExpanded={false}
                    />
                </TabsContent>
                <TabsContent value="program" className="flex-1 overflow-y-auto m-0 mt-0 px-4 pb-20 bg-white dark:bg-darkGray">
                    <div className="w-full max-w-full overflow-x-hidden">
                        {routineContent}
                    </div>
                </TabsContent>
                <TabsList className="fixed bottom-0 left-0 right-0 w-full justify-around rounded-none border-t bg-background shadow-lg px-4 py-3 h-[70px] z-50">
                    <TabsTrigger value="chat" className={CHAT_TRIGGER_CLASS}>
                        <MessageSquare className="h-5 w-5" />
                        <span>Chat</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="program"
                        disabled={!hasProgramContent}
                        className={cn(
                            hasProgramContent ? PROGRAM_TRIGGER_CLASS_ACTIVE : PROGRAM_TRIGGER_CLASS_DISABLED
                        )}
                    >
                        <Calendar className="h-5 w-5" />
                        <span>Program</span>
                    </TabsTrigger>
                </TabsList>
            </Tabs>
        </div>
    );
}

export const BuildProgramMobileLayout = memo(BuildProgramMobileLayoutInner);
