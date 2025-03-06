import { ReviewProgramPage } from "@/components/program-builder/ReviewProgram";

export const metadata = {
    title: "Review Program | AI Program Builder",
    description: "Review your custom program",
  };

export default function ReviewProgram() {

    return (
        <div className={ `bg-white min-h-[1000px] overflow-x-scroll` }>
            <ReviewProgramPage />
        </div>
    );
}
