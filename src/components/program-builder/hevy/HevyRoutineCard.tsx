import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";


interface IProps {
    routine: THevyRoutine;
    handleAddRoutine: (routine: THevyRoutine) => void;
}

export const HevyRoutineCard: React.FC<IProps> = (props) => {

    const { routine, handleAddRoutine } = props;

    return (
        <Card className={`w-full bg-lightGray cursor-pointer`} onClick={ () => { handleAddRoutine(routine); toast.success(` ${routine.title} added to day`); } }>
            <CardHeader>
                <CardTitle>{ routine.title }</CardTitle>
                <CardDescription>{ routine.exercises.map((exercise) => exercise.title ).join(", ") }</CardDescription>
            </CardHeader>
        </Card>
    );
};