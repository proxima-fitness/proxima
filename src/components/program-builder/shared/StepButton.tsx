/**
 * @module StepButton
 * CTA for program builder: "Sign in to save" when anonymous, "Export" when logged in; opens ExportDialog.
 * Depends on: ExportDialog, useUserContext. Used by: build-program toolbar / steps.
 */
"use client";

import { Button } from "@/components/ui/button";
import { ArrowRightIcon, ArrowRightToLineIcon } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { ExportDialog } from "./ExportDialog";
import { useUserContext } from "@/contexts/UserContext";
import posthog from "posthog-js";
// import { ShareDialog } from "./ShareDialog";

const BUILD_PROGRAM_PATH = "/build-program?resume=true";
const LOGIN_WITH_NEXT = `/auth/login?next=${encodeURIComponent(BUILD_PROGRAM_PATH)}`;

/** Shows Loading, Sign in link, or Export button; Export opens ExportDialog. */
export const StepButton: React.FC = () => {

    const { user, isLoading } = useUserContext();
    const [openExportDialog, setOpenExportDialog] = useState(false);


    if (isLoading) {
        return (
            <Button
                variant="default"
                className="text-white bg-lightSecondary hover:bg-black"
                disabled
            >
                <span className="hidden sm:inline">Loading...</span>
                <ArrowRightIcon />
            </Button>
        );
    }

    if (!user) {
        return (
            <Link href={LOGIN_WITH_NEXT}>
                <Button
                    variant="default"
                    className="text-white bg-lightSecondary hover:bg-black"
                >
                    <span className="hidden sm:inline">Sign in to save</span>
                    <span className="sm:hidden">Sign in</span>
                    <ArrowRightIcon />
                </Button>
            </Link>
        );
    }

    return (
        <>
            <Button
                variant="default"
                className="text-white bg-lightSecondary hover:bg-lightSecondary/80"
                onClick={() => {
                posthog?.capture?.("opened_export_dialog", { user: user?.id ?? "user_id_unknown" });
                setOpenExportDialog(true);
            }}
            >
                <span className="hidden sm:inline">Export</span>
                <span className="sm:hidden">Export</span>
                <ArrowRightToLineIcon />
            </Button>
            <ExportDialog
                open={openExportDialog}
                onOpenChange={setOpenExportDialog}
                programId={0}
            />
        </>
    );
};
