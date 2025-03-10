"use client";

import { createContext, useContext, ReactNode, useState } from 'react';

const IsHevyContext = createContext<IsHevyContextType | undefined>(undefined);

export const IsHevyProvider = ({ children }: { children: ReactNode }) => {
    const [isHevy, setIsHevy] = useState(true);

    return (
        <IsHevyContext.Provider value={{ isHevy, setIsHevy }}>
        {children}
        </IsHevyContext.Provider>
    );
};

export const useIsHevy = () => {
    const context = useContext(IsHevyContext);

    if (!context) {
        throw new Error('useIsHevy must be used within an IsHevyProvider');
    }
    return context;
};
