import { Card } from "../ui/card";
import { ProgramOverviewCard } from "./ProgramOverviewCard";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import { CalendarIcon } from "lucide-react";
import { convertSupabaseDateToReadable } from "@/utils/general/helpers";
import { ProgramThumbnail } from "./ProgramThumbnail";

interface IProps {
    id: string;
    program: TProgramPage;
    fullName: string;
    programCreatorMetadata: TUserDetails;
    // programCreatorProfilePic: Blob;
}

export const ProgramDetails: React.FC<IProps> = (props) => {

    const {
        id,
        program,
        fullName,
        programCreatorMetadata,
        // programCreatorProfilePic,
    } = props;

    return (
        <div className="col-span-2 flex flex-col gap-8">
            <div>
                <ProgramThumbnail id={ id } />
            </div>
            <Card className="py-4 pl-4 bg-gray-100 dark:bg-darkGray">
                <div className="text-xl uppercase pb-2">
                    PROGRAM BY {" "}
                    <HoverCard>
                        <HoverCardTrigger className="hover:underline">
                            { fullName }
                        </HoverCardTrigger>
                        <HoverCardContent className="w-72 h-auto">
                            <div className="flex justify-around space-x-4">
                                {/* <Avatar>
                                <AvatarImage src={ URL.createObjectURL(programCreatorProfilePic) ?? "https://github.com/vercel.png"} />
                                <AvatarFallback>VC</AvatarFallback> */}
                                {/* </Avatar> */}
                                <div className="space-y-1">
                                    <h4 className="text-sm font-semibold">{ fullName }</h4>
                                    <p className="text-sm">
                                        { programCreatorMetadata.bio }
                                    </p>
                                    <div className="flex items-center pt-2">
                                        <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />{" "}
                                        <span className="text-xs text-muted-foreground">
                                            Joined {convertSupabaseDateToReadable(programCreatorMetadata.created_at)}
                                        </span>
                                    </div>
                                </div>
                            </div>
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
