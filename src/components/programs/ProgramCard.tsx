"use client";

import { proxima_logo_black } from "public";
import { FullName } from "../generic/FullName";
import { Badge } from "@/components/ui/badge"

interface IProps {
    program: TProgram;
}

export const ProgramCard: React.FC<IProps> = (props) => {

    const {
        program,
    } = props;

    return (
        <>
            <div className="w-full max-w-md mx-auto">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl dark:bg-gray-950">
                    <img
                        src={ program.thumbnail instanceof Blob ? URL.createObjectURL(program.thumbnail) : proxima_logo_black}
                        alt="Program Thumbnail"
                        className="w-full h-[200px] object-cover"
                        style={{ objectFit: "cover" }}
                    />
                    <div className="p-4 space-y-2">
                        <div className="uppercase text-sm overflow-hidden text-ellipsis line-clamp-1">
                            Program By <FullName id={ program.id } id_type={"program"} />
                        </div>
                        <h3 className="text-xl font-main overflow-hidden text-ellipsis line-clamp-1">{ program.title }</h3>
                        <div className="flex items-center justify-start gap-2">
                            <Badge className="text-[10px] text-white hover:bg-[#37BCCF] p-1 bg-[#37BCCF] overflow-hidden text-ellipsis line-clamp-1">{ program.difficulty.map((level: string ) => level).join(' - ') }</Badge>
                            <Badge className="text-[10px] text-white hover:bg-[#37BCCF] p-1 bg-[#37BCCF] overflow-hidden text-ellipsis line-clamp-1 ">{ program.equipment }</Badge>
                            <Badge className="text-[10px] text-white hover:bg-[#37BCCF] p-1 bg-[#37BCCF] overflow-hidden text-ellipsis line-clamp-1 ">{ program.workout_duration } Mins</Badge>
                        </div>
                    </div>
                </div>
            </div>

        </>
    );
};

