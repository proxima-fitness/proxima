/**
 * @module programs (client helper)
 *
 * Client-side helper for creating (persisting) a workout program via the
 * /api/programs POST route. Packages the Hevy routines, original prompt,
 * and builder request parameters and sends them to the server.
 *
 * Depends on: /api/programs/route.ts (server-side handler)
 * Used by: Program-builder UI after a program is finalised
 */

type TTextToJsonRequest = {
    programTitle?: string;
    search?: string;
    workoutDuration?: string;
    equipment?: string;
    specialization?: string;
    difficultyLevel?: string;
    explore?: string;
};

/**
 * Persists a newly generated workout program by sending it to the server.
 *
 * @param id - Unique identifier for the program (typically a UUID).
 * @param hevyRoutines - The complete array of Hevy routines that make up the program.
 * @param prompt - The original user prompt that triggered program generation.
 * @param request - Additional builder parameters (title, equipment prefs, etc.).
 * @returns The created `TProgram` record as returned by the server.
 * @throws Re-throws on network or server errors after logging.
 */
export const createProgram = async (
    id: string,
    hevyRoutines: THevyRoutine[],
    prompt: string,
    request: TTextToJsonRequest
): Promise<TProgram> => {
    try {
        const response = await fetch('/api/programs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id,
                hevyRoutines,
                prompt,
                request,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create program');
        }

        return await response.json();
    } catch (error) {
        console.error('Error creating program:', error);
        throw error;
    }
};
