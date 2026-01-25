import { useEffect, useState } from "react";
import { getProgramThumbnailByID } from "../../api/programs";

interface IProps {
    programID: number;
}

export const ViewModeThumbnails: React.FC<IProps> = (props) => {

    const {
        programID,
    } = props;

    const [ thumbnail, setThumbnail ] = useState<Blob | null | undefined>();

    useEffect(() => {
        const fetchProgramThumbnail = async (programID: number) => {
            const fetchedThumbnail = await getProgramThumbnailByID(programID);
            setThumbnail(fetchedThumbnail);
        };
        fetchProgramThumbnail(programID);
    }, [programID]);

    return (
        <>
            { thumbnail instanceof Blob &&
                <div>
                    <img alt={ "Thumbnail Image" } style={ { height: '180px', width: '100%', objectFit: "cover"  } } src={ URL.createObjectURL(thumbnail) } />
                </div>
            }
        </>
    );
};
