"use client";

/**
 * Imperative bridge for build-program actions callable from app shell (e.g. sidebar).
 * BuildProgram registers `clearChat` during render; callers invoke it on user action.
 */

import { createContext, useContext, useMemo, useRef, type ReactNode, type RefObject } from "react";

type TClearChatFn = () => void;
type TGetPersistChatIdFn = () => string;

interface IBuildProgramActionsContext {
    clearChatRef: RefObject<TClearChatFn | null>;
    clearChat: () => void;
    /** Registered on build-program; export reads URL + mint ref at save time. */
    getPersistChatIdRef: RefObject<TGetPersistChatIdFn | null>;
}

const BuildProgramActionsContext = createContext<IBuildProgramActionsContext | undefined>(undefined);

export function BuildProgramActionsProvider({ children }: { children: ReactNode }) {
    const clearChatRef = useRef<TClearChatFn | null>(null);
    const getPersistChatIdRef = useRef<TGetPersistChatIdFn | null>(null);
    const value = useMemo<IBuildProgramActionsContext>(
        () => ({
            clearChatRef,
            clearChat: () => clearChatRef.current?.(),
            getPersistChatIdRef,
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
