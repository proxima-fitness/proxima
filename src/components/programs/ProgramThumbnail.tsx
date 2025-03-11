"use client";

interface IProps {
    thumbnail: Blob
}

export const ProgramThumbnail: React.FC<IProps> = (props) => {

    const {
        thumbnail,
    } = props;

    return (
        <>
            <img
                className="rounded-lg object-cover h-[350px] w-full"
                alt="Program Thumbnail"
                src={ URL.createObjectURL(thumbnail) }
            />
        </>
    );
};
