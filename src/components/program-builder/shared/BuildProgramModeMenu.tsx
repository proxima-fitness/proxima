/**
 * @module BuildProgramModeMenu
 * Dropdown menu for selecting New (export) or Edit (sync) mode via `edit=true` URL param.
 * Designed to look like a breadcrumb segment (ghost trigger + chevrons icon).
 * Depends on: DropdownMenu, next/navigation. Used by: Breadcrumbs (desktop), BuildProgramToolbarEnd (mobile).
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
    const isEditMode = searchParams.get("edit") === "true";
    const value = isEditMode ? "edit" : "new";

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
            router.replace(qs ? `${pathname}?${qs}` : pathname);
        },
        [pathname, router, searchParams]
    );

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                className={cn(
                    "inline-flex items-center gap-1 text-sm text-foreground transition-colors hover:text-foreground/80 focus-visible:outline-none cursor-pointer select-none",
                    triggerClassName
                )}
                aria-label="Switch program mode"
            >
                <span>{isEditMode ? "Edit" : "New"}</span>
                <ChevronsUpDown className="size-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                className={cn("min-w-36", className)}
            >
                <DropdownMenuRadioGroup value={value} onValueChange={applyMode}>
                    <DropdownMenuRadioItem value="new">
                        New
                        <span className="ml-2 text-xs text-muted-foreground">Export as new</span>
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="edit">
                        Edit
                        <span className="ml-2 text-xs text-muted-foreground">Sync to existing</span>
                    </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
