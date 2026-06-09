/**
 * @module HevyRoutineCard
 * Card for one Hevy routine in the "Add Hevy Routine" dialog: title, exercise list as description, click to add and toast.
 * Depends on: Card, toast (sonner).
 * Used by: HevyAddRoutineDialog.
 */

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

/** Props for a single routine option in the add-routine dialog. */
interface IProps {
    /** The routine (day) to display and to add when clicked. */
    routine: THevyRoutine;
    /** Called when user clicks the card; parent adds routine as day and may close dialog. */
    handleAddRoutine: (routine: THevyRoutine) => void;
}

/**
 * Clickable card showing routine title and exercise names; on click calls handleAddRoutine and shows success toast.
 */
export const HevyRoutineCard: React.FC<IProps> = (props) => {

    const { routine, handleAddRoutine } = props;

    return (
        <Card className={`w-full bg-lightGray dark:bg-extraDarkGray cursor-pointer`} onClick={ () => { handleAddRoutine(routine); toast.success(` ${routine.title} added to day`); } }>
            <CardHeader>
                <CardTitle>{ routine.title }</CardTitle>
                <CardDescription>{ routine.exercises.filter((exercise) => exercise != null).map((exercise) => exercise.title ?? "Unknown exercise").join(", ") }</CardDescription>
            </CardHeader>
        </Card>
    );
};
