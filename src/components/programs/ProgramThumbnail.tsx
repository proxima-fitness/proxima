"use client";

import { useProgramThumbnail } from "@/api/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { thumbnail as fallbackThumbnail } from "public";
interface IProps {
    id: number;
}

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
