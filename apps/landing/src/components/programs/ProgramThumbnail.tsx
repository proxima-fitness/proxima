// SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @next/next/no-img-element */
"use client";

/*
 * @module ProgramThumbnail
 * @description Thumbnail image component that loads a program’s cover art, falling back to a default image while showing skeletons during loading.
 * @dependsOn Program thumbnail query hook, skeleton UI primitive, and a shared fallback thumbnail asset.
 * @usedBy Program detail and slug layouts wherever a large program image is needed.
 */

/**
 * Props for `ProgramThumbnail`.
 * @property id Program identifier used to request the thumbnail blob.
 */
import { useProgramThumbnail } from "@/api/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { thumbnail as fallbackThumbnail } from "public";
interface IProps {
    id: number;
}

const frameClass =
    "relative w-full max-h-[420px] aspect-[16/10] overflow-hidden rounded-3xl ring-1 ring-black/5 dark:ring-white/10";

/**
 * ProgramThumbnail renders a hero thumbnail for a program with a loading skeleton while the image is fetched.
 */
export const ProgramThumbnail: React.FC<IProps> = (props) => {

    const {
        id,
    } = props;

    const { data: thumbnail, isLoading: loadingThumbnail } = useProgramThumbnail(id);

    if (loadingThumbnail) {
        return (
            <Skeleton className={`${frameClass} bg-muted`} />
        );
    }

    return (
        <div className={frameClass}>
            <img
                className="absolute inset-0 h-full w-full object-cover"
                alt="Program cover"
                src={ (thumbnail !== undefined && thumbnail instanceof Blob) ? URL.createObjectURL(thumbnail) : fallbackThumbnail.src }
            />
        </div>
    );
};
