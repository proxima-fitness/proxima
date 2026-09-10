/**
 * @module ProgramOverviewHevyMirror
 *
 * Hevy mirror subsection for a Program overview slide (ADR 0020 / 04):
 * full-width; Current week folder primary; other folders behind disclosure.
 * Hevy-only empty overview lists all folders for Edit path entry.
 *
 * Depends on: useNavigateToEditHevyProgram, Button, Skeleton, Collapsible, hevy_logo
 * Used by: ProgramOverviewWeekList, ProgramOverviewSection (empty state)
 */

"use client";

import { useState } from "react";
import { ChevronRight, EditIcon } from "lucide-react";
import { hevy_logo } from "public";
import type { TProgramHevyWeekLink } from "@/api/program-hevy-links";
import { Button } from "@/components/ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useNavigateToEditHevyProgram } from "@/hooks/useNavigateToEditHevyProgram";

export type TProgramOverviewHevyMirrorProps = {
    /** Proxima program id — enables Edit current week scoping on linked rows. */
    programId?: number;
    /** Program–Hevy links for this slide’s Proxima program (omit for Hevy-only). */
    links?: readonly TProgramHevyWeekLink[];
    /** Weeks already Week complete — used to pick Current week copy. */
    completedWeeks?: readonly number[];
    hevyPrograms: THevyProgramItem[] | undefined;
    isLoadingHevy?: boolean;
    /** Empty overview: list all Hevy folders (no Proxima program). */
    hevyOnly?: boolean;
};

type TMirrorFolder = {
    key: string;
    program: THevyProgramItem;
    folderId: number;
    /** 1-based linked week, or null for an unlinked / Hevy-only folder. */
    nthWeek: number | null;
    /** Link routine ids ordered by day; empty for an unlinked folder. */
    hevyRoutineIds: readonly string[];
    weekLabel: string | null;
    isCurrent: boolean;
};

function folderIdOf(program: THevyProgramItem): number | null {
    const id = program.program[0]?.folder_id;
    if (id == null || Number.isNaN(Number(id))) {
        return null;
    }
    return Number(id);
}

function currentLinkedWeek(
    links: readonly TProgramHevyWeekLink[],
    completedWeeks: readonly number[],
): number | null {
    const completed = new Set(completedWeeks);
    const incomplete = links
        .map((l) => l.nth_week)
        .filter((w) => Number.isInteger(w) && w >= 1 && !completed.has(w));
    return incomplete.length > 0 ? Math.max(...incomplete) : null;
}

/**
 * Build mirror rows: linked weeks (Current first), then unlinked Hevy folders.
 * Hevy-only / no links → flat list of every folder.
 */
export function buildMirrorFolders(
    hevyPrograms: readonly THevyProgramItem[],
    links: readonly TProgramHevyWeekLink[],
    completedWeeks: readonly number[],
    hevyOnly: boolean,
): TMirrorFolder[] {
    const byFolder = new Map<number, THevyProgramItem>();
    for (const program of hevyPrograms) {
        const folderId = folderIdOf(program);
        if (folderId == null) continue;
        byFolder.set(folderId, program);
    }

    if (hevyOnly || links.length === 0) {
        return hevyPrograms.flatMap((program, index) => {
            const folderId = folderIdOf(program);
            if (folderId == null) return [];
            return [
                {
                    key: `hevy-${folderId}-${index}`,
                    program,
                    folderId,
                    nthWeek: null,
                    hevyRoutineIds: [],
                    weekLabel: null,
                    isCurrent: false,
                },
            ];
        });
    }

    const currentWeek = currentLinkedWeek(links, completedWeeks);
    const linked: TMirrorFolder[] = [];
    const linkedFolderIds = new Set<number>();

    for (const link of links) {
        const program = byFolder.get(link.hevy_folder_id);
        if (!program) continue;
        linkedFolderIds.add(link.hevy_folder_id);
        linked.push({
            key: `link-${link.nth_week}-${link.hevy_folder_id}`,
            program,
            folderId: link.hevy_folder_id,
            nthWeek: link.nth_week,
            hevyRoutineIds: link.hevy_routine_ids ?? [],
            weekLabel: `Week ${link.nth_week}`,
            isCurrent: currentWeek != null && link.nth_week === currentWeek,
        });
    }

    // Current week first, then higher weeks, then others.
    linked.sort((a, b) => {
        if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
        const aw = a.weekLabel ? Number(a.weekLabel.replace(/\D/g, "")) : 0;
        const bw = b.weekLabel ? Number(b.weekLabel.replace(/\D/g, "")) : 0;
        return bw - aw;
    });

    const others: TMirrorFolder[] = [];
    for (const program of hevyPrograms) {
        const folderId = folderIdOf(program);
        if (folderId == null || linkedFolderIds.has(folderId)) continue;
        others.push({
            key: `other-${folderId}`,
            program,
            folderId,
            nthWeek: null,
            hevyRoutineIds: [],
            weekLabel: null,
            isCurrent: false,
        });
    }

    return [...linked, ...others];
}

/** Primary = Current week copy; secondary = everything else (disclosure). */
export function partitionMirrorFolders(folders: readonly TMirrorFolder[]): {
    primary: TMirrorFolder[];
    secondary: TMirrorFolder[];
} {
    const primary = folders.filter((f) => f.isCurrent);
    const secondary = folders.filter((f) => !f.isCurrent);
    return { primary, secondary };
}

function MirrorFolderRow({
    folder,
    onEdit,
    busy,
}: {
    folder: TMirrorFolder;
    onEdit: () => void;
    busy: boolean;
}) {
    const routineCount = folder.program.program.length;
    return (
        <div
            className={
                folder.isCurrent
                    ? "flex items-center gap-3 bg-muted px-1 py-2.5 sm:px-2"
                    : "flex items-center gap-3 px-1 py-2.5 sm:px-2"
            }
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={(hevy_logo as { src: string }).src}
                alt=""
                className="h-5 w-auto shrink-0 object-contain opacity-90"
            />
            <div className="min-w-0 flex-1">
                <p
                    className={
                        folder.isCurrent
                            ? "truncate text-sm font-medium text-lightSecondary"
                            : "truncate text-sm font-medium text-foreground"
                    }
                >
                    {folder.program.program_title || "Hevy folder"}
                </p>
                <p className="text-xs text-muted-foreground">
                    {folder.weekLabel ? (
                        <>
                            {folder.weekLabel}
                            {folder.isCurrent ? " · Current" : ""}
                            {" · "}
                        </>
                    ) : null}
                    {routineCount} routine{routineCount !== 1 ? "s" : ""}
                </p>
            </div>
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 rounded-full border-border/80"
                disabled={busy}
                onClick={onEdit}
            >
                <EditIcon className="size-3.5" aria-hidden />
                Edit
            </Button>
        </div>
    );
}

function MirrorFolderList({
    folders,
    busyKey,
    onEdit,
}: {
    folders: readonly TMirrorFolder[];
    busyKey: string | null;
    onEdit: (folder: TMirrorFolder) => void;
}) {
    return (
        <ul className="mt-1 flex list-none flex-col p-0" aria-label="In Hevy">
            {folders.map((folder) => (
                <li
                    key={folder.key}
                    className="list-none border-b border-border/40 last:border-b-0"
                >
                    <MirrorFolderRow
                        folder={folder}
                        busy={busyKey === folder.key}
                        onEdit={() => {
                            onEdit(folder);
                        }}
                    />
                </li>
            ))}
        </ul>
    );
}

/**
 * Compact Hevy mirror list for one overview slide (or empty-state Hevy-only).
 */
export function ProgramOverviewHevyMirror({
    programId,
    links = [],
    completedWeeks = [],
    hevyPrograms,
    isLoadingHevy = false,
    hevyOnly = false,
}: TProgramOverviewHevyMirrorProps) {
    const navigateToEdit = useNavigateToEditHevyProgram();
    const [busyKey, setBusyKey] = useState<string | null>(null);
    const [othersOpen, setOthersOpen] = useState(false);

    if (isLoadingHevy) {
        return (
            <div className="w-full space-y-2 px-1" aria-hidden>
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-14 w-full rounded-xl" />
            </div>
        );
    }

    const programs = hevyPrograms ?? [];
    const folders = buildMirrorFolders(programs, links, completedWeeks, hevyOnly);

    if (folders.length === 0) {
        if (hevyOnly) {
            return null;
        }
        return (
            <div className="w-full px-1">
                <h4 className="text-xs text-muted-foreground">In Hevy</h4>
                <p className="mt-2 text-sm text-muted-foreground">
                    Week Export creates this program&apos;s Hevy week copy here.
                </p>
            </div>
        );
    }

    const handleEdit = async (folder: TMirrorFolder) => {
        if (busyKey) return;
        setBusyKey(folder.key);
        try {
            // Edit current week scoping only for a linked week that is still live.
            // A Week complete week is history — editing its folder is a plain
            // Hevy-scope edit and must not claim a program + week (ADR 0013).
            const scoped =
                programId != null
                && folder.nthWeek != null
                && !completedWeeks.includes(folder.nthWeek);
            await navigateToEdit(
                folder.program,
                scoped
                    ? {
                        programId,
                        nthWeek: folder.nthWeek as number,
                        hevyRoutineIds: folder.hevyRoutineIds,
                    }
                    : {},
            );
        } finally {
            setBusyKey(null);
        }
    };

    // Hevy-only: list every folder (Edit path entry). Linked: Current primary + disclosure.
    const useDisclosure = !hevyOnly && links.length > 0;
    const { primary, secondary } = useDisclosure
        ? partitionMirrorFolders(folders)
        : { primary: folders, secondary: [] as TMirrorFolder[] };

    return (
        <div className="w-full px-1">
            <h4 className="text-xs text-muted-foreground">In Hevy</h4>
            {primary.length > 0 ? (
                <MirrorFolderList
                    folders={primary}
                    busyKey={busyKey}
                    onEdit={(folder) => {
                        void handleEdit(folder);
                    }}
                />
            ) : null}
            {secondary.length > 0 ? (
                <Collapsible open={othersOpen} onOpenChange={setOthersOpen} className="mt-1">
                    <CollapsibleTrigger
                        className="flex w-full items-center justify-between gap-2 py-2 text-left text-xs text-muted-foreground hover:text-foreground"
                        aria-label={
                            othersOpen
                                ? "Collapse other folders in Hevy"
                                : "Expand other folders in Hevy"
                        }
                    >
                        <span>
                            Other folders in Hevy ({secondary.length})
                        </span>
                        <ChevronRight
                            className={cn(
                                "size-3.5 shrink-0 transition-transform",
                                othersOpen && "rotate-90",
                            )}
                            aria-hidden
                        />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <MirrorFolderList
                            folders={secondary}
                            busyKey={busyKey}
                            onEdit={(folder) => {
                                void handleEdit(folder);
                            }}
                        />
                    </CollapsibleContent>
                </Collapsible>
            ) : null}
        </div>
    );
}
