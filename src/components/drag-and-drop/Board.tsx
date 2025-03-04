import { useState } from "react";
import { Column } from "./Column";
import { appendWeekOrderAndIdToProgramDays, flattenProgram } from "@/utils/helpers";

interface IProps {
    program: TProgramCreatorDay[][];
}

export const Board: React.FC<IProps> = (props) => {

    const {
        program,
    } = props;

    const [flattenedProgramDays, setFlattenedProgramDays] = useState<TProgramCreatorDay[]>(flattenProgram(appendWeekOrderAndIdToProgramDays(program)));
    console.log("flattened:",flattenedProgramDays);

    return (
        <div className="flex h-full w-full gap-3">
            { program.map((days, index) => (
                <Column
                    key={ `Week ${index + 1}` }
                    title={ `Week ${index + 1}` }
                    flattenedProgramDays={ flattenedProgramDays }
                    weekOrder={ String(index) }
                    setFlattenedProgramDays={ setFlattenedProgramDays }
                />

            ))}
        </div>
    );
};
