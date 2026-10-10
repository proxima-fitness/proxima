// SPDX-License-Identifier: AGPL-3.0-only

"use client";

/**
 * @module UserConsentsShell
 *
 * Composes UserConsentsProvider with LegalAcceptanceDialog without a context↔dialog
 * import cycle.
 *
 * Depends on: UserConsentsContext, LegalAcceptanceDialog
 * Used by: (app)/layout
 */

import type { ReactNode } from "react";

import { LegalAcceptanceDialog } from "@/components/legal/LegalAcceptanceDialog";
import { UserConsentsProvider } from "@/contexts/UserConsentsContext";

/** Wraps the app with consent state and mounts the legal acceptance gate. */
export function UserConsentsShell({ children }: { children: ReactNode }) {
    return (
        <UserConsentsProvider>
            {children}
            <LegalAcceptanceDialog />
        </UserConsentsProvider>
    );
}
