"use client";

import { useProgramThumbnail } from "@/api/hooks";
import { Skeleton } from "@/components/ui/skeleton";

interface IProps {
    id: string;
}

export const ProgramThumbnail: React.FC<IProps> = (props) => {

    const {
        id,
    } = props;

    const { data: thumbnail, isLoading: loadingThumbnail } = useProgramThumbnail(id);

    return (
        <>
            { loadingThumbnail ?
                <Skeleton className="rounded-lg object-cover h-[350px] w-full">
                </Skeleton>
            : thumbnail !== undefined &&
                <img
                    className="rounded-lg object-cover h-[350px] w-full"
                    alt="Program Thumbnail"
                    src={ URL.createObjectURL(thumbnail) }
                />
            }
        </>
    );
};
