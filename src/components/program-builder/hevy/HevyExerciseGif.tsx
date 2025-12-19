import { useMemo, useState } from "react";
import { lightColours } from "@/assets/constants";
import { getInitials } from "@/utils/general/helpers";
import { useExerciseGif } from "@/api/hooks";
import { Skeleton } from "@/components/ui/skeleton";

interface IProps {
  thumbnailOrImage: "img" | "thmb";
  name: string;
  gif_id: string | undefined;
  resolution: "180" | "360";
  file_type: "jpg" | "gif";
  index?: number;
}

export const HevyExerciseGif: React.FC<IProps> = (props) => {

    const { thumbnailOrImage, name, gif_id, resolution, file_type } = props;

    const { data: exerciseGif } = useExerciseGif(gif_id, resolution, file_type, name ?? "");

    const [loaded, setLoaded] = useState(false);

    const randomColour = useMemo(() => {
        return lightColours[Math.floor(Math.random() * 10)];
    }, []);

    const isThumbnail = thumbnailOrImage === "thmb";

    const containerClass = isThumbnail
        ? "h-14 w-14 min-w-14 min-h-14"
        : "h-[358px] w-full";

    return (
        <>
            {exerciseGif && (
                <div
                    className={`${containerClass} flex items-center justify-center relative`}
                >
                {!loaded && <Skeleton className="absolute top-0 left-0 w-full h-full rounded-xl" /> }
                <img
                    alt="exercise GIF"
                    src={exerciseGif}
                    onLoad={() => setLoaded(true)}
                    className={`${
                    isThumbnail ? "rounded-xl" : "" } w-full h-full object-contain transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0" }`}
                />
                </div>
            )}

            {!exerciseGif && name && (
                <>
                    {isThumbnail ? (
                        <div
                            className={`${containerClass} flex items-center justify-center rounded-lg cursor-pointer`}
                            style={{ background: randomColour }}
                        >
                        <div>{getInitials(name)}</div>
                        </div>
                    ) : (
                        <div className={`${containerClass} flex items-center justify-center`}>
                            <div className="text-xl font-bold">{getInitials(name)}</div>
                        </div>
                    )}
                </>
            )}

            {!exerciseGif && !name && (
                <div className={`${containerClass} flex items-center justify-center`}>
                    <div className="text-xl font-bold">No Image</div>
                </div>
            )}
        </>
    );
};

