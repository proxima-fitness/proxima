"use client";

/**
 * @module PreviewContext
 * React context for toggling preview mode in the program builder and related views.
 *
 * Depends on: React context API.
 * Used by: Components that need to switch between edit and preview modes.
 */

import { createContext, useContext, ReactNode, useState } from 'react';

const PreviewContext = createContext<IPreviewContextType | undefined>(undefined);

/**
 * Provides the `isPreview` flag and setter to its descendant components.
 *
 * @param children React subtree that can consume the preview context.
 */
export const PreviewProvider = ({ children }: { children: ReactNode }) => {
    const [isPreview, setIsPreview] = useState(false);

    return (
        <PreviewContext.Provider value={ { isPreview, setIsPreview } }>
            {children}
        </PreviewContext.Provider>
    );
};

/**
 * Hook to access the current preview mode.
 *
 * Throws if called outside of a `PreviewProvider`.
 */
export const usePreview = () => {
    const context = useContext(PreviewContext);

    if (!context) {
        throw new Error('usePreview must be used within an PreviewProvider');
    }
    return context;
};
