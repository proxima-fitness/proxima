
import { useExerciseGif } from "../../api/hooks";
import { useMemo } from "react";
import { Skeleton } from "../ui/skeleton";
import { lightColours } from "@/assets/constants";
import { getInitials } from "@/utils/helpers";

interface IProps {
    thumbnailOrImage: "img" | "thmb";
    name: string;
    gif_id: string;
    resolution: "180" | "360";
    file_type: "jpg" | "gif";
    index?: number;
}

export const ExerciseGif: React.FC<IProps> = (props) => {

    const {
        thumbnailOrImage,
        name,
        gif_id,
        resolution,
        file_type,
    } = props;

    const { data: exerciseGif, isLoading: loadingExerciseGif } = useExerciseGif(gif_id, resolution, file_type, name ?? "" );

    const randomColour = useMemo(() => {
        return lightColours[Math.floor(Math.random() * 10)];
    }, []);

    if (loadingExerciseGif) {
        return (
            <>
                { file_type === "gif" &&
                    <div style={ { display: "flex",width: "100%", height: "358px", textAlign: "center", justifyContent: "center", alignItems: "center"} }>
                        <Skeleton className="w-full h-full"></Skeleton>
                    </div>
                }
                { file_type === "jpg" &&
                    <div className="h-14 w-14 min-w-14 min-h-14 flex items-center justify-center">
                        <Skeleton className="w-full h-full"></Skeleton>
                    </div>
                }
            </>
        );
    }

    return (
        <>
            { exerciseGif instanceof Blob &&
            <>
                { thumbnailOrImage === "thmb" &&
                    <div className="h-14 w-14 min-w-14 min-h-14 flex items-center justify-center">
                        <img className="rounded-xl" alt="exercise GIF" src={ URL.createObjectURL(exerciseGif) } />
                    </div>
                }
                { thumbnailOrImage === "img" &&
                    <div className="h-full w-full flex items-center justify-center cursor-pointer">
                        <img alt="exercise GIF" src={ URL.createObjectURL(exerciseGif) } />
                    </div>
                }
            </>
            }

            { !exerciseGif && name &&
                <>
                    { thumbnailOrImage === "thmb" &&
                        <div className="h-14 w-16 flex items-center justify-center rounded-lg cursor-pointer" style={ { background: randomColour } }>
                            <div>{ getInitials(name) }</div>
                        </div>
                    }
                    { thumbnailOrImage === "img" &&
                        <div>{ getInitials(name) }</div>
                    }
                </>
            }
            { !exerciseGif && !name &&
                <div className="w-full h-[358px] flex text-center items-center justify-center">
                    <div className="flex flex-col font-bold items-center justify-center">
                        No Image
                    </div>
                </div>
            }
        </>
    );
};
