import { motion } from "framer-motion";
import { DropIndicator } from "./DropIndicator";
import { DayCard } from "../program-builder/DayCard";

interface IProps {
    title: string;
    order: string;
    day_title: string;
    weekOrder: string;
    exercises: TProgramCreatorExercise[];
    handleDragStart: (e: any, card: any) => void;
    id: string;
};

type TProps = IProps & TProgramCreatorDay;

export const Card: React.FC<TProps> = (props) => {
    const {
        title,
        order,
        day_title,
        exercises,
        id,
        weekOrder,
        handleDragStart,
    } = props;

    const cardVal = {
        title,
        order,
        day_title,
        exercises,
        id,
        weekOrder,
    };

    return (
        <>
            <DropIndicator beforeId={id} weekOrder={weekOrder} />
            <motion.div
                layout
                layoutId={id}
                draggable="true"
                onDragStart={(e) => handleDragStart(e, cardVal)}
                className="cursor-grab rounded border border-neutral-700 active:cursor-grabbing"
            >
                <p>{ day_title }</p>
                <p>Week {weekOrder}</p>
                <p>Day {order}</p>
                {id}
                {/* <DayCard /> */}
            </motion.div>
        </>
    );
};
