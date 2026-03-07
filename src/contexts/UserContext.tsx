"use client";

/**
 * @module UserContext
 * React context for sharing the authenticated Supabase user and loading state across the app.
 *
 * Depends on: Supabase client, React Query, `/api/auth/session` endpoint.
 * Used by: Auth-sensitive pages and components that need access to the current user.
 */

import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/api';

/**
 * Context value describing the current authentication session.
 *
 * @property user Currently authenticated Supabase user, or `null` when logged out.
 * @property setUser Imperative setter for overriding the cached `user` value.
 * @property isLoading Indicates whether the initial auth state is still being resolved.
 */
interface ISessionContextValue {
    user: User | null;
    setUser: (user: User | null) => void;
    isLoading: boolean;
}

const UserContext = createContext<ISessionContextValue | undefined>(undefined);

/**
 * Fetches the server-side session from `/api/auth/session` if available.
 *
 * @returns The authenticated `User` when a session exists, otherwise `null`.
 */
const getServerSession = async (): Promise<User | null> => {
    try {
        const response = await fetch('/api/auth/session', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.ok) {
            const data = await response.json();
            return data.user;
        }
    } catch (error) {
        console.error('Error fetching server session:', error);
    }
    return null;
};

/**
 * Provides the authenticated user and loading state to its descendants.
 *
 * @param children React subtree that can consume the user context.
 */
export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const queryClient = useQueryClient();

    useEffect(() => {
        const initializeSession = async () => {
            try {
                // First try to get server-side session
                const serverUser = await getServerSession();

                if (serverUser) {
                    setUser(serverUser);
                } else {
                    // Fallback to client-side session
                    const { data: { session } } = await supabase.auth.getSession();
                    setUser(session?.user ?? null);
                }
            } catch (error) {
                console.error('Error initializing session:', error);
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        initializeSession();

        // Listen for auth state changes (client-side)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            setIsLoading(false);
            if (session?.user) {
                queryClient.invalidateQueries({ queryKey: ["feature-limits"] });
            }
        });

        return () => subscription.unsubscribe();
    }, [queryClient]);

    const value = useMemo(() => ({ user, setUser, isLoading }), [user, isLoading]);

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};

/**
 * Hook to consume the current authentication context.
 *
 * Throws if used outside of a `UserProvider`.
 */
export const useUserContext = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUserContext must be used within a UserProvider');
    }
    return context;
};
