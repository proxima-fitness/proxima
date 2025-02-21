import { ProgramThumbnail } from "./ProgramThumbnail";
import { Card } from "../ui/card";
import { ProgramOverviewCard } from "./ProgramOverviewCard";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card"

interface IProps {
    program: TProgramPage;
    fullName: string;
}

export const ProgramDetails: React.FC<IProps> = (props) => {

    const {
        program,
        fullName
    } = props;

    return (
        <div className="col-span-2 flex flex-col gap-8">
        <div>
            <ProgramThumbnail thumbnail={program.thumbnail} />
        </div>
        <Card className="py-4 pl-4 bg-gray-100">
            <div className="text-xl uppercase pb-2">
                PROGRAM BY
                <HoverCard>
                    <HoverCardTrigger className="hover:underline"> { fullName }</HoverCardTrigger>
                    <HoverCardContent>
                        This is a card hell yeah
                    </HoverCardContent>
                </HoverCard>
            </div>
            <div className="text-3xl font-main ">
                { program.program[0].title }
             </div>
        </Card>
        <ProgramOverviewCard program={ program } />
    </div>
    );
};
