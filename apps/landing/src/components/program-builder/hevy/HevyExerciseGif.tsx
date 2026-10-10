// SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @next/next/no-img-element */
/**
 * @module HevyExerciseGif
 * Renders an exercise image (GIF or thumbnail) from the API, or a fallback (initials/icon or "No Image") when missing.
 * Supports thumbnail vs full-size and different resolutions/file types. Uses name-derived colour for fallback placeholder.
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
  /** Thumbnail corner style; `"circle"` matches Hevy-style list avatars. Ignored when `thumbnailOrImage` is `"img"`. */
  thumbnailShape?: "square" | "circle";
}

/**
 * Renders exercise media from API or fallback (initials/icon / "No Image"). Load state uses Skeleton until loaded.
 */
export const HevyExerciseGif: React.FC<IProps> = (props) => {

    const { thumbnailOrImage, name, gif_id, resolution, file_type, thumbnailShape = "square" } = props;

    const { data: exerciseGif } = useExerciseGif(gif_id, resolution, file_type, name ?? "");

    const [loaded, setLoaded] = useState(false);

    const fallbackColour = useMemo(() => {
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = (hash * 31 + name.charCodeAt(i)) | 0;
        }
        return lightColours[Math.abs(hash) % lightColours.length];
    }, [name]);

    const isThumbnail = thumbnailOrImage === "thmb";
    const thumbRoundClass = isThumbnail && thumbnailShape === "circle" ? "rounded-full" : "rounded-xl";
    const thumbFallbackRoundClass =
        isThumbnail && thumbnailShape === "circle" ? "rounded-full" : "rounded-lg";

    const containerClass = isThumbnail
        ? "h-14 w-14 min-w-14 min-h-14"
        : "h-[358px] w-full";

    return (
        <>
            {exerciseGif && (
                <div
                    className={`${containerClass} flex items-center justify-center relative overflow-hidden ${isThumbnail && thumbnailShape === "circle" ? "rounded-full" : ""}`}
                >
                {!loaded && <Skeleton className={`absolute top-0 left-0 w-full h-full ${isThumbnail ? thumbRoundClass : ""}`} /> }
                <img
                    alt="exercise GIF"
                    src={exerciseGif}
                    onLoad={() => setLoaded(true)}
                    className={`${
                    isThumbnail ? thumbRoundClass : "" } w-full h-full object-contain transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0" }`}
                />
                </div>
            )}

            {!exerciseGif && name && (
                <>
                    {isThumbnail ? (
                        <div
                            className={`${containerClass} flex items-center justify-center ${thumbFallbackRoundClass} cursor-pointer overflow-hidden`}
                            style={{ background: fallbackColour }}
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

