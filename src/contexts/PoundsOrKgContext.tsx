"use client";
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

export const PoundsOrKgContext = createContext<IPoundsOrKgContextValue | undefined>(undefined);

export const usePoundsOrKgContext = () => {
    const context = useContext(PoundsOrKgContext);
    if (!context) {
        throw new Error('usePoundsOrKgContext must be used within a PoundsOrKgProvider');
    }
    return context;
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

export const PoundsOrKgProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isInLbs, setIsInLbs] = useState<boolean>(() => {
        const savedMode = getPoundsOrKgPreference();
        if (savedMode === null) {
            setPoundsOrKgPreference(String(true));
            return true; // If no saved preference, default to pounds
        }
        return stringToBool(savedMode as "true" | "false");
    });

    useEffect(() => {
        const saved = getPoundsOrKgPreference();
        if (saved !== null) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsInLbs(stringToBool(saved as "true" | "false"));
        }
    }, []);

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
