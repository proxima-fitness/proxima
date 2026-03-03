/**
 * @module ToolsTabs
 * Toolbar link "New" with icon; navigates to `/` (landing). Used in program builder header.
 * Depends on: none. Used by: build-program toolbar.
 */
"use client";

import Link from "next/link";
import { SquarePenIcon } from "lucide-react";

/** "New" link to start a fresh session on landing. */
export const ToolsTabs: React.FC = () => {

    return (
        <>
            <Link href={ `/` }>
                <div className="max-sm:hidden cursor-pointer text-sm flex flex-row justify-center items-center gap-2">
                    New
                    <SquarePenIcon size="16" />
                </div>
            </Link>
        </>
    );
};
