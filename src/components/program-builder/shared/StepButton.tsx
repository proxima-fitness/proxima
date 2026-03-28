/**
 * @module StepButton
 * CTA for program builder: "Sign in to save" when anonymous; when logged in, "Export"
 * (opens ExportDialog) or "Sync" (opens SyncToHevyDialog) when `edit=true`.
 * Depends on: ExportDialog, SyncToHevyDialog, useUserContext, useSearchParams. Used by: build-program toolbar / steps.
 */
"use client";

import { Button } from "@/components/ui/button";
import { ArrowRightIcon, ArrowRightToLineIcon, RefreshCw } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ExportDialog } from "./ExportDialog";
import { SyncToHevyDialog } from "./SyncToHevyDialog";
import { useUserContext } from "@/contexts/UserContext";
import posthog from "posthog-js";
import { toast } from "sonner";

const BUILD_PROGRAM_PATH = "/build-program?resume=true";
const LOGIN_WITH_NEXT = `/auth/login?next=${encodeURIComponent(BUILD_PROGRAM_PATH)}`;

/** Shows Loading, Sign in link, or Export / Sync; Export opens ExportDialog, Sync opens SyncToHevyDialog. */
export const StepButton: React.FC = () => {
    const searchParams = useSearchParams();
    const edit = searchParams.get("edit");
    const isEditMode = edit === "true";

    const { user, isLoading } = useUserContext();
    const [openExportDialog, setOpenExportDialog] = useState(false);
    const [openSyncDialog, setOpenSyncDialog] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    const handleSyncConfirm = async () => {
        setIsSyncing(true);
        try {
            // TODO: Wire up PUT function when implemented
            await Promise.resolve();
            toast.info("Hevy program update will connect here once the API is ready.");
            setOpenSyncDialog(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Sync failed.");
        } finally {
            setIsSyncing(false);
        }
    };

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

    if (isEditMode) {
        return (
            <>
                <Button
                    variant="default"
                    className="text-white bg-lightSecondary hover:bg-lightSecondary/80"
                    onClick={() => {
                        posthog?.capture?.("opened_sync_to_hevy_dialog", {
                            user: user?.id ?? "user_id_unknown",
                        });
                        setOpenSyncDialog(true);
                    }}
                >
                    <span className="hidden sm:inline">Sync</span>
                    <span className="sm:hidden">Sync</span>
                    <RefreshCw className="h-4 w-4 shrink-0" />
                </Button>
                <SyncToHevyDialog
                    open={openSyncDialog}
                    onOpenChange={setOpenSyncDialog}
                    onConfirm={handleSyncConfirm}
                    isSyncing={isSyncing}
                />
            </>
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
