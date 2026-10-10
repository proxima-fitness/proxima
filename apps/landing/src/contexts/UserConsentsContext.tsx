"use client";

/**
 * @module UserConsentsContext
 *
 * Loads current policy versions and the signed-in user's consent row; exposes
 * legal-acceptance gate state and accept/refresh helpers for the app shell.
 *
 * Depends on: React Query, UserContext, api/user-consents, lib/policy-versions
 * Used by: (app)/layout via UserConsentsShell, LegalAcceptanceDialog
 */

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
    CURRENT_POLICY_VERSIONS_QUERY_KEY,
    USER_CONSENTS_QUERY_KEY,
    fetchCurrentPolicyVersions,
    fetchUserConsents,
    putUserConsents,
} from "@/api/user-consents";
import { isLegalAcceptanceCurrent } from "@/lib/policy-versions";
import { useUserContext } from "@/contexts/UserContext";

interface IUserConsentsContextValue {
    needsLegalAcceptance: boolean;
    consents: TUserConsentsRow | null | undefined;
    currentVersions: TCurrentPolicyVersions | undefined;
    isLoading: boolean;
    acceptLegal: (optional?: Pick<TOptionalConsentUpdates, "platformImprovementOptIn" | "marketingOptIn">) => Promise<void>;
    refresh: () => Promise<void>;
}

const UserConsentsContext = createContext<IUserConsentsContextValue | undefined>(undefined);

/** Provides consent gate state to descendants. */
export function UserConsentsProvider({ children }: { children: ReactNode }) {
    const { user, isLoading: isUserLoading } = useUserContext();
    const queryClient = useQueryClient();
    const isAuthenticated = !!user;

    const {
        data: currentVersions,
        isLoading: isVersionsLoading,
    } = useQuery({
        queryKey: CURRENT_POLICY_VERSIONS_QUERY_KEY,
        queryFn: fetchCurrentPolicyVersions,
        enabled: isAuthenticated,
    });

    const {
        data: consents,
        isLoading: isConsentsLoading,
    } = useQuery({
        queryKey: USER_CONSENTS_QUERY_KEY,
        queryFn: fetchUserConsents,
        enabled: isAuthenticated,
    });

    const isLoading =
        isUserLoading ||
        (isAuthenticated && (isVersionsLoading || isConsentsLoading));

    const needsLegalAcceptance =
        isAuthenticated &&
        !isLoading &&
        !!currentVersions &&
        !isLegalAcceptanceCurrent(consents ?? null, currentVersions);

    const refresh = useCallback(async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: CURRENT_POLICY_VERSIONS_QUERY_KEY }),
            queryClient.invalidateQueries({ queryKey: USER_CONSENTS_QUERY_KEY }),
        ]);
    }, [queryClient]);

    const acceptLegal = useCallback(
        async (optional?: Pick<TOptionalConsentUpdates, "platformImprovementOptIn" | "marketingOptIn">) => {
            if (!currentVersions) {
                throw new Error("Current policy versions are unavailable");
            }

            const row = await putUserConsents({
                termsVersionId: currentVersions.terms.id,
                privacyVersionId: currentVersions.privacy.id,
                ...optional,
            });

            queryClient.setQueryData(USER_CONSENTS_QUERY_KEY, row);
        },
        [currentVersions, queryClient],
    );

    const value = useMemo(
        () => ({
            needsLegalAcceptance,
            consents,
            currentVersions,
            isLoading,
            acceptLegal,
            refresh,
        }),
        [needsLegalAcceptance, consents, currentVersions, isLoading, acceptLegal, refresh],
    );

    return (
        <UserConsentsContext.Provider value={value}>
            {children}
        </UserConsentsContext.Provider>
    );
}

/** Reads consent gate state. Must be used within UserConsentsProvider. */
export function useUserConsentsContext() {
    const context = useContext(UserConsentsContext);
    if (!context) {
        throw new Error("useUserConsentsContext must be used within a UserConsentsProvider");
    }
    return context;
}
