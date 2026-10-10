// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module ProgramJoinMeta
 * Title-card Join row: joined count plus the Join control (hidden for owner / unsigned).
 * Depends on: ProgramJoinButton, lucide User icon.
 * Used by: ProgramsSlugLayout.
 */
"use client";

import { User } from "lucide-react";
import { ProgramJoinButton } from "./ProgramJoinButton";

interface IProps {
    ownerUserId?: string | null;
    programId: number;
    saves: number | null;
}

/**
 * Joined-count line on `/programs/{id}` with an inline Join control.
 *
 * @param props Program id, owner, and current saves count
 */
export const ProgramJoinMeta: React.FC<IProps> = ({
    programId,
    ownerUserId = null,
    saves,
}) => {
    const joinedCount = saves ?? 0;

    return (
        <>
            <User className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
                {joinedCount} {joinedCount === 1 ? "lifter has" : "lifters have"} joined
            </span>
            <ProgramJoinButton
                programId={programId}
                ownerUserId={ownerUserId}
                hideForOwner
                variant="inline"
            />
        </>
    );
};
