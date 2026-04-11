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
import { createClient } from '@/utils/supabase/server';
import {
    isSaveProgramToSupabaseError,
    isSaveProgramToSupabaseSuccess,
    saveProgramToSupabase,
} from '@/components/program-builder/api/hevy';

/**
 * Creates a new workout program from the provided Hevy routines and metadata.
 *
 * @param request - Request whose JSON body contains `hevyRoutines` (THevyRoutine[]),
 *   `prompt` (string), and optional `request` (program builder parameters).
 * @returns JSON representation of the created program, or an error response.
 */
export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        const body = await request.json();
        const { hevyRoutines, prompt, request: programRequest } = body;

        if (!hevyRoutines || !prompt) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const result = await saveProgramToSupabase(hevyRoutines, prompt, programRequest, user?.id);

        if (isSaveProgramToSupabaseSuccess(result)) {
            return NextResponse.json(result);
        }

        if (isSaveProgramToSupabaseError(result)) {
            return NextResponse.json(
                { error: result.message, code: result.code },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { error: 'Unexpected response when saving program' },
            { status: 500 }
        );
    } catch (error) {
        console.error('Error in program creation:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
