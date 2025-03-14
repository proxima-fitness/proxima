"use client";

import { useProgramThumbnail } from "@/api/hooks";

interface IProps {
    id: string;
}

export const ProgramThumbnail: React.FC<IProps> = (props) => {

    const {
        id,
    } = props;

    console.log("id:",id);

    const { data: thumbnail, isLoading: loadingThumbnail } = useProgramThumbnail(id);

    return (
        <>
            { loadingThumbnail ?
                <div className="rounded-lg object-cover h-[350px] w-full">
                </div>
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
