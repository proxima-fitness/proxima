"use client";

import { createContext, useContext, ReactNode, useState } from 'react';

const PreviewContext = createContext<IPreviewContextType | undefined>(undefined);

export const PreviewProvider = ({ children }: { children: ReactNode }) => {
    const [isPreview, setIsPreview] = useState(false);

    return (
        <PreviewContext.Provider value={ { isPreview, setIsPreview } }>
            {children}
        </PreviewContext.Provider>
    );
};

export const usePreview = () => {
    const context = useContext(PreviewContext);

    if (!context) {
        throw new Error('usePreview must be used within an PreviewProvider');
    }
    return context;
};
