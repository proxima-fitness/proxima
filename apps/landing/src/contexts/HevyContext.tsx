// SPDX-License-Identifier: AGPL-3.0-only

"use client";

/**
 * @module HevyContext
 * React context for toggling whether the program builder is working with Hevy routines.
 *
 * Depends on: React context API.
 * Used by: Hevy program builder components that need to read or update the `isHevy` flag.
 */

import { createContext, useContext, ReactNode, useState, useMemo } from 'react';

const IsHevyContext = createContext<IIsHevyContextType | undefined>(undefined);

/**
 * Provides the `isHevy` flag and setter to its descendant components.
 *
 * @param children React subtree that can consume the Hevy context.
 */
export const IsHevyProvider = ({ children }: { children: ReactNode }) => {
    const [isHevy, setIsHevy] = useState(true);
    const value = useMemo(() => ({ isHevy, setIsHevy }), [isHevy]);

    return (
        <IsHevyContext.Provider value={value}>
            {children}
        </IsHevyContext.Provider>
    );
};

/**
 * Hook to access the current Hevy mode.
 *
 * Throws if called outside of an `IsHevyProvider`.
 */
export const useIsHevy = () => {
    const context = useContext(IsHevyContext);

    if (!context) {
        throw new Error('useIsHevy must be used within an IsHevyProvider');
    }
    return context;
};
