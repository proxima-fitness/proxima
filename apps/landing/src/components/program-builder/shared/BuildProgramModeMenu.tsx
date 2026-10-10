/**
 * @module BuildProgramModeMenu
 * Breadcrumb dropdown for program mode. With `hevy=true`, offers New vs Edit (`edit=true`).
 * Without `hevy`, the dropdown only lists New (no Edit option).
 * Depends on: DropdownMenu, next/navigation. Used by: Breadcrumbs (desktop).
 */
"use client";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { newPathLeaveGuard } from "@/hooks/create-leave-guard";
import { ChevronsUpDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface IBuildProgramModeMenuProps {
    className?: string;
    triggerClassName?: string;
}

export function BuildProgramModeMenu({ className, triggerClassName }: IBuildProgramModeMenuProps) {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const hevyMode = searchParams.get("hevy") === "true";
    const editMode = searchParams.get("edit") === "true";
    const value = (editMode && hevyMode) ? "edit" : "new";

    const applyMode = useCallback(
        (next: string) => {
            if (next !== "new" && next !== "edit") return;
            const params = new URLSearchParams(searchParams.toString());
            if (next === "edit") {
                params.set("edit", "true");
            } else {
                params.delete("edit");
            }
            const qs = params.toString();
            const href = qs ? `${pathname}?${qs}` : pathname;
            if (newPathLeaveGuard.requestLeave(href)) return;
            router.replace(href);
        },
        [pathname, router, searchParams]
    );

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                className={cn(
                    " cursor-pointer inline-flex items-center gap-1 text-sm text-foreground transition-colors hover:text-foreground/80 focus-visible:outline-none select-none",
                    triggerClassName
                )}
                aria-label={hevyMode ? "Switch program mode" : "Program mode"}
            >
                <span>{(editMode && hevyMode) ? "Edit" : "New"}</span>
                <ChevronsUpDown className="size-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                className={cn("min-w-36", className)}
            >
                <DropdownMenuRadioGroup value={value} onValueChange={applyMode}>
                    <DropdownMenuRadioItem value="new" className="cursor-pointer">
                        New
                        <span className="ml-2 text-xs text-muted-foreground">Save to Proxima</span>
                    </DropdownMenuRadioItem>
                    {hevyMode ? (
                        <DropdownMenuRadioItem value="edit" className="cursor-pointer">
                            Edit
                            <span className="ml-2 text-xs text-muted-foreground">Sync to Hevy</span>
                        </DropdownMenuRadioItem>
                    ) : null}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
