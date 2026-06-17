"use client";

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useSyncExternalStore,
    type ReactNode,
} from "react";

import { getAgentDebugMode, setAgentDebugMode } from "@/lib/agent-debug-mode";

const AGENT_DEBUG_MODE_CHANGE_EVENT = "agent-debug-mode-change";

function subscribeToAgentDebugMode(onStoreChange: () => void) {
    window.addEventListener("storage", onStoreChange);
    window.addEventListener(AGENT_DEBUG_MODE_CHANGE_EVENT, onStoreChange);
    return () => {
        window.removeEventListener("storage", onStoreChange);
        window.removeEventListener(AGENT_DEBUG_MODE_CHANGE_EVENT, onStoreChange);
    };
}

interface IAgentDebugModeContext {
    debugMode: boolean;
    setDebugMode: (enabled: boolean) => void;
}

const AgentDebugModeContext = createContext<IAgentDebugModeContext | undefined>(undefined);

export function AgentDebugModeProvider({ children }: { children: ReactNode }) {
    const debugMode = useSyncExternalStore(
        subscribeToAgentDebugMode,
        () => getAgentDebugMode(),
        () => false,
    );

    const setDebugMode = useCallback((enabled: boolean) => {
        setAgentDebugMode(enabled);
        window.dispatchEvent(new Event(AGENT_DEBUG_MODE_CHANGE_EVENT));
    }, []);

    const value = useMemo<IAgentDebugModeContext>(
        () => ({ debugMode, setDebugMode }),
        [debugMode, setDebugMode],
    );

    return (
        <AgentDebugModeContext.Provider value={value}>
            {children}
        </AgentDebugModeContext.Provider>
    );
}

export function useAgentDebugMode() {
    const context = useContext(AgentDebugModeContext);
    if (!context) {
        throw new Error("useAgentDebugMode must be used within AgentDebugModeProvider");
    }
    return context;
}
