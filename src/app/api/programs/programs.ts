
type TTextToJsonRequest = {
    programTitle?: string;
    search?: string;
    workoutDuration?: string;
    equipment?: string;
    specialization?: string;
    difficultyLevel?: string;
    explore?: string;
};

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
