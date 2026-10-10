/**
 * @module CreatedProgramsList
 *
 * **Created programs**: owner's **Proxima programs** they **Leave**d, after
 * **Hevy mirror**. Join puts them back on overview; View opens the slug page.
 * Depends on: createdProgramsModel, ProgramJoinButton, ProgramOverviewMembership
 * Used by: ProgramOverviewSection
 */

"use client";

import Link from "next/link";
import { Eye, Trash2, User } from "lucide-react";
import { ProgramJoinButton } from "@/components/programs/ProgramJoinButton";
import { Button } from "@/components/ui/button";
import { programDetailHref } from "./createdProgramsModel";
import {
    ProgramMembershipDialogs,
    useProgramMembership,
} from "./ProgramOverviewMembership";

type TCreatedProgramsListProps = {
    programs: readonly TProgram[];
};

/**
 * Recovery list of owned programs not on **Program overview**. Hidden by parent
 * when `programs` is empty.
 *
 * @param props.programs - Owned, not-subscribed **Proxima programs**
 */
export function CreatedProgramsList({ programs }: TCreatedProgramsListProps) {
    return (
        <div className="space-y-3 px-1 pt-2">
            <h3 className="text-sm font-medium text-foreground">Created programs</h3>
            <ul className="space-y-2">
                {programs.map((program) => (
                    <CreatedProgramRow key={program.id} program={program} />
                ))}
            </ul>
        </div>
    );
}

function CreatedProgramRow({ program }: { program: TProgram }) {
    const membership = useProgramMembership(program.id);
    const joinedCount = program.saves ?? 0;
    const href = programDetailHref(program.title, program.id);

    return (
        <li className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5">
            <div className="min-w-0 flex-1 space-y-0.5">
                <p className="truncate text-sm font-medium text-foreground">
                    {program.title}
                </p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="size-3.5 shrink-0" aria-hidden />
                    <span>
                        {joinedCount}{" "}
                        {joinedCount === 1 ? "lifter has" : "lifters have"} joined
                    </span>
                </p>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 px-2 text-xs font-normal text-muted-foreground"
                    asChild
                >
                    <Link href={href}>
                        <Eye className="size-3.5" aria-hidden />
                        View
                    </Link>
                </Button>
                <ProgramJoinButton
                    programId={program.id}
                    ownerUserId={program.user_id}
                    variant="inline"
                />
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-foreground"
                    aria-label="Delete program"
                    onClick={() => membership.setDeleteOpen(true)}
                >
                    <Trash2 className="size-3.5" aria-hidden />
                </Button>
            </div>
            <ProgramMembershipDialogs
                canLeave={false}
                canDelete
                deleteOpen={membership.deleteOpen}
                onDeleteOpenChange={membership.setDeleteOpen}
                onConfirmDelete={membership.confirmDelete}
                isDeleting={membership.isDeleting}
            />
        </li>
    );
}
