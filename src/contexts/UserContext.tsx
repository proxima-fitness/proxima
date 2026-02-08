"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/api';

interface ISessionContextValue {
    user: User | null;
    setUser: (user: User | null) => void;
    isLoading: boolean;
}

const UserContext = createContext<ISessionContextValue | undefined>(undefined);

// Function to get server-side session
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

    return (
        <UserContext.Provider value={ { user, setUser, isLoading } }>
            {children}
        </UserContext.Provider>
    );
};

export const useUserContext = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUserContext must be used within a UserProvider');
    }
    return context;
};
