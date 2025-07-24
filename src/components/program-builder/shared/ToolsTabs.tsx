"use client";

import Link from "next/link";
import { SquarePenIcon } from "lucide-react";

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
