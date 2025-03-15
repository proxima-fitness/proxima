
"use client";

import { getExercises } from "@/api/exercises";
// import { getHevyExercises } from "@/api/hevy";
import { Button } from "@/components/ui/button";

export const UploadHevyExercises: React.FC = () => {

    const handleUploadHevyExercisesToProxima = async () => {

        // const hevyExercises = await getHevyExercises();
        const proximaExercises = await getExercises();

        const exercisesToAdd: THevyExerciseTemplate[] = [];

        // for (let i = 0; i < hevyExercises.length; i++) {
        //     const hevyExercise = hevyExercises[i];
        //     const alreadyExists = proximaExercises.some(
        //         (exercise) => exercise.name_english === hevyExercise.title
        //       );

        //     if (!alreadyExists) {
        //         exercisesToAdd.push(hevyExercise);
        //     }
        // }
        console.log("proxima exercises:", proximaExercises);
        // console.log("exercisesToAdd:", exercisesToAdd);
    };

    return (
        <Button variant="outline" onClick={ handleUploadHevyExercisesToProxima }>
            Upload to Proxima
        </Button>
    );
};
