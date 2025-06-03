import { NextResponse } from 'next/server';
import { postHevyRoutineProgram } from '@/components/program-builder/api/hevy';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id, hevyRoutines, prompt, request: programRequest } = body;

        if (!id || !hevyRoutines || !prompt) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const result = await postHevyRoutineProgram(id, hevyRoutines, prompt, programRequest);

        if (result instanceof Error) {
            return NextResponse.json(
                { error: result.message },
                { status: 500 }
            );
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error in program creation:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
