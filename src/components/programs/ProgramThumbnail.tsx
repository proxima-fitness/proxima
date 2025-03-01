"use client";
import Image from "next/image";

interface IProps {
    thumbnail: Blob
}

export const ProgramThumbnail: React.FC<IProps> = (props) => {

    const {
        thumbnail,
    } = props;

    return (
        <>
            <Image
            className="rounded-lg object-cover h-[350px] w-full"
            alt="Program Thumbnail"
            src={ URL.createObjectURL(thumbnail) } width={ 500 } height={ 500 }
        />
        </>
    );
};
