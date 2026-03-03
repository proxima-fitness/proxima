/*
 * @module ViewModeThumbnails
 * @description Utility component that lazily fetches and displays a small program thumbnail given its id.
 * @dependsOn Program thumbnail API helper and React state/effect hooks.
 * @usedBy view mode previews to show compact thumbnails for alternative program views.
 */

import { useEffect, useState } from "react";
import { getProgramThumbnailByID } from "../../api/programs";

/**
 * Props for `ViewModeThumbnails`.
 * @property programID Identifier of the program whose thumbnail should be fetched and rendered.
 */
interface IProps {
    programID: number;
}

/**
 * ViewModeThumbnails fetches a program thumbnail on mount and renders it when available.
 */
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
