/**
 * @module ProgramOverviewHevyMirror
 *
 * Hevy mirror subsection for a Program overview slide (ADR 0010 / 04):
 * that program’s linked Hevy week copy, plus Hevy-only folders for Edit path.
 * Replaces standalone “My Hevy Programs” grid.
 *
 * Depends on: useNavigateToEditHevyProgram, Button, Skeleton, hevy_logo
 * Used by: ProgramOverviewWeekList, ProgramOverviewSection (empty state)
 */

"use client";

import { useState } from "react";
import { EditIcon } from "lucide-react";
import { hevy_logo } from "public";
import type { TProgramHevyWeekLink } from "@/api/program-hevy-links";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigateToEditHevyProgram } from "@/hooks/useNavigateToEditHevyProgram";

export type TProgramOverviewHevyMirrorProps = {
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

function buildMirrorFolders(
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
            weekLabel: null,
            isCurrent: false,
        });
    }

    return [...linked, ...others];
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
                    ? "flex items-center gap-3 rounded-xl border border-lightSecondary/30 bg-muted/40 px-3 py-2.5"
                    : "flex items-center gap-3 rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5"
            }
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={(hevy_logo as { src: string }).src}
                alt=""
                className="h-5 w-auto shrink-0 object-contain opacity-90"
            />
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
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

/**
 * Compact Hevy mirror list for one overview slide (or empty-state Hevy-only).
 */
export function ProgramOverviewHevyMirror({
    links = [],
    completedWeeks = [],
    hevyPrograms,
    isLoadingHevy = false,
    hevyOnly = false,
}: TProgramOverviewHevyMirrorProps) {
    const navigateToEdit = useNavigateToEditHevyProgram();
    const [busyKey, setBusyKey] = useState<string | null>(null);

    if (isLoadingHevy) {
        return (
            <div className="mx-auto w-full max-w-md space-y-2 px-1" aria-hidden>
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
            <div className="mx-auto w-full max-w-md px-1">
                <h4 className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
                    Hevy mirror
                </h4>
                <p className="mt-2 text-center text-sm text-muted-foreground">
                    Week Export creates this program&apos;s Hevy week copy here.
                </p>
            </div>
        );
    }

    const linkedCount = folders.filter((f) => f.weekLabel != null).length;
    const showOtherHeading = !hevyOnly && linkedCount > 0 && folders.some((f) => f.weekLabel == null);

    const handleEdit = async (folder: TMirrorFolder) => {
        if (busyKey) return;
        setBusyKey(folder.key);
        try {
            await navigateToEdit(folder.program);
        } finally {
            setBusyKey(null);
        }
    };

    return (
        <div className="mx-auto w-full max-w-md px-1">
            <h4 className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
                Hevy mirror
            </h4>
            <ul className="mt-2 flex list-none flex-col gap-2 p-0" aria-label="Hevy mirror">
                {folders.map((folder) => {
                    const isFirstOther =
                        showOtherHeading &&
                        folder.weekLabel == null &&
                        folders.find((f) => f.weekLabel == null)?.key === folder.key;
                    return (
                        <li key={folder.key} className="list-none">
                            {isFirstOther ? (
                                <p className="pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
                                    Other Hevy folders
                                </p>
                            ) : null}
                            <MirrorFolderRow
                                folder={folder}
                                busy={busyKey === folder.key}
                                onEdit={() => {
                                    void handleEdit(folder);
                                }}
                            />
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
