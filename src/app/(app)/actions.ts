"use server";

import { postHevyRoutineProgram } from "@/api/hevy";

export async function postAIProgram(id: string, hevyRoutine: THevyRoutine[], prompt: string) {
    return await postHevyRoutineProgram(id, hevyRoutine, prompt);
};
