import { useEffect, useState } from "react";
import { getProgramThumbnailByID } from "../../api/programs";
import Image from "next/image";

interface IProps {
    programID: string
}

export const ViewModeThumbnails: React.FC<IProps> = (props) => {

    const {
        programID,
    } = props;

    const [ thumbnail, setThumbnail ] = useState<Blob | null | undefined>();

    useEffect(() => {
        const fetchProgramThumbnail = async (programID: string) => {
            const fetchedThumbnail = await getProgramThumbnailByID(programID);
            setThumbnail(fetchedThumbnail);
        };
        fetchProgramThumbnail(programID);
    }, [programID]);

    return (
        <>
            { thumbnail instanceof Blob &&
                <div>
                    <Image style={ { height: '180px', width: '100%', objectFit: "cover"  } } width={ 500 } height={ 500 } src={ URL.createObjectURL(thumbnail) } />
                </div>
            }
        </>
    );
};
