/**
 * @module ShareDialog
 * Modal to share program link: copy URL, Facebook, Reddit. Uses shareId from URL or programId prop.
 * Depends on: Dialog, Button, Input, useSearchParams. Used by: program builder share action.
 */
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BicepsFlexedIcon, CopyIcon } from "lucide-react";
import { facebook, reddit } from "public";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

/** Props for the share dialog. */
interface IProps {
    /** Whether the dialog is open. */
    openShareDialog: boolean;
    /** Callback to set dialog open state. */
    handleOpenShareDialog: (openShareDialog: boolean) => void;
    /** Program id for share URL when shareId is not in URL. */
    programId: string;
}

/** Share modal: copy link, Facebook, Reddit; URL uses shareId from search params or programId. */
export const ShareDialog: React.FC<IProps> = (props) => {
    const searchParams = useSearchParams();
    const shareId = searchParams.get('shareId');

    const {
        openShareDialog,
        handleOpenShareDialog,
        programId,
    } = props;

    const handleCloseDialog = () => {
        handleOpenShareDialog(false);
    };

    const handleCopyShareId = () => {
        try {
            navigator.clipboard.writeText(`https://proximafitness.com/build-program?shareId=${shareId || programId}&shared=true`);
        } catch (error: unknown) {
            console.error("Error copying to clipboard",error);
            toast.error("Error copying to clipboard");
        }
        toast.success("Copied to clipboard");
    };

    return (
        <>
            <Dialog open={ openShareDialog } onOpenChange={ handleCloseDialog }>
                <DialogContent className="sm:max-w-5xl max-sm:w-screen h-[30%]">
                    <DialogTitle className="font-bold font-main text-2xl flex max-sm:flex-col max-sm:text-center items-center justify-center max-sm:pb-0 pb-4 gap-2">
                        Share your Proxima AI Program with your friends<BicepsFlexedIcon />
                    </DialogTitle>
                    <span className="w-full flex flex-row max-sm:flex-col items-center justify-center max-sm:justify-center gap-4">
                        <span className="flex flex-row items-center justify-center gap-4">
                            <a href={ `https://www.facebook.com/sharer/sharer.php?u=https://proximafitness.com/build-program?shareId=${shareId || programId}&shared=true&title=Check+Out+My+Custom+Workout+Program+Built+By+Proxima+AI!` } target="_blank" rel="noopener noreferrer">
                                <Button
                                    className="h-16 w-16 bg-lightSecondary"
                                    aria-label="Share on Facebook"
                                >
                                    <img src={ facebook.src } alt="Facebook" className="h-full w-full" />
                                </Button>
                            </a>
                            <a href={ `https://www.reddit.com/submit?url=https://proximafitness.com/build-program?shareId=${shareId || programId}&shared=true&title=Check+Out+My+Custom+Workout+Program+Built+By+Proxima+AI!` } target="_blank" rel="noopener noreferrer">
                                <Button
                                    variant="outline"
                                    className="h-16 w-16"
                                    aria-label="Share on Reddit"
                                >
                                    <img src={ reddit.src } alt="Reddit" className="h-full w-full" />
                                </Button>
                            </a>
                            <div className="flex flex-row items-center justify-center gap-2">
                                <Input
                                    className="h-16 max-sm:w-full sm:w-[400px]"
                                    readOnly
                                    value={ `https://proximafitness.com/build-program?shareId=${shareId || programId}&shared=true` }
                                />
                                <Button
                                    variant="outline"
                                    className="h-16 w-16"
                                    onClick={ handleCopyShareId }
                                    aria-label="Copy share link"
                                >
                                    <CopyIcon className="h-full w-full text-lightSecondary" />
                                </Button>
                            </div>
                        </span>
                    </span>
                </DialogContent>
            </Dialog>
        </>
    );
};
