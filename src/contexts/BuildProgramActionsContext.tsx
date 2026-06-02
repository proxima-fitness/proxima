"use client";

/**
 * Imperative bridge for build-program actions callable from app chrome (e.g. sidebar).
 * BuildProgram registers `clearChat` during render; callers invoke it on user action.
 */

import { createContext, useContext, useMemo, useRef, type ReactNode, type RefObject } from "react";

type ClearChatFn = () => void;
type GetPersistChatIdFn = () => string;

interface IBuildProgramActionsContext {
    clearChatRef: RefObject<ClearChatFn | null>;
    clearChat: () => void;
    /** Registered by BuildProgram — URL `?chat=` or session-mint id for persistence/connect. */
    getPersistChatIdRef: RefObject<GetPersistChatIdFn | null>;
    getPersistChatId: () => string;
}

const BuildProgramActionsContext = createContext<IBuildProgramActionsContext | undefined>(undefined);

export function BuildProgramActionsProvider({ children }: { children: ReactNode }) {
    const clearChatRef = useRef<ClearChatFn | null>(null);
    const getPersistChatIdRef = useRef<GetPersistChatIdFn | null>(null);
    const value = useMemo<IBuildProgramActionsContext>(
        () => ({
            clearChatRef,
            clearChat: () => clearChatRef.current?.(),
            getPersistChatIdRef,
            getPersistChatId: () => getPersistChatIdRef.current?.() ?? "",
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
