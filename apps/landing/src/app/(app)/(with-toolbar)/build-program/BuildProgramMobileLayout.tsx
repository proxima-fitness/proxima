// SPDX-License-Identifier: AGPL-3.0-only

"use client";

import { memo, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChatKeyboardChrome } from "@/components/program-builder/shared/agent/useChatKeyboardChrome";
import { cn } from "@/lib/utils";
import { Calendar, MessageSquare } from "lucide-react";

export interface IProps {
    mobileTab: string;
    onMobileTabChange: (value: string) => void;
    hasProgramContent: boolean;
    chatPanel: React.ReactNode;
    routineContent: React.ReactNode;
}

const CHAT_TRIGGER_CLASS =
    "flex-1 data-[state=active]:font-semibold data-[state=active]:text-lightSecondary data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-800 rounded-2xl py-2 flex flex-row items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors";
const PROGRAM_TRIGGER_CLASS_ACTIVE =
    "flex-1 rounded-2xl py-2 flex flex-row items-center justify-center gap-2 transition-colors data-[state=active]:font-semibold data-[state=active]:text-lightSecondary data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900";
const PROGRAM_TRIGGER_CLASS_DISABLED = "flex-1 rounded-2xl py-2 flex flex-row items-center justify-center gap-2 transition-colors opacity-50 cursor-not-allowed";

function BuildProgramMobileLayoutInner({
    mobileTab,
    onMobileTabChange,
    hasProgramContent,
    chatPanel,
    routineContent,
}: IProps) {
    const handleValueChange = useCallback(
        (value: string) => {
            if (value === "program" && !hasProgramContent) return;
            onMobileTabChange(value);
        },
        [hasProgramContent, onMobileTabChange]
    );

    useChatKeyboardChrome();

    return (
        <div
            data-proxima-mobile-shell=""
            className="max-sm:block sm:hidden h-[calc(100vh-4rem)] flex flex-col relative"
        >
            <Tabs value={mobileTab} onValueChange={handleValueChange} className="flex flex-col h-full">
                <TabsContent
                    value="chat"
                    data-proxima-chat-tab=""
                    className="flex-1 flex flex-col min-h-0 overflow-hidden m-0 mt-0"
                >
                    {chatPanel}
                </TabsContent>
                <TabsContent value="program" className="flex-1 overflow-hidden m-0 mt-0 px-2 pb-12 bg-white dark:bg-darkGray">
                    <div className="w-full max-w-full overflow-x-hidden h-full">
                        {routineContent}
                    </div>
                </TabsContent>
                <TabsList
                    data-proxima-mobile-tab-bar=""
                    className="fixed bottom-0 left-0 right-0 w-full justify-around rounded-none border-t bg-background shadow-lg px-4 py-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] h-[calc(70px+max(0.5rem,env(safe-area-inset-bottom)))] z-50"
                >
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
