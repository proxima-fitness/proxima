"use client";
/**
 * @module PoundsOrKgContext
 * React context for storing whether weights are displayed in pounds or kilograms.
 *
 * Depends on: React context API, `localStorage`.
 * Used by: Program builder and exercise UI that need to format weight units.
 */
import { createContext, ReactNode, useContext, useState } from 'react';

export const PoundsOrKgContext = createContext<IPoundsOrKgContextValue | undefined>(undefined);

const DEFAULT_POUNDS_OR_KG: IPoundsOrKgContextValue = {
    isInLbs: true,
    toggleModePreference: () => {},
};

/**
 * Hook that returns the current pounds vs kilograms preference.
 *
 * Falls back to a default value when no provider is mounted.
 */
export const usePoundsOrKgContext = () => {
    const context = useContext(PoundsOrKgContext);
    return context ?? DEFAULT_POUNDS_OR_KG;
};

const setPoundsOrKgPreference = (isInLbs: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('isInLbs', isInLbs);
};

const getPoundsOrKgPreference = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('isInLbs');
};

const stringToBool = (text: "true" | "false"): boolean => {
    return text === "true";
};

/**
 * Provides the pounds vs kilograms preference to its descendants.
 *
 * @param children React subtree that can consume the unit preference context.
 */
export const PoundsOrKgProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isInLbs, setIsInLbs] = useState<boolean>(() => {
        const saved = getPoundsOrKgPreference();
        if (saved !== null) {
            return stringToBool(saved as "true" | "false");
        }
        return true;
    });

    const toggleModePreference = () => {
        const newMode = !isInLbs;
        setIsInLbs(newMode);
        setPoundsOrKgPreference(String(newMode));
        console.log('Units:', newMode ? 'Pounds' : 'Kilograms');
    };

    return (
        <PoundsOrKgContext.Provider value={ { isInLbs, toggleModePreference } }>
            {children}
        </PoundsOrKgContext.Provider>
    );
};
