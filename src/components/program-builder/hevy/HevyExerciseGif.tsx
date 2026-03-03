/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/purity */
/**
 * @module HevyExerciseGif
 * Renders an exercise image (GIF or thumbnail) from the API, or a fallback (initials/icon or "No Image") when missing.
 * Supports thumbnail vs full-size and different resolutions/file types. Uses random colour for fallback placeholder.
 * Depends on: useExerciseGif, Skeleton, lightColours, getInitials.
 * Used by: HevyExerciseSearchBar, HevyExerciseVisualizer.
 */

import { useMemo, useState } from "react";
import { DumbbellIcon } from "lucide-react";
import { lightColours } from "@/assets/constants";
import { getInitials } from "@/utils/general/helpers";
import { useExerciseGif } from "@/api/hooks";
import { Skeleton } from "@/components/ui/skeleton";

/** Props for the exercise image/placeholder. */
interface IProps {
  /** "thmb" for small thumbnail, "img" for full-size display. */
  thumbnailOrImage: "img" | "thmb";
  /** Exercise name (used for fallback initials and alt). */
  name: string;
  /** API gif/media id; undefined when no image. */
  gif_id: string | undefined;
  /** Image resolution: "180" or "360". */
  resolution: "180" | "360";
  /** File type requested: "jpg" or "gif". */
  file_type: "jpg" | "gif";
  /** Optional index (e.g. for list key). */
  index?: number;
}

/**
 * Renders exercise media from API or fallback (initials/icon / "No Image"). Load state uses Skeleton until loaded.
 */
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
                        <div>{getInitials(name) ?? <DumbbellIcon className="h-6 w-6" />}</div>
                        </div>
                    ) : (
                        <div className={`${containerClass} flex items-center justify-center`}>
                            <div className="text-xl font-bold">
                                {getInitials(name) ?? <DumbbellIcon className="h-8 w-8" />}
                            </div>
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

