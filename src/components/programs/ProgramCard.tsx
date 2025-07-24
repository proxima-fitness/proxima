"use client";

import { thumbnail } from "public";
import { FullName } from "../generic/FullName";
import { Badge } from "@/components/ui/badge";
import { Users2Icon, EditIcon, SaveIcon } from "lucide-react";
import { useUserContext } from "@/contexts/UserContext";
import { postNewProgramSubscriber } from "@/api/programs";
import { toast } from "sonner";

interface IProps {
    program: TProgram;
}

export const ProgramCard: React.FC<IProps> = (props) => {

    const {
        program,
    } = props;

    const { user } = useUserContext();

    const handleSave = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (user) {
            postNewProgramSubscriber(user, program.id);
            toast.success("Program saved to your account. View it in the Proxima app.");
        }
        else {
            toast.error("Error saving program");
        }
    }

    return (
        <>
            <div className="w-full max-w-md mx-auto">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl dark:bg-darkGray">
                    <div className="relative group">
                        <img
                            src={ program.thumbnail instanceof Blob ? URL.createObjectURL(program.thumbnail) : thumbnail.src }
                            alt="Program Thumbnail"
                            className={`w-full h-[200px] object-cover transition duration-300 ${user ? 'group-hover:blur-sm' : ''}`}
                            style={ { objectFit: "cover" } }
                        />
                        {user && (
                            <div className="absolute inset-0 rounded-t-lg bg-black bg-opacity-40 backdrop-blur-sm flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            window.location.href = `/build-program?shareId=${program.id}&edit=true`;
                                        }}
                                        className="my-2 py-2 w-[50%] hover:bg-black hover:text-white bg-white text-black rounded-lg shadow flex flex-row items-center justify-center gap-2">
                                        <EditIcon />Edit
                                    </button>
                                <button onClick={ (e) => handleSave(e) } className="my-2 py-2 w-[50%] hover:bg-black hover:text-white bg-lightSecondary text-white rounded-lg shadow flex flex-row items-center justify-center gap-2">
                                    <SaveIcon />Save
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="p-4 space-y-2">
                        <div className={ "flex flex-row justify-start items-center font-bold text-xs text-blue-400" }>
                            <Users2Icon className=" h-3 w-3 mr-1" /> {program?.saves} Lifters Joined
                        </div>

                        <div className=" dark:text-offWhite uppercase text-sm overflow-hidden text-ellipsis line-clamp-1">
                            Program By <FullName id={ program.id } id_type={ "program" } />
                        </div>
                        <h3 className="text-xl font-main overflow-hidden text-ellipsis line-clamp-1">{ program.title }</h3>
                        <div className="flex items-center justify-start gap-2">
                            <Badge className="text-[10px] text-white dark:text-black hover:bg-[#37BCCF] p-1 bg-[#37BCCF] dark:bg-offWhite overflow-hidden text-ellipsis line-clamp-1">{ program?.difficulty?.map((level: string ) => level).join(' - ') || "Not specified"  }</Badge>
                            <Badge className="text-[10px] text-white dark:text-black hover:bg-[#37BCCF] p-1 bg-[#37BCCF] dark:bg-offWhite overflow-hidden text-ellipsis line-clamp-1 ">{ program?.equipment || "Not specified" }</Badge>
                            <Badge className="text-[10px] text-white dark:text-black hover:bg-[#37BCCF] p-1 bg-[#37BCCF] dark:bg-offWhite overflow-hidden text-ellipsis line-clamp-1 ">{ program?.workout_duration || "Not specified" } Mins</Badge>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

