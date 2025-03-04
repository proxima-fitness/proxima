import { useState } from "react";
import { Column } from "./Column";

interface IProps {
    program: TProgramCreatorDay[][];
}

export const Board: React.FC<IProps> = (props) => {

    const {
        program,
    } = props;

    const [newProgram, setNewProgram] = useState<TProgramCreatorDay[][]>(program ?? []);

    return (
        <div className="flex h-full w-full gap-3">
            { newProgram.map((week, index) => (
                <Column
                    key={ `Week ${index + 1}` }
                    title={ `Week ${index + 1}` }
                    weekOrder={ String(index) }
                    cards={Array.isArray(week) ? week : []}
                    setCards={(cards: TProgramCreatorDay[]) => {
                        setNewProgram(prev => {
                            const updatedProgram = [...prev];
                            updatedProgram[index] = [...cards];
                            return updatedProgram;
                        });
                    }}
                />

            ))}
        </div>
    );
};
