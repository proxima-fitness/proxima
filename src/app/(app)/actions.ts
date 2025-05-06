"use server";

import { postHevyRoutineProgram } from "@/components/program-builder/api/hevy";

export async function postAIProgram(id: string, hevyRoutine: THevyRoutine[], prompt: string) {
    return await postHevyRoutineProgram(id, hevyRoutine, prompt);
};
