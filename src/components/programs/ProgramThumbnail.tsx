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

/**
 * ProgramThumbnail renders a fixed-height thumbnail image for a program with a loading skeleton while the image is fetched.
 */
export const ProgramThumbnail: React.FC<IProps> = (props) => {

    const {
        id,
    } = props;

    const { data: thumbnail, isLoading: loadingThumbnail } = useProgramThumbnail(id);

    if (loadingThumbnail) {
        return (
            <Skeleton className="rounded-lg object-cover h-[350px] w-full">
            </Skeleton>
        );
    }

    return (
        <img
            className="rounded-lg object-cover h-[350px] w-full"
            alt="Program Thumbnail"
            src={ (thumbnail !== undefined && thumbnail instanceof Blob) ? URL.createObjectURL(thumbnail) : fallbackThumbnail.src }
        />
    );
};
