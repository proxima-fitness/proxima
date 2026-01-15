import { User } from "@supabase/supabase-js";
import { supabase } from ".";
import { v4 as uuidv4 } from 'uuid';
import { convertToHevyRoutine } from "@/components/program-builder/utils";

// GET THE PROGRAMS DISPLAYED ON THE EXPLORE PAGE
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

            return programsWithThumbnails as unknown as TProgram[];
        }

        return [];
    } catch (error: unknown) {
        console.error('Unexpected error fetching explore page programs:', error);
        return [];
    }
};

// GET THE COMMUNITY AI PROGRAMS
export const getCommunityAiPrograms = async () => {
    try {
        const { data, error } = await
            supabase.from('programs')
            .select('prompt, id')
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

            return uniqueData as unknown as TProgram[];
        }
    } catch (error: unknown) {
        console.error('Error fetching community ai programs:', error);
    }
}

// GET THE COMMUNITY AI PROGRAMS WITH PAGINATION
export const getCommunityAiProgramsPaginated = async (limit: number = 20, offset: number = 0) => {
    try {
        const { data, error } = await
            supabase.from('programs')
            .select('prompt, id, user_id, saves')
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

            return uniqueData as unknown as TProgram[];
        }
        return [];
    } catch (error: unknown) {
        console.error('Error fetching community ai programs:', error);
        return [];
    }
}

// GET THE SCHEDULE FOR A SPECIFIC PROGRAM
export const getExplorePageProgramDetails = async (program_id: string) => {
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
            .order('nthDay', { referencedTable: 'schedule_workouts', ascending: true });

            if (error) {
                console.error('Error fetching program details:', error);
            } else if (data && data.length > 0 ) {
                return data as unknown as TProgramDetails[];
            }
    } catch (error: unknown) {
        console.error('Error fetching program details:', error);
    }
};

// GET THE PROGRAMS DISPLAYED ON THE PROGRAMS PAGE INCLUDING THUMBNAILS
export const getPrograms = async (limit?: number) => {
    try {
        let query = supabase
            .from('programs')
            .select('id,title,details,program_length,workout_duration,equipment,specialization,difficulty,user_id, saves').eq('explore', true)
            .not('user_id', 'is', null)
            .neq('title', 'My AI Program')
            .order('saves', { ascending: false });

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

            return programsWithThumbnails as unknown as TProgram[];
        }
    } catch (error: unknown) {
        console.error('Error fetching explore page programs:', error);
    }
};

// GET A SPECIFIC PROGRAM BY PROGRAM ID
export const getProgramByID = async (program_id: string) => {
    try {
        const { data, error } = await supabase
        .from('programs')
        .select('id,title,details,program_length,workout_duration,equipment,specialization,difficulty,user_id').eq("id",program_id);
        if (error) {
            console.error('Error fetching explore page programs:', error);
        } else if (data && data.length > 0 ) {
            return data as unknown as TProgram[];
        }
    } catch (error: unknown) {
        console.error(`Error fetching explore page programs: ${error}`);
    }
};


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


// GET A SHARED PROGRAM BY SHARE ID
export const getSharedProgram = async (shareId: string): Promise<THevyRoutine[] | undefined> => {
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
            .order('nthDay', { referencedTable: 'schedule_workouts', ascending: true });

            if (error) {
                console.error('Error fetching program details:', error);
            } else if (data && data.length > 0 ) {
                const programDetails = data as unknown as TProgramDetails[];
                if (programDetails && programDetails[0]?.schedule_workouts) {
                    // Sort schedule workouts by week and day
                    const sortedWorkoutsByWeek = sortWorkouts(programDetails[0].schedule_workouts);

                    // Convert schedule to Hevy routines
                    const convertedRoutines = await convertToHevyRoutine(sortedWorkoutsByWeek);


                    return convertedRoutines as unknown as THevyRoutine[];
                }
            }
    } catch (error: unknown) {
        console.error(`Error fetching shared program: ${error}`);
        return [];
    }
}

// CHECK IF A PROGRAM THUMBNAIL EXISTS IN USERS S3 STORAGE FOLDER (PROGRAM Exists ?)
export const getProgramThumbnailStatus = async (id?: string) => {

    try {
        const { data, error } = await supabase.storage.from('programs').list(id , {
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



// GET PROGRAM THUMBNAIL FOR A PROGRAM VIA UUID
export const getProgramThumbnailByID = async (id: string) => {
    try {
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

// GET PROGRAM THUMBNAIL FOR A PROGRAM VIA UUID ( GETS PROGRAM THUMBNAIL AS WORKAROUND FOR CORS. PROGRAM S3 BUCKET IS NOW PUBLIC)
export const getProgramThumbnailByIDViaPublicUrl = async (id: string) => {
    try {
        const { data, error } = await supabase.storage
            .from('programs')
            .list(id, {
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

// GET USER'S SUBSCRIBED/SAVED PROGRAMS
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
            .filter((id): id is string => id !== null);

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

        return programsWithThumbnails as unknown as TProgram[];
    } catch (error: unknown) {
        console.error('Unexpected error fetching subscribed programs:', error);
        return [];
    }
};

// POST A NEW SUBSCRIBER TO PROGRAM WITH PROGRAM ID
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
