import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import { ExportProgramCTAButtons } from "@/components/programs/ExportProgramCTAButtons";
import { exportOptions } from "@/assets/constants";

interface IProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    programId: number;
}

export const ExportDialog: React.FC<IProps> = (props) => {
    const { open, onOpenChange, programId } = props;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="">
                <DialogTitle className="font-bold font-main text-xl sm:text-2xl text-center ">
                    Export program
                </DialogTitle>
                <ExportProgramCTAButtons programId={programId} exportOptions={exportOptions} />
            </DialogContent>
        </Dialog>
    );
};
