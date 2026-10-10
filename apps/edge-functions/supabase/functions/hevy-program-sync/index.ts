// SPDX-License-Identifier: AGPL-3.0-only

// supabase/functions/hello-world/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { HttpError } from "./errors.ts";
import type {
    TProgram,
  } from "./types.ts";
import {
    backupHevyProgramSyncCount,
    exitEarlyNoNewWorkouts,
    getHevyApiKey,
    getLastHevyProgramSyncCount,
    getProgramHevyWeekLinkByRoutineId,
    getSubscribedPrograms,
    hevyProgramSync,
    nthDayFromProgramHevyLink,
    syncProgramHistoryAndScheduleHistory,
} from "./db.ts";
// ADR 0011: silent double-progression Hevy writes disabled — keep helpers for future mode.
// import { doubleProgression, getHevyExercises, type ProgressedExercise } from "./hevy.ts";
import { getHevyWorkoutsCount, getRecentlyCompletedWorkouts, getRoutine, type ProgressedExercise } from "./hevy.ts";
// ADR 0011 SP5: post-sync email disabled — user already on overview for on-demand sync.
// import { Resend } from 'npm:resend@4.0.0';
// import { renderAsync } from 'npm:@react-email/components@0.0.22';
// import React from 'npm:react@18.3.1';
// import WorkoutSummaryEmail from './_templates/workout-summary-email.tsx';
// import { supabase } from "./supabase.ts";

/*
async function getUserEmail(user_id: string): Promise<string | null> {
    const { data: user, error } = await supabase
        .from('users')
        .select('email')
        .eq('id', user_id)
        .maybeSingle();

    if (error) {
        console.error('Failed to retrieve user email:', error.message);
        return null;
    }

    return user?.email ?? null;
}
*/

serve(async (req) => {
  try{ 
    // 0. Get the user_id and mode from the request body
    const { user_id, mode = "on_demand" } = await req.json()
    console.log(`hevy-program-sync start user=${user_id} mode=${mode}`);
    // 1. Fetch Hevy API key from vault
    const hevyApiKey = await getHevyApiKey(user_id);

    // 2. Call Hevy API to get workouts count
    const workoutsCount = await getHevyWorkoutsCount(hevyApiKey);
    // 3. ADR 0011: program-sync cursor (not workout-history last_known_workout_count)
    const lastProgramSyncCount = await getLastHevyProgramSyncCount(user_id);
    // 4. Compare program-sync cursor with current workouts count
    const hasWorkoutIncreased = workoutsCount > lastProgramSyncCount;
    // 5. Only proceed if the count has increased (new workout completed)
    if (!hasWorkoutIncreased) {
        // Still advance program-sync cursor (e.g. workouts deleted in Hevy)
        await backupHevyProgramSyncCount(user_id, workoutsCount);
        await exitEarlyNoNewWorkouts(user_id, workoutsCount, lastProgramSyncCount);
    }
    // 6. Calculate how many new workouts were completed (BEFORE backing up the count)
    const newWorkoutsCount = workoutsCount - lastProgramSyncCount;
    console.log(`Processing ${newWorkoutsCount} new workout(s) for user ${user_id}`);
    
    // 7. Call /v1/workouts to get all recently completed workouts (fetch all new workouts)
    const recentlyCompletedWorkouts = await getRecentlyCompletedWorkouts(hevyApiKey, newWorkoutsCount);
    
    // 8. Fetch the user subscribed programs from program_subscribers and programs tables 
    const subscribedPrograms = await getSubscribedPrograms(user_id);
    
    // 9. Process each new workout
    const processedWorkouts: Array<{
        workout_id: string;
        program_title: string;
        week_number: number;
        day_number: number;
        routine_id: string;
    }> = [];
    const errors: Array<{
        workout_id: string;
        error: string;
    }> = [];
    const allProgressions: Array<{
        workout_id: string;
        progressions: ProgressedExercise[];
    }> = [];
    
    // Process workouts in reverse order (oldest first) to maintain chronological order
    const workoutsToProcess = [...recentlyCompletedWorkouts.workouts].reverse();
    
    for (const workout of workoutsToProcess) {
        try {
            // ADR 0011: match only via Program–Hevy link (hevy_routine_id → program + week + day).
            // No folder/routine title parse. No link → skip day-complete.
            const link = await getProgramHevyWeekLinkByRoutineId(user_id, workout.routine_id);
            if (!link) {
                console.log(
                    `Workout ${workout.id}: no Program–Hevy link for routine ${workout.routine_id}. Skipping day-complete.`,
                );
                throw new HttpError(
                    `No Program–Hevy link for routine ${workout.routine_id}`,
                    204,
                );
            }

            const weekNumber = link.nth_week;
            const nthDay = nthDayFromProgramHevyLink(link, workout.routine_id);
            const program_id = String(link.program_id);
            const matchedProgram = subscribedPrograms.find(
                (p: TProgram) => String(p.id) === program_id,
            );
            const programTitle = matchedProgram?.title ?? "Unknown Program";
            const programLength = matchedProgram?.program_length ?? 12;

            // Routine fetch only for optional checkmark (not for matching).
            const routine = await getRoutine(hevyApiKey, workout.routine_id);

            await syncProgramHistoryAndScheduleHistory(
                user_id,
                weekNumber,
                programTitle,
                nthDay,
                programLength,
                program_id,
                workout.routine_id,
                hevyApiKey,
                routine,
            );

            // ADR 0011: silent double-progression Hevy writes commented out (not deleted).
            // Reserved for a possible future auto-weight-progression mode.
            /*
            const folder_id = routine.routine.folder_id ?? null;
            const programHistory = await getProgramHistoryByProgramId(user_id, program_id);
            if (!programHistory) {
                console.warn(`No program history found for program ${program_id}, skipping progression updates`);
            } else {
                const hevyExercises = await getHevyExercises();
                const progressions = await doubleProgression(
                        workout,
                        routine,
                        program_id,
                        programHistory.id,
                        user_id,
                        weekNumber,
                        nthDay,
                        hevyApiKey,
                        hevyExercises,
                        folder_id
                    );
                if (progressions.length > 0) {
                    console.log(`Progression occurred for workout ${workout.id}:`, JSON.stringify(progressions, null, 2));
                    allProgressions.push({
                        workout_id: workout.id,
                        progressions: progressions
                    });
                }
            }
            */

            processedWorkouts.push({
                workout_id: workout.id,
                program_title: programTitle,
                week_number: weekNumber,
                day_number: nthDay,
                routine_id: workout.routine_id
            });
        } catch (error) {
            // Log error but continue processing other workouts
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isExpectedError = error instanceof HttpError && error.statusCode === 204;
            
            if (isExpectedError) {
                console.log(`Workout ${workout.id} skipped: ${errorMessage}`);
            } else {
                console.error(`Error processing workout ${workout.id}:`, error);
            }
            
            errors.push({
                workout_id: workout.id,
                error: errorMessage
            });
        }
    }

    // 11. ADR 0011: hevyProgramSync no longer uploads next week (call kept; body is a no-op for upload).
    // If it was the last week of the program we just don't upload a new week.
    const newWeeksAdded = await hevyProgramSync(subscribedPrograms, user_id, hevyApiKey);
    // 12. Advance program-sync cursor AFTER processing (do not touch history cursor)
    await backupHevyProgramSyncCount(user_id, workoutsCount);

    // 13. ADR 0011 SP5: no post-sync email. On-demand sync means the user is already
    // looking at progress; inbox nudge is redundant. Template kept unused for possible
    // future re-engagement (`_templates/workout-summary-email.tsx`).
    /*
    const hasActions = processedWorkouts.length > 0 || allProgressions.length > 0 || newWeeksAdded.length > 0;
    if (hasActions) {
        try {
            const userEmail = await getUserEmail(user_id);
            if (userEmail) {
                const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
                const html = await renderAsync(
                    React.createElement(WorkoutSummaryEmail, {
                        processedWorkouts: processedWorkouts,
                        progressions: allProgressions.length > 0 ? allProgressions : undefined,
                        newWeeksAdded: newWeeksAdded.length > 0 ? newWeeksAdded : undefined,
                    })
                );
                const { error: emailError } = await resend.emails.send({
                    from: 'Jack from Proxima <jack@send.proximafitness.com>',
                    to: userEmail,
                    subject: 'Post-workout progress update',
                    html
                });
                if (emailError) {
                    console.error('Failed to send workout summary email:', emailError);
                }
            }
        } catch (emailError) {
            console.error('Error sending workout summary email:', emailError);
        }
    }
    */

    return new Response(
        JSON.stringify({ 
            message: `Hello ${user_id}! Welcome to Proxima Fitness.`,
            workouts_count: workoutsCount,
            new_workouts_count: newWorkoutsCount,
            processed_workouts: processedWorkouts,
            // newWeeksAdded always [] while uploadNewWeek commented (ADR 0011 SP1); kept for API shape.
            new_weeks_added: newWeeksAdded.length > 0 ? newWeeksAdded : undefined,
            progressions: allProgressions.length > 0 ? allProgressions : undefined,
            errors: errors.length > 0 ? errors : undefined
        }),
        { headers: { "Content-Type": "application/json" } },
    );

  } catch (error) {
    console.error(error);
    // If it's an HttpError, use its status code; otherwise default to 500
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    // For 204, return the message as-is if it's already JSON, otherwise wrap it
    if (statusCode === 204) {
      return new Response(error.message, { 
        status: statusCode,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ error: error.message }), { status: statusCode });
  }
  
  
})