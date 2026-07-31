/**
 * @module StepButton
 * CTA for program builder: "Sign in to save" when anonymous; when logged in, "Export"
 * (opens ExportDialog) or disabled "Sync" with a coming-soon tooltip when `edit=true` and `hevy=true`.
 * Depends on: ExportDialog, Tooltip, useUserContext, useSearchParams. Used by: build-program toolbar / steps.
 * Full prior Sync flow (dialog, handlers) is preserved in a comment block at the end of this file for TODO re-enable.
 */
"use client";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowRightIcon, ArrowRightToLineIcon, RefreshCw } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ExportDialog } from "./ExportDialog";
import { useUserContext } from "@/contexts/UserContext";
import posthog from "posthog-js";
import { buildAuthLoginHref } from "@/lib/sign-in-return";
import { BUILD_PROGRAM_PATH } from "@/lib/build-program-url";

/** Shows Loading, Sign in link, or Export / Sync; Export opens ExportDialog; Sync is disabled with tooltip. */
export const StepButton: React.FC = () => {
    const searchParams = useSearchParams();
    const loginHref = buildAuthLoginHref(BUILD_PROGRAM_PATH, searchParams);
    const editMode = searchParams.get("edit") === "true";
    const hevyMode = searchParams.get("hevy") === "true";
    const isSyncable = editMode && hevyMode;

    const { user, isLoading } = useUserContext();
    const [openExportDialog, setOpenExportDialog] = useState(false);

    const primaryPill =
        "rounded-full px-4 gap-2 text-white bg-lightSecondary hover:bg-lightSecondary/90 shadow-sm";

    if (isLoading) {
        return (
            <Button variant="default" className={primaryPill} disabled>
                <span className="hidden sm:inline">Loading...</span>
                <ArrowRightIcon />
            </Button>
        );
    }

    if (!user) {
        return (
            <Link href={loginHref}>
                <Button variant="default" className={primaryPill}>
                    <span className="hidden sm:inline">Sign in to save</span>
                    <span className="sm:hidden">Sign in</span>
                    <ArrowRightIcon />
                </Button>
            </Link>
        );
    }

    if (isSyncable) {
        return (
            <TooltipProvider delayDuration={0}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className="inline-flex" tabIndex={0}>
                            <Button variant="default" className={primaryPill} disabled>
                                <span className="hidden sm:inline">Sync</span>
                                <span className="sm:hidden">Sync</span>
                                <RefreshCw className="h-4 w-4 shrink-0" />
                            </Button>
                        </span>
                    </TooltipTrigger>
                    <TooltipContent className="bg-lightSecondary text-white">
                        Sync coming soon...
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return (
        <>
            <Button
                variant="default"
                className={primaryPill}
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

/*
 * TODO(hevy-sync): Re-enable when Hevy sync / PUT is ready. Paste back into StepButton:
 *
 * import { ConfirmDialog } from "@/components/ConfirmDialog";
 * import { useHevySuccessConfetti } from "./useHevySuccessConfetti";
 * import { toast } from "sonner";
 *
 * const [openSyncDialog, setOpenSyncDialog] = useState(false);
 * const [isSyncing, setIsSyncing] = useState(false);
 * const { confettiOverlay, fireConfetti } = useHevySuccessConfetti();
 *
 * const handleSyncConfirm = async () => {
 *     setIsSyncing(true);
 *     try {
 *         // TODO: Wire up PUT function when implemented
 *         await Promise.resolve();
 *         toast.info("Hevy program update will connect here once the API is ready.");
 *         setOpenSyncDialog(false);
 *         fireConfetti();
 *     } catch (err) {
 *         toast.error(err instanceof Error ? err.message : "Sync failed.");
 *     } finally {
 *         setIsSyncing(false);
 *     }
 * };
 *
 * Replace the current `if (isSyncable)` return with:
 *
 * if (isSyncable) {
 *     return (
 *         <>
 *             <Button
 *                 variant="default"
 *                 className="text-white bg-lightSecondary hover:bg-lightSecondary/80"
 *                 onClick={() => {
 *                     posthog?.capture?.("opened_sync_to_hevy_dialog", {
 *                         user: user?.id ?? "user_id_unknown",
 *                     });
 *                     setOpenSyncDialog(true);
 *                 }}
 *             >
 *                 <span className="hidden sm:inline">Sync</span>
 *                 <span className="sm:hidden">Sync</span>
 *                 <RefreshCw className="h-4 w-4 shrink-0" />
 *             </Button>
 *             <ConfirmDialog
 *                 open={openSyncDialog}
 *                 onOpenChange={setOpenSyncDialog}
 *                 title="Update program in Hevy?"
 *                 description="This will modify the current program in Hevy and cannot be undone."
 *                 confirmLabel="Confirm"
 *                 confirmLoadingLabel="Updating…"
 *                 confirmVariant="default"
 *                 confirmClassName="bg-lightSecondary text-white hover:bg-lightSecondary/90"
 *                 isConfirmLoading={isSyncing}
 *                 closeOnConfirm={false}
 *                 onConfirm={handleSyncConfirm}
 *             />
 *             {confettiOverlay}
 *         </>
 *     );
 * }
 */
