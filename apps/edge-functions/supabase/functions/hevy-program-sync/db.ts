// SPDX-License-Identifier: AGPL-3.0-only

import { supabase } from "./supabase.ts";
import { HttpError } from "./errors.ts";
import { TProgram, TProgramHistory, TProgramHevyWeekLink, TProgramScheduleHistory, TProgramSubscriber, TRoutineFolderResponse, TRoutineResponse } from "./types.ts";
// ADR 0011: uploadNewWeek call path disabled — keep import commented for future auto-progression mode.
// import { uploadNewWeek } from "./hevy.ts";
import { appendCheckmarkToRoutineTitle } from "./hevy.ts";

/**
 * ADR 0011: match Hevy workout → program/week/day only via Program–Hevy link.
 * Looks up the link row whose hevy_routine_ids contains the workout's routine_id.
 */
export async function getProgramHevyWeekLinkByRoutineId(
    user_id: string,
    hevy_routine_id: string,
): Promise<TProgramHevyWeekLink | null> {
    const { data, error } = await supabase
        .from("program_hevy_week_links")
        .select("id, user_id, program_id, nth_week, hevy_folder_id, hevy_routine_ids, created_at, updated_at")
        .eq("user_id", user_id)
        .contains("hevy_routine_ids", [hevy_routine_id])
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error("Failed to lookup Program–Hevy link by routine id:", error.message);
        throw new HttpError(`Failed to lookup Program–Hevy link: ${error.message}`, 500);
    }

    return (data as TProgramHevyWeekLink | null) ?? null;
}

/**
 * 1-based nthDay from position in link.hevy_routine_ids (ordered by day on Week Export).
 */
export function nthDayFromProgramHevyLink(
    link: TProgramHevyWeekLink,
    hevy_routine_id: string,
): number {
    const index = link.hevy_routine_ids.indexOf(hevy_routine_id);
    if (index === -1) {
        throw new HttpError(
            `Routine ${hevy_routine_id} not found in Program–Hevy link ${link.id}`,
            404,
        );
    }
    return index + 1;
}


export async function hevyProgramSync(subscribedPrograms: TProgram[], user_id: string, hevyApiKey: string): Promise<Array<{ programTitle: string; weekNumber: number }>> {
    const newWeeksAdded: Array<{ programTitle: string; weekNumber: number }> = [];

    // ADR 0011: auto next-week upload commented out (not deleted).
    // Default loop pulls user back to Proxima for AI week suggest + Week Export.
    // Day-complete schedule history writes remain elsewhere in this function file.
    /*
    for (const program of subscribedPrograms) {
        // 1. getProgramHistory via ID from program_history table
        const programHistory = await getProgramHistoryByProgramId(user_id, program.id);
        const programTitle = programHistory?.title ?? "Unknown Program";
        
        // Skip if no program history exists for this program
        if (!programHistory) {
            continue;
        }
        
        // 2. getMaxNthWeek from program_schedule_history table where id == programHistoryId
        const maxNthWeek = await getMaxNthWeek(user_id, programHistory.id);
        
        // 4. getMaxNthWeek from schedule_workouts table via program_id
        const maxNthWeekFromScheduleWorkouts = await getMaxNthWeekFromScheduleWorkouts(program.id);
        // 6. if maxNthDay in program_schedule_history == maxNthDay in schedule_workouts {
        // Skip if we don't have the necessary data
        if (maxNthWeek === null || maxNthWeekFromScheduleWorkouts === null) {
            console.error(`No max nth day or max nth week found for program ${program.id}. Skipping sync.`);
            continue;
        }

        // Check if the current week is complete (all days in the week are completed)
        const currentWeekComplete = await isWeekComplete(user_id, programHistory.id, maxNthWeek, program.id);
        
        if (currentWeekComplete) {
            //await archiveWeek(hevyApiKey, program.id);
            // Only upload new week if program is not finished (there are more weeks available)
            if (maxNthWeek !== maxNthWeekFromScheduleWorkouts) {
                // program not finished - upload new week
                await uploadNewWeek(hevyApiKey, program.id, maxNthWeek + 1, programTitle);
                newWeeksAdded.push({
                    programTitle: programTitle,
                    weekNumber: maxNthWeek + 1
                });
            }
        }
    }
    */

    void subscribedPrograms;
    void user_id;
    void hevyApiKey;

    return newWeeksAdded;
}


/**
 * FETCHES THE HEVY API KEY FROM VAULT FOR A GIVEN USER
 * @param user_id - The user ID to fetch the API key for
 * @returns The Hevy API key
 */
export async function getHevyApiKey(user_id: string): Promise<string> {
    const { data: hevyApiKey, error: rpcError } = await supabase.rpc(
        'get_hevy_key_from_vault', // The name of your SQL function
        { p_user_id: user_id }      // The parameter name must match the SQL argument (p_user_id)
    );
  
    if (rpcError) {
        console.error('Failed to retrieve key:', rpcError.message);
        throw new HttpError(`Permission denied or function not found: ${rpcError.message}`, 500);
    }
    
    if (!hevyApiKey) {
        console.log(`No key found for user ${user_id}. Skipping sync.`);
        throw new HttpError("No Hevy API key found", 404);
    }
    
    return hevyApiKey;
}


/**
 * ADR 0011: program-sync cursor (not workout-history last_known_workout_count).
 * @param user_id - Owner
 * @returns Last Hevy workout count after a program-sync run, or 0 if none
 */
export async function getLastHevyProgramSyncCount(user_id: string): Promise<number> {
    const { data, error } = await supabase
        .from("hevy_workouts_count")
        .select("last_hevy_program_sync_count")
        .eq("user_id", user_id)
        .maybeSingle();

    if (error) {
        console.error("Failed to retrieve last_hevy_program_sync_count:", error.message);
        throw new HttpError(
            `Failed to retrieve last_hevy_program_sync_count: ${error.message}`,
            500,
        );
    }

    const count = data?.last_hevy_program_sync_count;
    return typeof count === "number" ? count : 0;
}

/**
 * @deprecated ADR 0011 — use getLastHevyProgramSyncCount. Kept for callers that
 * still mean the shared workout-history cursor.
 */
export async function getLastKnownWorkoutCount(user_id: string): Promise<number> {
    return getLastHevyProgramSyncCount(user_id);
}

/**
 * Persist program-sync cursor without clobbering workout-history columns.
 * @param user_id - Owner
 * @param workoutsCount - Current Hevy /v1/workouts/count
 */
export async function backupHevyProgramSyncCount(
    user_id: string,
    workoutsCount: number,
): Promise<void> {
    const { data: existing, error: readError } = await supabase
        .from("hevy_workouts_count")
        .select("id")
        .eq("user_id", user_id)
        .maybeSingle();

    if (readError) {
        console.error("Error reading hevy_workouts_count for program sync", readError);
        throw new HttpError(
            `Failed to read hevy_workouts_count: ${readError.message}`,
            500,
        );
    }

    const updatedAt = new Date().toISOString();

    if (existing) {
        const { error: updateError } = await supabase
            .from("hevy_workouts_count")
            .update({
                last_hevy_program_sync_count: workoutsCount,
                updated_at: updatedAt,
            })
            .eq("user_id", user_id);

        if (updateError) {
            console.error("Error updating last_hevy_program_sync_count", updateError);
            throw new HttpError(
                `Failed to update last_hevy_program_sync_count: ${updateError.message}`,
                500,
            );
        }
        return;
    }

    const { error: insertError } = await supabase.from("hevy_workouts_count").insert({
        user_id,
        last_hevy_program_sync_count: workoutsCount,
        last_known_workout_count: 0,
        updated_at: updatedAt,
    });

    if (insertError) {
        console.error("Error inserting hevy_workouts_count for program sync", insertError);
        throw new HttpError(
            `Failed to insert last_hevy_program_sync_count: ${insertError.message}`,
            500,
        );
    }
}

/**
 * @deprecated ADR 0011 — use backupHevyProgramSyncCount (does not touch history cursor).
 */
export async function backupWorkoutsCount(user_id: string, workoutsCount: number): Promise<void> {
    await backupHevyProgramSyncCount(user_id, workoutsCount);
}


/**
 * EXITS EARLY IF THE WORKOUT COUNT HAS NOT INCREASED
 * @param user_id - The user ID to exit early for
 * @param workoutsCount - The workouts count to exit early for
 * @param lastKnownCount - The last known workout count to exit early for
 */
export async function exitEarlyNoNewWorkouts(user_id: string, workoutsCount: number, lastKnownCount: number): Promise<void> {
    console.log(`Workout count for user ${user_id} has not increased (current: ${workoutsCount}, last known: ${lastKnownCount}). Exiting early.`);
    throw new HttpError(
        JSON.stringify({ 
            message: `Workout count has not increased. No action taken.`,
            workouts_count: workoutsCount,
            last_known_count: lastKnownCount
        }),
        204
    );
}



/**
 * FETCHES THE USER'S SUBSCRIBED PROGRAMS FROM THE PROGRAM_SUBSCRIBERS AND PROGRAMS TABLES
 * @param user_id - The user ID to fetch the subscribed programs for
 * @returns The subscribed programs
 */
export async function getSubscribedPrograms(user_id: string): Promise<TProgram[]> {
    const { data: subscribedProgramIds, error: subscribedProgramIdsError } = await supabase
    .from('program_subscribers')
    .select('program_id')
    .eq('user_id', user_id);

    if (subscribedProgramIdsError) {
        console.error('Failed to retrieve subscribed program ids:', subscribedProgramIdsError.message);
        throw new HttpError(`Failed to retrieve subscribed program ids: ${subscribedProgramIdsError.message}`, 500);
    }

    if (!subscribedProgramIds || subscribedProgramIds.length === 0) {
        console.log(`No subscribed programs found for user ${user_id}`);
        return [];
    }

    const typedSubscribedProgramIds: TProgramSubscriber[] = subscribedProgramIds; 

    // Extract all program_ids
    const programIds = typedSubscribedProgramIds.map(row => row.program_id);

    // Fetch all programs in a single query using .in()
    const { data: subscribedPrograms, error: subscribedProgramsError } = await supabase
        .from('programs')
        .select('id,title,program_length')
        .in('id', programIds);

    if (subscribedProgramsError) {
        console.error('Error fetching programs:', subscribedProgramsError.message, 'program_ids:', programIds);
        throw new HttpError(`Failed to retrieve subscribed programs: ${subscribedProgramsError.message}`, 500);
    }

    return (subscribedPrograms || []) as TProgram[];

}


/**
 * GETS THE FOLDER ID FROM THE ROUTINE
 * @param routine - The routine to get the folder id for
 * @returns The folder id
 */
export async function getFolderId(routine: TRoutineResponse): Promise<number | null> {

    const folder_id = routine.routine.folder_id;

    if (!folder_id) {
        console.log(`No folder_id found for routine ${routine.routine.id}. Skipping sync.`);
        throw new HttpError(`No folder_id found for routine ${routine.routine.id}`, 404);
    }

    return folder_id;

}


/**
 * GETS THE FOLDER TITLE FROM THE ROUTINE FOLDER
 * @param folder - The routine folder to get the title for
 * @returns The folder title
 */
export async function getFolderTitle(folder: TRoutineFolderResponse): Promise<string | null> {
    const folder_title = folder.title;
    if (!folder_title) {
        throw new HttpError(`No folder_title found for folder ${folder.id}`, 404);
    }
    return folder_title;
}



/**
 * PARSES THE FOLDER TITLE TO GET THE WEEK NUMBER AND PROGRAM TITLE
 *
 * ADR 0011: dead — title match removed. Match only via Program–Hevy link.
 * Kept temporarily so old call sites fail compile if reintroduced without review.
 *
 * @param folder_title - The folder title to parse
 * @returns The week number and program title
 * @deprecated ADR 0011 — do not use for day-complete matching
 */
export async function parseFolderTitle(folder_title: string | null): Promise<{ parsedWeekNumber: number, programTitle: string }> {
    if (!folder_title) {
        throw new HttpError(`No folder_title found`, 404);
    }
    const dashIndex = folder_title.indexOf(" - ");
    if (dashIndex === -1) {
        console.log(`Folder title "${folder_title}" does not match expected format "Week {week} - {program_title}". Skipping sync.`);
        throw new HttpError(`Invalid folder title format "${folder_title}"`, 400);
    }
    const weekPart = folder_title.substring(0, dashIndex);
    const programTitle = folder_title.substring(dashIndex + 3); // +3 to skip " - "
    const parsedWeekNumber = parseInt(weekPart.replace("Week ", ""), 10);

    return { parsedWeekNumber, programTitle };
}


/**
 * CHECKS IF THE PROGRAM TITLE MATCHES A SUBSCRIBED PROGRAM
 *
 * ADR 0011: dead — title match removed. Match only via Program–Hevy link.
 *
 * @param programTitle - The program title to check
 * @param subscribedPrograms - The subscribed programs to check against
 * @returns The matched program title
 * @deprecated ADR 0011 — do not use for day-complete matching
 */
export async function programTitleMatchesSubscribedProgram(programTitle: string, subscribedPrograms: TProgram[]): Promise<string | null> {

    let matchedProgramTitle: string | null = null;
    for (const program of subscribedPrograms) {
        if (program.title === programTitle) {
            matchedProgramTitle = program.title;
            break;
        }
    }
    
    // vi. i. If not part of a subscribed program then skip the rest of the steps and exit 
    if (!matchedProgramTitle) {
        console.log(`No matched program title found for program title "${programTitle}". Skipping sync.`);
        throw new HttpError(`No matched program title found for program title "${programTitle} for any of: ${subscribedPrograms.map((p: TProgram) => p.title).join(", ")}"`, 204);
    }
    //If matchedProgramTitle exists then the we have verified that the workout is part of a subscribed program 
    return matchedProgramTitle;
}


/**
 * EXTRACTS THE DAY FROM THE ROUTINE TITLE
 *
 * ADR 0011: day-complete uses nthDayFromProgramHevyLink (array index), not title parse.
 * Kept for commented double-progression path / legacy callers.
 *
 * @param routineTitle - The routine title to extract the day from
 * @returns The day
 * @deprecated ADR 0011 — prefer nthDayFromProgramHevyLink for day-complete
 */
export const extractDayFromRoutineTitle = (routineTitle: string): number => {
    const dashIndex = routineTitle.indexOf(" - ");
    if (dashIndex === -1) {
        console.error(`Invalid routine title format: "${routineTitle}". Expected format: "{day Number} - {dayTitle}"`);
        throw new HttpError(`Invalid routine title format: "${routineTitle}"`, 400);
    }

    const day = routineTitle.substring(0, dashIndex).trim();
    
    const nthDay = parseInt(day, 10);
    if (isNaN(nthDay)) {
        console.error(`Invalid day value: ${day}`);
        throw new HttpError(`Invalid day value: ${day}`, 400);
    }


    if (nthDay < 1 || nthDay > 7) {
        console.error(`Invalid day value: ${nthDay}. Expected value between 1 and 7.`);
        throw new HttpError(`Invalid day value: ${nthDay}. Expected value between 1 and 7.`, 400);
    }

    return nthDay;

}


/**
 * FETCHES THE PROGRAM HISTORY FROM THE PROGRAM_HISTORY TABLE
 * @param user_id - The user ID to fetch the program history for
 * @param programTitle - The program title to fetch the program history for
 * @returns The program history
 */
export async function getProgramHistory(user_id: string, programTitle: string): Promise<TProgramHistory | null> {

    const { data: programHistory, error: programHistoryError } = await supabase
        .from('program_history')
        .select('id, program_id, title, program_length, user_id, created_at')
        .eq('title', programTitle)
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    
    if (programHistoryError) {
        console.error('Failed to retrieve program history:', programHistoryError.message);
        throw new HttpError(`Failed to retrieve program history: ${programHistoryError.message}`, 500);
    }

    return programHistory as unknown as TProgramHistory | null;
}


/**
 * FETCHES THE PROGRAM HISTORY FROM THE PROGRAM_HISTORY TABLE BY PROGRAM ID
 * @param user_id - The user ID to fetch the program history for
 * @param program_id - The program ID to fetch the program history for
 * @returns The program history title and metadata
 */
export async function getProgramHistoryByProgramId(user_id: string, program_id: string): Promise<TProgramHistory | null> {
    const { data: programHistory, error: programHistoryError } = await supabase
        .from('program_history')
        .select('id, program_id, title, program_length, user_id, created_at')
        .eq('program_id', program_id)
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    
    if (programHistoryError) {
        console.error('Failed to retrieve program history:', programHistoryError.message);
        throw new HttpError(`Failed to retrieve program history: ${programHistoryError.message}`, 500);
    }

    return programHistory as unknown as TProgramHistory | null;
}


/**
 * FETCHES THE PROGRAM SCHEDULE HISTORY FROM THE PROGRAM_SCHEDULE_HISTORY TABLE
 * @param user_id - The user ID to fetch the program schedule history for
 * @param programHistoryId - The program history ID to fetch the program schedule history for
 * @param weekNumber - The week number to fetch the program schedule history for
 * @param nthDay - The nth day to fetch the program schedule history for
 * @returns The program schedule history
 */
export async function getProgramScheduleHistory(user_id: string, programHistoryId: string, weekNumber: number, nthDay: number): Promise<TProgramScheduleHistory | null> {
    const { data: scheduleHistory, error: scheduleHistoryError } = await supabase
    .from('program_schedule_history')
    .select('id, nthWeek, nthDay, program_history_id, user_id')
    .eq('program_history_id', programHistoryId)
    .eq('nthWeek', weekNumber)
    .eq('nthDay', nthDay)
    .eq('user_id', user_id)
    .maybeSingle();

    // Only throw error for actual database errors, not for "not found" cases
    // maybeSingle() returns null data and null error when no entry is found
    if (scheduleHistoryError) {
        console.error('Failed to retrieve program schedule history:', scheduleHistoryError.message);
        throw new HttpError(`Failed to retrieve program schedule history: ${scheduleHistoryError.message}`, 500);
    }

    return scheduleHistory as unknown as TProgramScheduleHistory | null;

}


/**
 * GETS THE MAXIMUM NTH WEEK FROM THE PROGRAM_SCHEDULE_HISTORY TABLE
 * @param user_id - The user ID to get the max nth week for
 * @param programHistoryId - The program history ID to get the max nth week for
 * @returns The maximum nth week, or null if no records exist
 */
export async function getMaxNthWeek(user_id: string, programHistoryId: string): Promise<number | null> {
    const { data: scheduleHistory, error: scheduleHistoryError } = await supabase
        .from('program_schedule_history')
        .select('nthWeek')
        .eq('program_history_id', programHistoryId)
        .eq('user_id', user_id)
        .order('nthWeek', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (scheduleHistoryError) {
        console.error('Failed to retrieve max nth week:', scheduleHistoryError.message);
        throw new HttpError(`Failed to retrieve max nth week: ${scheduleHistoryError.message}`, 500);
    }

    return scheduleHistory?.nthWeek ?? null;
}


/**
 * GETS THE MAXIMUM NTH DAY FROM THE PROGRAM_SCHEDULE_HISTORY TABLE
 * @param user_id - The user ID to get the max nth day for
 * @param programHistoryId - The program history ID to get the max nth day for
 * @returns The maximum nth day, or null if no records exist
 */
export async function getMaxNthDay(user_id: string, programHistoryId: string): Promise<number | null> {
    const { data: scheduleHistory, error: scheduleHistoryError } = await supabase
        .from('program_schedule_history')
        .select('nthDay')
        .eq('program_history_id', programHistoryId)
        .eq('user_id', user_id)
        .order('nthDay', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (scheduleHistoryError) {
        console.error('Failed to retrieve max nth day:', scheduleHistoryError.message);
        throw new HttpError(`Failed to retrieve max nth day: ${scheduleHistoryError.message}`, 500);
    }

    return scheduleHistory?.nthDay ?? null;
}


/**
 * GETS THE MAXIMUM NTH WEEK FROM THE SCHEDULE_WORKOUTS TABLE
 * @param program_id - The program ID to get the max nth week for
 * @returns The maximum nth week, or null if no records exist
 */
export async function getMaxNthWeekFromScheduleWorkouts(program_id: string): Promise<number | null> {
    const { data: scheduleWorkout, error: scheduleWorkoutError } = await supabase
        .from('schedule_workouts')
        .select('nthWeek')
        .eq('program_id', program_id)
        .order('nthWeek', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (scheduleWorkoutError) {
        console.error('Failed to retrieve max nth week from schedule_workouts:', scheduleWorkoutError.message);
        throw new HttpError(`Failed to retrieve max nth week from schedule_workouts: ${scheduleWorkoutError.message}`, 500);
    }

    return scheduleWorkout?.nthWeek ?? null;
}


/**
 * GETS THE MAXIMUM NTH DAY FROM THE SCHEDULE_WORKOUTS TABLE
 * @param program_id - The program ID to get the max nth day for
 * @returns The maximum nth day, or null if no records exist
 */
export async function getMaxNthDayFromScheduleWorkouts(program_id: string): Promise<number | null> {
    const { data: scheduleWorkout, error: scheduleWorkoutError } = await supabase
        .from('schedule_workouts')
        .select('nthDay')
        .eq('program_id', program_id)
        .order('nthDay', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (scheduleWorkoutError) {
        console.error('Failed to retrieve max nth day from schedule_workouts:', scheduleWorkoutError.message);
        throw new HttpError(`Failed to retrieve max nth day from schedule_workouts: ${scheduleWorkoutError.message}`, 500);
    }

    return scheduleWorkout?.nthDay ?? null;
}

/**
 * CHECKS IF ALL DAYS IN A SPECIFIC WEEK ARE COMPLETED
 * Compares the count of scheduled days vs completed days for the week
 * @param user_id - The user ID to check for
 * @param programHistoryId - The program history ID
 * @param weekNumber - The week number to check
 * @param program_id - The program ID to get schedule workouts from
 * @returns True if all days in the week are completed, false otherwise
 */
export async function isWeekComplete(user_id: string, programHistoryId: string, weekNumber: number, program_id: string): Promise<boolean> {
    // Get count of scheduled days for this week from schedule_workouts
    const { count: scheduledDaysCount, error: scheduleWorkoutsError } = await supabase
        .from('schedule_workouts')
        .select('*', { count: 'exact', head: true })
        .eq('program_id', program_id)
        .eq('nthWeek', weekNumber);

    if (scheduleWorkoutsError) {
        console.error('Failed to retrieve schedule workouts count for week:', scheduleWorkoutsError.message);
        throw new HttpError(`Failed to retrieve schedule workouts count: ${scheduleWorkoutsError.message}`, 500);
    }

    if (!scheduledDaysCount || scheduledDaysCount === 0) {
        return false; // No workouts scheduled for this week
    }

    // Get count of completed days for this week from program_schedule_history
    const { count: completedDaysCount, error: completedDaysError } = await supabase
        .from('program_schedule_history')
        .select('*', { count: 'exact', head: true })
        .eq('program_history_id', programHistoryId)
        .eq('user_id', user_id)
        .eq('nthWeek', weekNumber);

    if (completedDaysError) {
        console.error('Failed to retrieve completed days count for week:', completedDaysError.message);
        throw new HttpError(`Failed to retrieve completed days count: ${completedDaysError.message}`, 500);
    }

    // Week is complete if the counts match
    const weekComplete = scheduledDaysCount === completedDaysCount;
    
    console.log(`Week ${weekNumber} completion check: ${completedDaysCount}/${scheduledDaysCount} days completed`);
    
    return weekComplete;
}

/**
 * GETS INCOMPLETE DAYS FOR A SPECIFIC WEEK
 * Returns days that are scheduled but not yet completed
 * @param user_id - The user ID
 * @param programHistoryId - The program history ID
 * @param weekNumber - The week number to check
 * @param program_id - The program ID to get schedule workouts from
 * @returns Array of incomplete days with nthDay and day_title
 */
export async function getIncompleteDaysForWeek(
    user_id: string,
    programHistoryId: string,
    weekNumber: number,
    program_id: string
): Promise<Array<{ nthDay: number; day_title: string | null }>> {
    type TScheduledDay = { nthDay: number; day_title: string | null };
    type TCompletedDay = { nthDay: number };

    // Get all scheduled days for this week from schedule_workouts
    const { data: scheduledDays, error: scheduleWorkoutsError } = await supabase
        .from('schedule_workouts')
        .select('nthDay, day_title')
        .eq('program_id', program_id)
        .eq('nthWeek', weekNumber)
        .order('nthDay', { ascending: true });

    if (scheduleWorkoutsError) {
        console.error('Failed to retrieve schedule workouts for week:', scheduleWorkoutsError.message);
        throw new HttpError(`Failed to retrieve schedule workouts: ${scheduleWorkoutsError.message}`, 500);
    }

    const scheduled = (scheduledDays ?? []) as TScheduledDay[];
    if (scheduled.length === 0) {
        return []; // No workouts scheduled for this week
    }

    // Get all completed days for this week from program_schedule_history
    const { data: completedDays, error: completedDaysError } = await supabase
        .from('program_schedule_history')
        .select('nthDay')
        .eq('program_history_id', programHistoryId)
        .eq('user_id', user_id)
        .eq('nthWeek', weekNumber);

    if (completedDaysError) {
        console.error('Failed to retrieve completed days for week:', completedDaysError.message);
        throw new HttpError(`Failed to retrieve completed days: ${completedDaysError.message}`, 500);
    }

    const completed = (completedDays ?? []) as TCompletedDay[];

    // Create a set of completed nthDay values for quick lookup
    const completedNthDays = new Set(completed.map((day: TCompletedDay) => day.nthDay));

    // Filter out completed days
    const incompleteDays = scheduled.filter((day: TScheduledDay) => !completedNthDays.has(day.nthDay));

    return incompleteDays.map((day: TScheduledDay) => ({
        nthDay: day.nthDay,
        day_title: day.day_title
    }));
}

/**
 * POSTS THE PROGRAM HISTORY TO THE PROGRAM_HISTORY TABLE
 * @param user_id - The user ID to post the program history for
 * @param programTitle - The program title to post the program history for
 * @param programLength - The program length to post the program history for
 * @returns The program history
 */
export async function postProgramHistory(user_id: string, programTitle: string, programLength: number, program_id: string) {
    const { data: programHistory, error: programHistoryError } = await supabase
    .from('program_history')
    .insert({
        title: programTitle,
        user_id: user_id,
        program_length: programLength,
        program_id: program_id
    })
    .select()
    .single();

    if (programHistoryError) {
        console.error('Failed to post program history:', programHistoryError.message);
        throw new HttpError(`Failed to post program history: ${programHistoryError.message}`, 500);
    }

    return programHistory as unknown as TProgramHistory;
}


/**
 * POSTS THE PROGRAM SCHEDULE HISTORY TO THE PROGRAM_SCHEDULE_HISTORY TABLE
 * @param user_id - The user ID to post the program schedule history for
 * @param programHistoryId - The program history ID to post the program schedule history for
 * @param weekNumber - The week number to post the program schedule history for
 * @param nthDay - The nth day to post the program schedule history for
 * @returns The program schedule history
 */
export async function postProgramScheduleHistory(user_id: string, programHistoryId: string, weekNumber: number, nthDay: number) {
    const { data: programScheduleHistory, error: programScheduleHistoryError } = await supabase
    .from('program_schedule_history')
    .insert({
        program_history_id: programHistoryId,
        nthWeek: weekNumber,
        nthDay: nthDay,
        user_id: user_id
    })
    .select()
    .single();

    if (programScheduleHistoryError) {
        console.error('Failed to post program schedule history:', programScheduleHistoryError.message);
        throw new HttpError(`Failed to post program schedule history: ${programScheduleHistoryError.message}`, 500);
    }

    return programScheduleHistory as unknown as TProgramScheduleHistory;
}


/**
 * Writes day-complete to program_schedule_history from a Program–Hevy link match (ADR 0011).
 * Week/day come from the link — not folder/routine title parse.
 *
 * @param user_id - Owner
 * @param weekNumber - Link nth_week
 * @param programTitle - Display title (for program_history create / email)
 * @param nthDay - 1-based day from link.hevy_routine_ids index
 * @param programLength - Program length for program_history create
 * @param program_id - Proxima program id from link
 * @param routine_id - Hevy routine id (checkmark optional)
 * @param hevyApiKey - Optional; checkmark write
 * @param routine - Optional; checkmark write
 */
export async function syncProgramHistoryAndScheduleHistory(
    user_id: string,
    weekNumber: number,
    programTitle: string,
    nthDay: number,
    programLength: number,
    program_id: string,
    routine_id: string,
    hevyApiKey?: string,
    routine?: TRoutineResponse
) {
    let programHistory = await getProgramHistoryByProgramId(user_id, program_id);

    if (!programHistory) {
        console.log(`No program history for program_id ${program_id}. Creating.`);
        await postProgramHistory(user_id, programTitle, programLength, program_id);
        programHistory = await getProgramHistoryByProgramId(user_id, program_id);
    }

    if (!programHistory) {
        console.error(`Failed to load/create program history for program_id ${program_id}`);
        throw new HttpError(`No program history for program_id ${program_id}`, 500);
    }

    const programScheduleHistory = await getProgramScheduleHistory(
        user_id,
        programHistory.id,
        weekNumber,
        nthDay,
    );
    if (!programScheduleHistory) {
        console.log(
            `Creating program_schedule_history program_id=${program_id} week ${weekNumber} day ${nthDay}`,
        );
        await postProgramScheduleHistory(user_id, programHistory.id, weekNumber, nthDay);

        if (routine_id && hevyApiKey && routine) {
            try {
                await appendCheckmarkToRoutineTitle(
                    routine_id,
                    routine.routine.title,
                    hevyApiKey,
                    routine,
                );
            } catch (error) {
                console.error(`Failed to append checkmark to routine ${routine_id} title:`, error);
            }
        }
    }
}