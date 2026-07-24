/**
 * @module StepButton
 * CTA for program builder: "Sign in to save" when anonymous; when logged in with
 * `edit=true` and `hevy=true`, disabled "Sync" with a coming-soon tooltip.
 * New-path logged-in users get no Export CTA (Save is the primary persist action; ADR 0007).
 * Depends on: Tooltip, useUserContext, useSearchParams. Used by: build-program toolbar / steps.
 * Full prior Sync flow (dialog, handlers) is preserved in a comment block at the end of this file for TODO re-enable.
 */
"use client";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowRightIcon, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useUserContext } from "@/contexts/UserContext";

const BUILD_PROGRAM_PATH = "/build-program?resume=true";
const LOGIN_WITH_NEXT = `/auth/login?next=${encodeURIComponent(BUILD_PROGRAM_PATH)}`;

/** Shows Loading, Sign in link, Sync (edit+hevy), or null on New path when logged in. */
export const StepButton: React.FC = () => {
    const searchParams = useSearchParams();
    const editMode = searchParams.get("edit") === "true";
    const hevyMode = searchParams.get("hevy") === "true";
    const isSyncable = editMode && hevyMode;

    const { user, isLoading } = useUserContext();

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
            <Link href={LOGIN_WITH_NEXT}>
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

    // New path: Export removed (ADR 0007). Save is the primary persist action (toolbar portal).
    return null;
};

/*
 * TODO(hevy-sync): Re-enable when Hevy sync / PUT is ready. Paste back into StepButton:
 *
 * import { ConfirmDialog } from "@/components/ConfirmDialog";
 * import { useHevySuccessConfetti } from "./useHevySuccessConfetti";
 * import { toast } from "sonner";
 * import posthog from "posthog-js";
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
