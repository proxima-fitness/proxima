/**
 * @module api/hooks
 *
 * React Query hooks that wrap every Supabase and Hevy API call used on the
 * client. Each hook declares a stable `queryKey`, enables/disables itself based
 * on prerequisite data (e.g. `enabled: !!user`), and returns standard React
 * Query result objects.
 *
 * The file also contains "SSR hooks" — async functions named `use*SSR` that
 * are called directly in server components / `getServerSideProps` to prefetch
 * data without React Query.
 *
 * NOTE: React Query is strictly client-side. For server-side data fetching,
 * use the SSR functions at the bottom of this file.
 *
 * Depends on: @tanstack/react-query, ./blog, ./programs, ./users, ./storage,
 *             ./featureLimits, ../components/program-builder/api/hevy
 * Used by: virtually every page and component that renders dynamic data
 */
import { useQuery, useInfiniteQuery, type QueryFunctionContext } from "@tanstack/react-query";
import { getBlogById, getBlogs } from "./blog";
import { getCommunityAiPrograms, getCommunityAiProgramsPaginated, getExplorePageProgramDetails, getExplorePagePrograms, getProgramByID, getPrograms, getProgramThumbnailByID, getSubscribedPrograms } from "./programs";
import { ANONYMOUS_USER_METADATA, getOpUserId, getUserFullName, getUserMetaData, getUsersBatch } from "./users";
import { getExerciseGif, getProfilePicByID } from "./storage";
import { getHevyApiKey, getHevyCustomExercises, getHevyExercises, getHevyPrograms, getHevyRoutines } from "../components/program-builder/api/hevy";
import { getBolaoPredictorLimits } from "./bolao-limits";
import { getMyFeatureLimits } from "./feature-limits";
import { getFollowers, getFollowing } from "./followers";
import { User } from "@supabase/supabase-js";
import { getChatHistoryById, getChatIds } from "./chat-history";
import { getLoggedWorkoutDetail, getLoggedWorkoutPreviews, getProfileCalendarWorkouts, getProfileStatistics, LOGGED_WORKOUT_BROWSE_QUERY_KEY, PROFILE_CALENDAR_QUERY_KEY, PROFILE_STATISTICS_QUERY_KEY, WorkoutNotFoundError } from "./workout-history-browse";

/* ================================
   CLIENT-SIDE RENDERED HOOKS
   ================================ */

/**
 * Fetches the user's saved programs from the Hevy integration.
 *
 * @param user - The authenticated Supabase user (query disabled when null)
 * @param hevyApiKey - The user's Hevy API key (query disabled when empty)
 */
export const useHevyPrograms = (user: User | undefined | null, hevyApiKey: string) => {
    return useQuery({
        queryKey: ["hevy-programs"],
        queryFn: () => getHevyPrograms(user, hevyApiKey),
        enabled: !!user && !!hevyApiKey,
    });
};
/**
 * Fetches the user's workout routines from the Hevy integration.
 *
 * @param user - The authenticated Supabase user
 * @param hevyApiKey - The user's Hevy API key
 */
export const useHevyRoutines = (user: User | undefined | null, hevyApiKey: string) => {
    return useQuery({
        queryKey: ["hevy-routines"],
        queryFn: () => getHevyRoutines(user, hevyApiKey),
        enabled: !!user && !!hevyApiKey,
    });
};

/**
 * Fetches the user's custom exercises from the Hevy integration.
 *
 * @param user - The authenticated Supabase user
 * @param hevyApiKey - The user's Hevy API key
 */
export const useHevyCustomExercises = (user: User | undefined | null, hevyApiKey: string) => {
    return useQuery({
        queryKey: ["hevy-custom-exercises"],
        queryFn: () => getHevyCustomExercises(user, hevyApiKey),
        enabled: !!user && !!hevyApiKey,
    });
};

/**
 * Fetches a paginated list of blog posts.
 *
 * @param limit - Maximum number of posts to fetch
 * @param offset - Pagination offset
 */
export const useBlogs = (limit: number, offset: number) => {
    return useQuery({
        queryKey: [ 'blogs', limit, offset ],
        queryFn: () => getBlogs(limit, offset),
    });
};

/**
 * Resolves a user's full name from either a user ID or a program ID.
 *
 * @param id - A user UUID or numeric program ID
 * @param id_type - Whether `id` refers to a "program" or a "user"
 */
export const useUserFullName = (id: string | number | undefined, id_type: "program" | "user") => {
    return useQuery({
        queryKey: ["full-name", id, id_type],
        queryFn: () => getUserFullName(id, id_type),
        enabled: !!id,
    });
};

/**
 * Fetches explore-page programs with optional filters and pagination.
 *
 * @param filters - Optional filter criteria (equipment, specialization, etc.)
 * @param limit - Maximum number of programs to return
 * @param offset - Pagination offset
 */
export const useExplorePagePrograms = (filters?: TProgramFilters, limit?: number, offset?: number) => {
    return useQuery({
        queryKey: ['explore-page-programs', filters, offset],
        queryFn: () => getExplorePagePrograms(filters, limit, offset),
    });
};
/**
 * Fetches programs for the programs page, including thumbnails.
 *
 * @param limit - Optional cap on the number of programs returned
 * @param is_coach - When true, only coach-created programs are returned
 * @param options - Additional query options (e.g. `enabled`)
 */
export const usePrograms = (limit?: number, is_coach?: boolean, options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: ['programs', is_coach],
        queryFn: () => getPrograms(limit, is_coach),
        enabled: options?.enabled ?? true,
    });
};

/**
 * Fetches the authenticated user's subscribed/saved programs.
 *
 * @param user - The Supabase auth user (query disabled when null)
 */
export const useSubscribedPrograms = (user: User | undefined | null) => {
    return useQuery({
        queryKey: ['subscribed-programs', user?.id],
        queryFn: () => getSubscribedPrograms(user!),
        enabled: !!user,
    });
};

/**
 * Calls the internal `/api/hevy/exercise-history` route for backup-based stall analysis.
 */
async function fetchExerciseStallsData({ signal }: QueryFunctionContext): Promise<TExerciseStallResult[]> {
    const res = await fetch("/api/hevy/exercise-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        credentials: "same-origin",
        signal,
    });
    if (res.status === 503) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(
            typeof payload?.message === "string" ? payload.message : "Workout history sync failed",
        );
    }
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
}

/** Backup-based exercise stall analysis. Cached 15m; no Hevy fan-out. */
export const useExerciseStallsAnalysis = (
    user: User | undefined | null,
    enabled = true,
) => {
    return useQuery({
        queryKey: ["exercise-stalls-analysis", user?.id, "v7"],
        queryFn: fetchExerciseStallsData,
        enabled: !!user && enabled,
        staleTime: 15 * 60 * 1000,
        gcTime: 60 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
    });
};

// BUILD AN AI PROGRAM
// export const useBuildAiProgram = (request: TTextToJsonRequest, shareId: string, resume: string) => {
//     return useQuery({
//         queryKey: ['ai-program', JSON.stringify(request)],
//         queryFn: () => buildAiProgram(request),
//         enabled: !!request && shareId === "" && resume === "",
//         refetchOnWindowFocus: false,
//         retry: false,
//     });
// };

// FETCHES A SHARED PROGRAM BY SHARE ID
// export const useSharedProgram = (shareId: string, resume: string) => {
//     return useQuery({
//         queryKey: ['shared-program', shareId],
//         queryFn: () => getSharedProgram(shareId),
//         enabled: shareId.length > 0 && resume === "",
//     });
// };

/**
 * Fetches all unique community-shared AI-generated programs (de-duplicated by prompt).
 */
export const useCommunityAiPrograms = () => {
    return useQuery({
        queryKey: ['community-ai-programs'],
        queryFn: () => getCommunityAiPrograms(),
    });
};

/**
 * Paginated variant of community AI programs, sorted by save count.
 *
 * @param limit - Page size (default 20)
 * @param offset - Pagination offset (default 0)
 */
export const useCommunityAiProgramsPaginated = (limit: number = 20, offset: number = 0) => {
    return useQuery({
        queryKey: ['community-ai-programs-paginated', limit, offset],
        queryFn: () => getCommunityAiProgramsPaginated(limit, offset),
    });
};

/**
 * Fetches a user's public metadata (name, username, bio) by their UUID.
 *
 * @param id - The user's UUID
 */
export const useUserMetadata = (id: string) => {
    return useQuery({
        queryKey: ['user-metadata', id],
        queryFn: () => getUserMetaData(id),
        enabled: !!id,
    });
};

/**
 * Fetches the follower list for the current user's profile (for count and list).
 *
 * @param id - The user's UUID
 * @param user - The authenticated user (query disabled when null)
 */
export const useFollowersMyProfile = (id: string, user: User | undefined | null) => {
    return useQuery({
        queryKey: ['followers-my-profile', id],
        queryFn: () => getFollowers(id),
        enabled: !!user,
    });
};

/**
 * Fetches the following list for the current user's profile (for count and list).
 *
 * @param id - The user's UUID
 * @param user - The authenticated user (query disabled when null)
 */
export const useFollowingMyProfile = (id: string, user: User | undefined | null) => {
    return useQuery({
        queryKey: ['following-my-profile', id],
        queryFn: () => getFollowing(id),
        enabled: !!user,
    });
};

/**
 * Fetches a chat history by chat ID.
 *
 * @param user - The authenticated user
 * @param chatId - The chat ID
 * @param options.enabled - When false, skips fetch (e.g. until send-time insert confirms — Sub-plan 2 gate)
 */
export const useChatHistory = (
    user: User | undefined | null,
    chatId: string,
    options?: { enabled?: boolean },
) => {
    const gateEnabled = options?.enabled ?? true;
    return useQuery({
        queryKey: ['chat-history', user?.id, chatId],
        queryFn: () => getChatHistoryById(user, chatId),
        enabled: !!user && !!chatId && gateEnabled,
    });
};

/**
 * Fetches the chat IDs for the authenticated user.
 *
 * @param user - The authenticated user
 */
export const useChatIds = (user: User | undefined | null) => {
    return useQuery({
        queryKey: ['chat-ids', user?.id],
        queryFn: () => getChatIds(user),
        enabled: !!user,
    });
};

/**
 * Fetches a single program's metadata by its numeric ID.
 *
 * @param program_id - The program's primary key
 */
export const useProgramById = (program_id: number) => {
    return useQuery({
        queryKey: ['program', program_id],
        queryFn: () => getProgramByID(program_id),
        enabled: !!program_id,
    });
};

/**
 * Fetches a program's thumbnail image blob by program ID.
 *
 * @param id - The program's primary key
 */
export const useProgramThumbnail = (id: number) => {
    return useQuery({
        queryKey: ["program-thumbnail", id],
        queryFn: () => getProgramThumbnailByID(id),
        enabled: !!id,
    });
};

/**
 * Fetches a user's profile picture blob by their UUID.
 *
 * @param id - The user's UUID
 */
export const useProfilePictureByID = (id: string) => {
    return useQuery({
        queryKey: ["profile-picture", id],
        queryFn: () => getProfilePicByID(id),
        enabled: !!id,
    });
};

/**
 * Batch-fetches public user data (name + profile picture) for multiple user IDs.
 * De-duplicates and sorts IDs to produce a stable query key, and caches results
 * for 5 minutes to reduce redundant requests.
 *
 * @param userIds - Array of user UUIDs to look up
 */
export const useUsersBatch = (userIds: string[]) => {
    // Remove duplicates and filter out invalid IDs
    const uniqueUserIds = Array.from(new Set(userIds.filter(id => id && id.length > 0)));
    const sortedIds = uniqueUserIds.sort().join(',');

    return useQuery({
        queryKey: ["users-batch", sortedIds],
        queryFn: () => getUsersBatch(uniqueUserIds),
        enabled: uniqueUserIds.length > 0,
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
        gcTime: 10 * 60 * 1000, // Garbage collect cache after 10 minutes
    });
};

/**
 * Fetches the global exercise library from the Proxima Supabase mirror of Hevy templates.
 */
export const useHevyExercises = (enabled = true) => {
    return useQuery({
        queryKey: ["hevy-exercises"],
        queryFn: () => getHevyExercises(),
        enabled,
    });
};

/**
 * Fetches an exercise animation (GIF) or still image at the requested resolution.
 *
 * @param gif_id - Unique identifier for the exercise media asset
 * @param resolution - Pixel width of the requested media ("180" or "360")
 * @param file_type - Whether to fetch a GIF animation or a JPG still
 * @param exercise_name - Used as part of the query key for cache isolation
 */
export const useExerciseGif = (gif_id: string | undefined, resolution: "180" | "360", file_type: "gif" | "jpg", exercise_name: string) => {
    return useQuery({
        queryKey: [ "exercise-gif", exercise_name, gif_id, resolution, file_type ],
        queryFn: () => getExerciseGif(gif_id, resolution, file_type),
        enabled: !!gif_id,
    });
};

/**
 * Fetches the authenticated user's Hevy API key from secure storage.
 *
 * @param user - The Supabase auth user (query disabled when null)
 */
export const useHevySecret = (user: User | undefined | null) => {
    return useQuery({
        queryKey: ["hevy_api_key"],
        queryFn: () => getHevyApiKey(user),
        enabled: !!user,
    });
};

/**
 * Fetches the current user's feature limits (export cap, LLM request cap),
 * falling back to anonymous localStorage limits when not logged in.
 *
 * @param user - The Supabase auth user, or null for anonymous access
 */
export const useMyFeatureLimits = (user: User | undefined | null) => {
    return useQuery({
        queryKey: ["feature-limits", user?.id],
        queryFn: () => getMyFeatureLimits(user),
    });
};

/**
 * Fetches the current user's bolao predictor daily limit (1/day; unlimited for test users).
 *
 * @param user - The Supabase auth user; query disabled when null
 */
export const useBolaoPredictorLimits = (user: User | undefined | null) => {
    return useQuery({
        queryKey: ["bolao-predictor-limits", user?.id],
        queryFn: () => getBolaoPredictorLimits(user),
        enabled: !!user,
    });
};

/**
 * Fetches one backed-up logged workout for the detail page.
 *
 * @param user - Authenticated user (query disabled when null)
 * @param workoutId - Proxima backup workout UUID
 */
export const useWorkoutDetail = (user: User | undefined | null, workoutId: string) => {
    return useQuery({
        queryKey: ["workout-detail", user?.id, workoutId],
        queryFn: ({ signal }) => getLoggedWorkoutDetail(workoutId, signal),
        enabled: !!user && !!workoutId,
        retry: (failureCount, error) => {
            if (error instanceof WorkoutNotFoundError) {
                return false;
            }
            return failureCount < 2;
        },
    });
};

/**
 * Cursor-paginated browse feed of logged workout previews for the profile section.
 *
 * @param user - Authenticated user (query disabled when null)
 * @param enabled - When false, skips fetch (e.g. Hevy not connected)
 */
export const useLoggedWorkoutBrowse = (user: User | undefined | null, enabled: boolean) => {
    return useInfiniteQuery({
        queryKey: [...LOGGED_WORKOUT_BROWSE_QUERY_KEY, user?.id],
        queryFn: ({ pageParam, signal }) =>
            getLoggedWorkoutPreviews({ cursor: pageParam ?? null }, signal),
        initialPageParam: null as TWorkoutHistoryCursor | null,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        enabled: !!user && enabled,
    });
};

/**
 * Weekly Duration/Reps aggregates for the profile statistics chart.
 *
 * @param user - Authenticated user (query disabled when null)
 * @param enabled - When false, skips fetch (e.g. Hevy not connected)
 * @param weeks - Chart range: 4 or 12 Sunday-start weeks
 */
export const useProfileStatistics = (
    user: User | undefined | null,
    enabled: boolean,
    weeks: 4 | 12,
) => {
    return useQuery({
        queryKey: [...PROFILE_STATISTICS_QUERY_KEY, user?.id, weeks],
        queryFn: ({ signal }) => getProfileStatistics(weeks, signal),
        enabled: !!user && enabled,
        staleTime: 30_000,
    });
};

/**
 * Backed-up workouts for one profile calendar month.
 *
 * @param user - Authenticated user (query disabled when null)
 * @param enabled - When false, skips fetch
 * @param year - Visible calendar year
 * @param month - Visible calendar month (1–12)
 */
export const useProfileCalendar = (
    user: User | undefined | null,
    enabled: boolean,
    year: number,
    month: number,
) => {
    const timezoneOffsetMinutes = new Date().getTimezoneOffset();

    return useQuery({
        queryKey: [...PROFILE_CALENDAR_QUERY_KEY, user?.id, year, month, timezoneOffsetMinutes],
        queryFn: ({ signal }) =>
            getProfileCalendarWorkouts({ year, month, timezoneOffsetMinutes }, signal),
        enabled: !!user && enabled,
        staleTime: 30_000,
    });
};


/* ================================
   SERVER-SIDE RENDERED HOOKS
   ================================ */

/**
 * Server-side prefetch of a program and its full schedule, composed into
 * a `TProgramPage` object for the program detail page.
 *
 * @param program_id - The program's primary key
 * @returns A combined program + schedule object, or undefined if not found
 */
export const useProgramByIdSSR = async (program_id: number) => {
    const [program, schedule] = await Promise.all([
        getProgramByID(program_id),
        getExplorePageProgramDetails(program_id),
    ]);

    if (!schedule) {
        return undefined;
    }

    const programOverview: TProgramPage = {
        program: program ?? [],
        schedule: schedule,
    };
    return programOverview;
};

/**
 * Server-side variant of `useUserFullName`. Directly returns the promise.
 *
 * @param id - A user UUID or program ID
 * @param id_type - Whether `id` refers to a "program" or a "user"
 */
export const useUserFullNameSSR = (id: string | number, id_type: "program" | "user") => {
    return getUserFullName(id, id_type);
};

/**
 * Server-side variant of `useUserMetadata`. Directly returns the promise.
 *
 * @param id - The user's UUID
 */
export const useUserMetadataSSR = (id: string) => {
    return getUserMetaData(id);
};

/**
 * Server-side fetch of the original poster's metadata for a program.
 * Resolves the user_id from the program first, then fetches their metadata.
 *
 * @param id - The program ID (string) whose creator to look up
 * @returns The creator's user details, or a default anonymous object
 */
export const useOpUserMetadataSSR = async (id: string) => {
    const userId = await getOpUserId(id);
    if (!userId) {
         console.error("User ID not found");
         return ANONYMOUS_USER_METADATA;
    }

    const meta = await getUserMetaData(userId);
    return meta ?? ANONYMOUS_USER_METADATA;
};

// // FETCHES THE USER ID OF THE OP OF A WORKOUT PROGRAM
// export const useProgramOpUserId = (program_id: number) => {
//     return getOpUserId(program_id);
// };

// export const useOpProfilePictureByIdSSR = async (id: string) => {
//     const userId = await getOpUserId(id);
//     if (!userId) {
//         console.error("User ID not found");
//         return null;
//     }
//     return await getProfilePicByID(userId);
// };
/**
 * Server-side fetch of a single blog post by its string ID.
 *
 * @param id - The blog post ID (converted to number internally)
 * @returns The blog object cast to TBlog
 */
export const useBlogByIdSSR = async (id: string) => {
    const blog = await getBlogById(Number(id));
    if (!blog) {
        console.error("Blog not found");
    }
    return blog as unknown as TBlog;
};

/**
 * Server-side fetch of all blog posts with resolved cover images.
 *
 * @returns An array of blog objects with image URLs
 */
export const useBlogsSSR = async () => {
    const blogsWithImage = await getBlogs();
    return blogsWithImage as TBlog[];
};

// export const useProgramsSSR = async () => {
//     const programs = await getExplorePagePrograms(42);

//     if (!programs) {
//         console.error("Programs not found");
//     }

//     const programsWithThumbnails = await Promise.all(
//         programs.map( async (program) => {
//             const thumbnail = await getProgramThumbnailByID(program.id);
//             return {...program, thumbnail};
//         }),
//     );

//     return programsWithThumbnails as TProgram[];
// };
