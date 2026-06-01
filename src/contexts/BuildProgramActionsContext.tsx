"use client";

/**
 * Imperative bridge for build-program actions callable from app chrome (e.g. sidebar).
 * BuildProgram registers `clearChat` during render; callers invoke it on user action.
 */

import { createContext, useContext, useMemo, useRef, type ReactNode, type RefObject } from "react";

type ClearChatFn = () => void;

interface IBuildProgramActionsContext {
    clearChatRef: RefObject<ClearChatFn | null>;
    clearChat: () => void;
}

const BuildProgramActionsContext = createContext<IBuildProgramActionsContext | undefined>(undefined);

export function BuildProgramActionsProvider({ children }: { children: ReactNode }) {
    const clearChatRef = useRef<ClearChatFn | null>(null);
    const value = useMemo<IBuildProgramActionsContext>(
        () => ({
            clearChatRef,
            clearChat: () => clearChatRef.current?.(),
        }),
        [],
    );

    return <BuildProgramActionsContext.Provider value={value}>{children}</BuildProgramActionsContext.Provider>;
}

export function useBuildProgramActions() {
    const context = useContext(BuildProgramActionsContext);
    if (!context) {
        throw new Error("useBuildProgramActions must be used within BuildProgramActionsProvider");
    }
    return context;
}
