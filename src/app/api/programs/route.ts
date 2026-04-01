/**
 * @module programs/route
 *
 * Server-side API route for creating (persisting) a workout program.
 * Validates the incoming payload and delegates to {@link saveProgramToSupabase},
 * which inserts the program into Supabase (`programs`, `schedule_workouts`,
 * `program_workout_exercises`).
 *
 * Depends on: @/components/program-builder/api/hevy (`saveProgramToSupabase`)
 */

import { NextResponse } from 'next/server';
import { saveProgramToSupabase } from '@/components/program-builder/api/hevy';

/**
 * Creates a new workout program from the provided Hevy routines and metadata.
 *
 * @param request - Request whose JSON body contains `hevyRoutines` (THevyRoutine[]),
 *   `prompt` (string), and optional `request` (program builder parameters).
 * @returns JSON representation of the created program, or an error response.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { hevyRoutines, prompt, request: programRequest } = body;

        if (!hevyRoutines || !prompt) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const result = await saveProgramToSupabase(hevyRoutines, prompt, programRequest);

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
