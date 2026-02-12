"use client";
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

export const PoundsOrKgContext = createContext<IPoundsOrKgContextValue | undefined>(undefined);

const DEFAULT_POUNDS_OR_KG: IPoundsOrKgContextValue = {
    isInLbs: true,
    toggleModePreference: () => {},
};

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

export const PoundsOrKgProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isInLbs, setIsInLbs] = useState<boolean>(true);

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
