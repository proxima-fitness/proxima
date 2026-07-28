/**
 * @module api/programs
 *
 * CRUD and query operations for workout programs - the central content type in
 * Proxima. Programs live in the `programs` table and are composed of
 * `schedule_workouts` which contain `program_workout_exercises` referencing
 * `hevy_exercise_templates`.
 *
 * Responsibilities:
 * - Fetching programs for the explore page, programs page, and detail views
 * - Resolving program thumbnails from Supabase Storage
 * - Managing program subscriptions (save / unsave)
 * - Fetching shared programs and converting them to Hevy routine format
 * - Community AI program listing with de-duplication
 *
 * Depends on: ./index (supabase client), uuid, @/components/program-builder/utils
 * Used by: hooks.ts, explore page, program detail page, program-builder
 */
import { User } from "@supabase/supabase-js";
import { supabase } from ".";
import { v4 as uuidv4 } from 'uuid';
import { convertToHevyRoutine } from "@/components/program-builder/utils";

/**
 * Fetches publicly listed programs for the explore page with optional filtering
 * and pagination, sorted by save count descending. Each returned program
 * includes its thumbnail blob.
 *
 * @param filters - Optional key-value filters applied via Postgres `contains`
 * @param limit - Maximum programs to return
 * @param offset - Pagination offset
 * @returns Array of programs with thumbnails attached, or empty array on error
 */
export const getExplorePagePrograms = async (filters?: TProgramFilters, limit?: number, offset?: number): Promise<TProgram[]> => {
    try {
        let query = supabase
            .from('programs')
            .select(
                'id, title, details, program_length, workout_duration, equipment, specialization, difficulty, user_id, saves',
            )
            .eq('explore', true)
            .order('saves', { ascending: false });

        if (filters) {
            for (const [key, value] of Object.entries(filters)) {
                if (value) {
                    query = query.contains(key, value);
                }
            }
        }

        if (limit !== undefined) {
            query = query.limit(limit);
        }

        if (offset !== undefined) {
            query = query.range(offset, offset + (limit ?? 10) - 1);
        }

        const { data: programs, error } = await query;

        if (error) {
            console.error('Error fetching explore page programs:', error.message);
            return [];
        } else if (programs && programs.length > 0 ) {

            const programsWithThumbnails = await Promise.all(
                programs.map( async (program) => {
                    const thumbnail = await getProgramThumbnailByID(program.id);
                    return {...program, thumbnail};
                }),
            );

            return programsWithThumbnails;
        }

        return [];
    } catch (error: unknown) {
        console.error('Unexpected error fetching explore page programs:', error);
        return [];
    }
};

/**
 * Fetches all community-shared AI-generated programs, de-duplicated by prompt
 * text so the same prompt configuration only appears once.
 *
 * @returns Array of unique AI programs, or undefined on error
 */
export const getCommunityAiPrograms = async (): Promise<TProgram[] | undefined> => {
    try {
        const { data, error } = await
            supabase.from('programs')
            .select('id, title, details, program_length, workout_duration, equipment, specialization, difficulty, user_id, saves, prompt')
            .eq('title', 'My AI Program')
            .not('prompt', 'is', null)
            .neq('prompt', '""')
            .eq("explore", true);
        if (error) {
            console.error('Error fetching community ai programs:', error);
        } else if (data && data.length > 0 ) {
            const seen = new Set<string>();
            const uniqueData = data.filter(program => {
                if (seen.has(program.prompt)) return false;
                seen.add(program.prompt);
                return true;
            });

            return uniqueData;
        }
    } catch (error: unknown) {
        console.error('Error fetching community ai programs:', error);
    }
}

/**
 * Paginated variant of {@link getCommunityAiPrograms}, sorted by save count
 * descending with client-side de-duplication by prompt.
 *
 * @param limit - Page size (default 20)
 * @param offset - Pagination offset (default 0)
 * @returns Array of unique AI programs for the requested page
 */
export const getCommunityAiProgramsPaginated = async (limit: number = 20, offset: number = 0): Promise<TProgram[]> => {
    try {
        const { data, error } = await
            supabase.from('programs')
            .select('id, title, details, program_length, workout_duration, equipment, specialization, difficulty, user_id, saves, prompt')
            .eq('title', 'My AI Program')
            .not('prompt', 'is', null)
            .neq('prompt', '""')
            .eq("explore", true)
            .order("saves", { ascending: false })
            .range(offset, offset + limit - 1);
        if (error) {
            console.error('Error fetching community ai programs:', error);
        } else if (data && data.length > 0 ) {
            const seen = new Set<string>();
            const uniqueData = data.filter(program => {
                if (seen.has(program.prompt)) return false;
                seen.add(program.prompt);
                return true;
            });

            return uniqueData;
        }
        return [];
    } catch (error: unknown) {
        console.error('Error fetching community ai programs:', error);
        return [];
    }
}

/**
 * Fetches the full schedule for a program: workouts, exercises, and exercise
 * template details, ordered by week then day. Used on the program detail page.
 *
 * @param program_id - The program's primary key
 * @returns Array of program detail objects with nested schedule, or undefined
 */
export const getExplorePageProgramDetails = async (program_id: number): Promise<TProgramDetails[] | undefined> => {
    try {
            const { data, error } = await supabase
            .from('programs')
            .select(`
                id,
                title,
                schedule_workouts(
                    nthDay,
                    nthWeek,
                    day_title,
                    program_workout_exercises(
                        reps,
                        weights,
                        reps_max,
                        reps_range,
                        rpe,
                        rpe_range,
                        time_taken,
                        time_range,
                        amrap,
                        percent_rm,
                        hevy_exercise_templates (
                            id,
                            title,
                            type,
                            primary_muscle_group,
                            secondary_muscle_groups,
                            is_custom,
                            equipment,
                            normalized_title,
                            gif_id,
                            instructions
                        )
                    )
                )`,
            )
            .eq('id', program_id)
            .order('nthWeek', { referencedTable: 'schedule_workouts', ascending: true })
            .order('nthDay', { referencedTable: 'schedule_workouts', ascending: true })
            .returns<TProgramDetails[]>();

            if (error) {
                console.error('Error fetching program details:', error);
            } else if (data && data.length > 0 ) {
                return data;
            }
    } catch (error: unknown) {
        console.error('Error fetching program details:', error);
    }
};

/**
 * Fetches publicly listed programs for the programs page, optionally filtered
 * to coach-only content, sorted by save count. Each program includes its
 * thumbnail blob.
 *
 * @param limit - Optional cap on programs returned
 * @param is_coach - When true, only coach-created programs; when false/undefined, non-coach programs
 * @returns Array of programs with thumbnails, or undefined on error
 */
export const getPrograms = async (limit?: number, is_coach?: boolean): Promise<TProgram[] | undefined> => {
    try {
        let query = supabase
            .from('programs')
            .select('id,title,details,program_length,workout_duration,equipment,specialization,difficulty,user_id, saves, is_coach')
            .eq('explore', true)
            .not('user_id', 'is', null);

        if (is_coach === true) {
            query = query.eq('is_coach', true);
        } else {
            query = query.or('is_coach.is.null,is_coach.eq.false');
        }

        query = query.order('saves', { ascending: false });

        if (limit !== undefined) {
            query = query.limit(limit);
        }
        const { data: programs, error } = await query;

        if (error) {
            console.error('Error fetching explore page programs:', error);
        } else if (programs && programs.length > 0 ) {

            const programsWithThumbnails = await Promise.all(
                programs.map( async (program) => {
                    const thumbnail = await getProgramThumbnailByID(program.id);
                    return {...program, thumbnail};
                }),
            );

            return programsWithThumbnails;
        }
    } catch (error: unknown) {
        console.error('Error fetching explore page programs:', error);
    }
};

/**
 * Fetches a single program's metadata by its numeric ID (no schedule data).
 *
 * @param program_id - The program's primary key
 * @returns Array containing the matching program, or undefined if not found
 */
export const getProgramByID = async (program_id: number): Promise<TProgram[] | undefined> => {
    try {
        const { data, error } = await supabase
        .from('programs')
        .select('id,title,details,program_length,workout_duration,equipment,specialization,difficulty,user_id,saves,is_coach').eq("id", program_id);
        if (error) {
            console.error('Error fetching program by ID:', error);
        } else if (data && data.length > 0 ) {
            return data;
        }
    } catch (error: unknown) {
        console.error(`Error fetching program by ID: ${error}`);
    }
};

/**
 * Groups schedule workouts by week number and sorts each group by day,
 * producing a 2D array where the outer index is the week.
 *
 * @param scheduleWorkouts - Flat array of schedule workout objects
 * @returns Nested array: `sortedWorkouts[weekIndex][dayIndex]`
 */
export const sortWorkouts = (scheduleWorkouts: TScheduleWorkouts[]) => {
    const workoutsByWeek = scheduleWorkouts.reduce<Record<number, TScheduleWorkouts[]>>((acc, workout) => {
        const { nthWeek } = workout;
        if (!acc[nthWeek]) {
            acc[nthWeek] = [];
        }
        acc[nthWeek].push(workout);
        return acc;
    }, {});

    const sortedWorkoutsByWeek: TScheduleWorkouts[][] = Object.keys(workoutsByWeek)
        .sort((a, b) => Number(a) - Number(b))
        .map(week =>
            workoutsByWeek[Number(week)].sort((a, b) => a.nthDay - b.nthDay),
    );

    return sortedWorkoutsByWeek;
};


/**
 * Fetches a shared program by its ID and converts the schedule into an array
 * of Hevy-compatible routine objects that can be imported directly.
 *
 * @param shareId - The program's numeric ID (used as the share identifier)
 * @returns Array of Hevy routines, or undefined/empty array on error
 */
export const getSharedProgram = async (shareId: number): Promise<THevyRoutine[] | undefined> => {
    try {
        const { data, error } = await supabase
            .from('programs')
            .select(`
                id,
                title,
                schedule_workouts(
                    nthDay,
                    nthWeek,
                    day_title,
                    program_workout_exercises(
                        reps,
                        weights,
                        reps_max,
                        reps_range,
                        rpe,
                        rpe_range,
                        time_taken,
                        time_range,
                        amrap,
                        percent_rm,
                        hevy_exercise_templates (
                            id,
                            title,
                            type,
                            primary_muscle_group,
                            secondary_muscle_groups,
                            is_custom,
                            equipment,
                            normalized_title,
                            gif_id,
                            instructions
                        )
                    )
                )`,
            )
            .eq('id', shareId)
            .order('nthWeek', { referencedTable: 'schedule_workouts', ascending: true })
            .order('nthDay', { referencedTable: 'schedule_workouts', ascending: true })
            .returns<TProgramDetails[]>();

            if (error) {
                console.error('Error fetching program details:', error);
            } else if (data && data.length > 0 ) {
                const programDetails: TProgramDetails[] = data;
                if (programDetails && programDetails[0]?.schedule_workouts) {
                    // Sort schedule workouts by week and day
                    const sortedWorkoutsByWeek = sortWorkouts(programDetails[0].schedule_workouts);

                    // Convert schedule to Hevy routines
                    const convertedRoutines = await convertToHevyRoutine(sortedWorkoutsByWeek);
                    return convertedRoutines;
                }
            }
    } catch (error: unknown) {
        console.error(`Error fetching shared program: ${error}`);
        return [];
    }
}

/**
 * Checks whether a thumbnail file exists in the `programs` storage bucket for
 * the given program ID, and returns the filename if found.
 *
 * Skips the `.emptyFolderPlaceholder` sentinel file that Supabase creates for
 * empty directories.
 *
 * @param id - The program's numeric ID (used as the storage folder name)
 * @returns The thumbnail filename, null if none exists, or empty array on error
 */
export const getProgramThumbnailStatus = async (id?: number) => {
    try {
        const { data, error } = await supabase.storage.from('programs').list(id?.toString() ?? '' , {
            limit: 100,
            offset: 0,
            sortBy: { column: 'name', order: 'asc' },
        });
        if (error) {
            console.error('Error checking program thumbnail exists:', error);
            return null;
        } else {
            if (data[0]?.name === ".emptyFolderPlaceholder") {
                return data[1]?.name;
            } else {
                return data[0]?.name || null;
            }
        }
    } catch ( error: unknown) {
        console.error('Error checking program thumbnail exists',error);
        return [];
    }
};



/**
 * Downloads the actual thumbnail blob for a program by first resolving the
 * filename via {@link getProgramThumbnailStatus}.
 *
 * @param id - The program's numeric ID
 * @returns The thumbnail as a Blob, or undefined if not found
 */
export const getProgramThumbnailByID = async (id: number) => {
    try {
        if (!id) return undefined;
            const fileName = await getProgramThumbnailStatus(id);
            if (fileName !== null  && fileName.length > 0) {
                const { data, error } = await supabase.storage.from('programs').download(id + "/" + fileName);
                if (error) {
                    console.error('Error fetching program thumbnail:', error);
                } else {
                    return data;
                }
            }
    } catch (error: unknown) {
        console.error('Error fetching program thumbnail:', error);
    }
};

/**
 * Returns the public URL for a program's thumbnail instead of downloading the
 * blob. This avoids CORS issues since the programs bucket is publicly readable.
 *
 * @param id - The program's numeric ID
 * @returns The public URL string, or undefined if no image file exists
 */
export const getProgramThumbnailByIDViaPublicUrl = async (id: number) => {
    try {
        const { data, error } = await supabase.storage
            .from('programs')
            .list(id.toString(), {
                limit: 1,
                sortBy: { column: 'name', order: 'asc' },
            });

        if (error) {
            console.error('Error listing thumbnails:', error);
        }

        const imageFile = data?.find((file) =>
            /\.(jpg|jpeg|png|jfif)$/i.test(file.name),
        );

        if (!imageFile) return undefined;

        const { data: publicData } = supabase.storage
            .from('programs')
            .getPublicUrl(`${id}/${imageFile.name}`);

        return publicData.publicUrl;
    } catch (err) {
        console.error('Error fetching thumbnail public URL:', err);
    }
};

/**
 * Fetches all programs a user has saved/subscribed to, including thumbnails.
 * First queries the `program_subscribers` join table, then batch-fetches the
 * corresponding program rows.
 *
 * @param user - The authenticated Supabase user
 * @returns Array of subscribed programs with thumbnails, or empty array
 */
export const getSubscribedPrograms = async (user: User): Promise<TProgram[]> => {
    try {
        if (!user) {
            return [];
        }

        // First, get all program_ids that the user has subscribed to
        const { data: subscriptions, error: subscriptionsError } = await supabase
            .from('program_subscribers')
            .select('program_id')
            .eq('user_id', user.id);

        if (subscriptionsError) {
            console.error('Error fetching subscribed programs:', subscriptionsError);
            return [];
        }

        if (!subscriptions || subscriptions.length === 0) {
            return [];
        }

        // Extract program IDs
        const programIds = subscriptions
            .map(sub => sub.program_id)
            .filter((id): id is number => id !== null);

        if (programIds.length === 0) {
            return [];
        }

        // Fetch the actual programs
        const { data: programs, error: programsError } = await supabase
            .from('programs')
            .select('id, title, details, program_length, workout_duration, equipment, specialization, difficulty, user_id, saves')
            .in('id', programIds);

        if (programsError) {
            console.error('Error fetching programs:', programsError);
            return [];
        }

        if (!programs || programs.length === 0) {
            return [];
        }

        // Add thumbnails to each program
        const programsWithThumbnails = await Promise.all(
            programs.map(async (program) => {
                const thumbnail = await getProgramThumbnailByID(program.id);
                return { ...program, thumbnail };
            }),
        );

        return programsWithThumbnails;
    } catch (error: unknown) {
        console.error('Unexpected error fetching subscribed programs:', error);
        return [];
    }
};

/**
 * Subscribes the current user to a program by inserting a row into the
 * `program_subscribers` table.
 *
 * @param user - The authenticated Supabase user
 * @param program_id - The program's ID to subscribe to
 * @returns The Supabase error object if the insert fails, otherwise void
 */
export const postNewProgramSubscriber = async (user: User, program_id: string) => {

    try {
        const subscriberObject: { [key: string]: unknown } = {};
        subscriberObject['id'] = uuidv4();
        subscriberObject['user_id'] = user.id;
        subscriberObject['program_id'] = program_id;

        const { error: subscriberError } = await supabase.from('program_subscribers').insert([
            subscriberObject,
        ]);

        if (subscriberError) {
            return subscriberError;
        }

    } catch (error: unknown ) {
        console.error("Error Joining Program",error);
    }
};


/**
 * Unsubscribes a user from a program by deleting the matching row in the
 * `program_subscribers` table.
 *
 * @param user_id - The user's UUID
 * @param program_id - The program's ID (string or number; coerced to int)
 * @returns The Supabase error object if deletion fails, otherwise void
 */
export const deleteProgramSubscriber = async (user_id: string, program_id: string | number) => {
    try {
        const programId = typeof program_id === "string" ? parseInt(program_id, 10) : program_id;
        const { error } = await supabase
            .from('program_subscribers')
            .delete()
            .eq('user_id', user_id)
            .eq('program_id', programId);

        if (error) return error;
    } catch (error: unknown) {
        console.error("Error removing program subscription", error);
    }
};
