// USE OF REACT QUERY IS STRICTLY CLIENT-SIDE, USE SUPABASE SSR FOR SERVER SIDE
import { useQuery } from "@tanstack/react-query";
import { getBlogById, getBlogs } from "./blog";
import { getCommunityAiPrograms, getCommunityAiProgramsPaginated, getExplorePageProgramDetails, getExplorePagePrograms, getProgramByID, getPrograms, getProgramThumbnailByID, getSubscribedPrograms } from "./programs";
import { getOpUserId, getUserFullName, getUserMetaData, getUsersBatch } from "./users";
import { getExerciseGif, getProfilePicByID } from "./storage";
import { getHevyApiKey, getHevyCustomExercises, getHevyExercises, getHevyPrograms, getHevyRoutines } from "../components/program-builder/api/hevy";
import { buildAiProgram } from "./edge-functions";
import { User } from "@supabase/supabase-js";

/*********************************/
/** CLIENT SIDE RENDERED HOOKS **/
/*********************************/

// FETCHES THE HEVY PROGRAMS
export const useHevyPrograms = (user: User | undefined | null, hevyApiKey: string) => {
    return useQuery({
        queryKey: ["hevy-programs"],
        queryFn: () => getHevyPrograms(user, hevyApiKey),
        enabled: !!user && !!hevyApiKey,
    });
};
// FETCHES THE HEVY ROUTINES
export const useHevyRoutines = (user: User | undefined | null, hevyApiKey: string) => {
    return useQuery({
        queryKey: ["hevy-routines"],
        queryFn: () => getHevyRoutines(user, hevyApiKey),
        enabled: !!user && !!hevyApiKey,
    });
};

// FETCHES THE HEVY CUSTOM EXERCISES
export const useHevyCustomExercises = (user: User | undefined | null, hevyApiKey: string) => {
    return useQuery({
        queryKey: ["hevy-custom-exercises"],
        queryFn: () => getHevyCustomExercises(user, hevyApiKey),
        enabled: !!user && !!hevyApiKey,
    });
};

// GET ALL BLOGS
export const useBlogs = (limit: number, offset: number) => {
    return useQuery({
        queryKey: [ 'blogs', limit, offset ],
        queryFn: () => getBlogs(limit, offset),
    });
};

// FETCHES THE FULL NAME OF A USER BY ID
export const useUserFullName = (id: string | undefined, id_type: "program" | "user") => {
    return useQuery({
        queryKey: ["full-name", id, id_type],
        queryFn: () => getUserFullName(id, id_type),
        enabled: !!id,
    });
};

// FETCHES THE PROGRAM NAMES DISPLAYED ON THE EXPLORE PAGE
export const useExplorePagePrograms = (filters?: TProgramFilters, limit?: number, offset?: number) => {
    return useQuery({
        queryKey: ['explore-page-programs', filters, offset],
        queryFn: () => getExplorePagePrograms(filters, limit, offset),
    });
};
// FETCHES THE PROGRAM NAMES DISPLAYED ON THE PROGRAMS PAGE WITH THUMBNAILS
export const usePrograms = (limit?: number) => {
    return useQuery({
        queryKey: ['programs'],
        queryFn: () => getPrograms(limit),
    });
};

// FETCHES USER'S SUBSCRIBED/SAVED PROGRAMS
export const useSubscribedPrograms = (user: User | undefined | null) => {
    return useQuery({
        queryKey: ['subscribed-programs', user?.id],
        queryFn: () => getSubscribedPrograms(user!),
        enabled: !!user,
    });
};

// BUILD AN AI PROGRAM
export const useBuildAiProgram = (request: TTextToJsonRequest, shareId: string, resume: string) => {
    return useQuery({
        queryKey: ['ai-program', JSON.stringify(request)],
        queryFn: () => buildAiProgram(request),
        enabled: !!request && shareId === "" && resume === "",
        refetchOnWindowFocus: false,
        retry: false,
    });
};

// FETCHES A SHARED PROGRAM BY SHARE ID
// export const useSharedProgram = (shareId: string, resume: string) => {
//     return useQuery({
//         queryKey: ['shared-program', shareId],
//         queryFn: () => getSharedProgram(shareId),
//         enabled: shareId.length > 0 && resume === "",
//     });
// };

export const useCommunityAiPrograms = () => {
    return useQuery({
        queryKey: ['community-ai-programs'],
        queryFn: () => getCommunityAiPrograms(),
    });
};

export const useCommunityAiProgramsPaginated = (limit: number = 20, offset: number = 0) => {
    return useQuery({
        queryKey: ['community-ai-programs-paginated', limit, offset],
        queryFn: () => getCommunityAiProgramsPaginated(limit, offset),
    });
};

// FETCHES THE USER METADATA BY AN ID
export const useUserMetadata = (id: string) => {
    return useQuery({
        queryKey: ['user-metadata', id],
        queryFn: () => getUserMetaData(id),
        enabled: !!id,
    });
};

// FETCHES A PROGRAM BY PROGRAM ID
export const useProgramById = (program_id: string) => {
    return useQuery({
        queryKey: ['program', program_id],
        queryFn: () => getProgramByID(program_id),
    });
};

// FETCHES A PROGRAM THUMBNAIL BY ID
export const useProgramThumbnail = (id: string) => {
    return useQuery({
        queryKey: ["program-thumbnail", id],
        queryFn: () => getProgramThumbnailByID(id),
    });
};

// FETCHES A PROFILE PICTURE BY ID
export const useProfilePictureByID = (id: string) => {
    return useQuery({
        queryKey: ["profile-picture", id],
        queryFn: () => getProfilePicByID(id),
        enabled: !!id,
    });
};

// FETCHES USER DATA FOR MULTIPLE USERS IN BATCH
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

// FETCH EXERCISES FROM THE HEVY APP
export const useHevyExercises = () => {
    return useQuery({
        queryKey: ["hevy-exercises"],
        queryFn: () => getHevyExercises(),
    });
};

// FETCHES EITHER A GIF OR IMG AT A PARTICULAR RESOLUTION FROM STORAGE BUCKET FOR AN EXERCISE
export const useExerciseGif = (gif_id: string | undefined, resolution: "180" | "360", file_type: "gif" | "jpg", exercise_name: string) => {
    return useQuery({
        queryKey: [ "exercise-gif", exercise_name, gif_id, resolution, file_type ],
        queryFn: () => getExerciseGif(gif_id, resolution, file_type),
        enabled: !!gif_id,
    });
};

// FETCHES THE HEVY API KEY FOR A USER
export const useHevySecret = (user: User | undefined | null) => {
    return useQuery({
        queryKey: ["hevy_api_key"],
        queryFn: () => getHevyApiKey(user),
        enabled: !!user,
    });
};


/*********************************/
/** SERVER SIDE RENDERED HOOKS **/
/*********************************/

// FETCHES A PROGRAM BY PROGRAM ID USING SSR
export const useProgramByIdSSR = async (program_id: string) => {

    const program = await getProgramByID(program_id) ?? [];
    const schedule = await getExplorePageProgramDetails(program_id);
    if (!schedule) {
        return undefined;
    }
    const programOverview: TProgramPage = {
        program: program,
        schedule: schedule,
    };
    return programOverview;
};

// FETCHES THE FULL NAME OF A USER BY ID USING SSR
export const useUserFullNameSSR = (id: string, id_type: "program" | "user") => {
    return getUserFullName(id, id_type);
};

// FETCHES THE USER METADATA BY ID USING SSR
export const useUserMetadataSSR = (id: string) => {
    return getUserMetaData(id);
};

// FETCHES THE OP USER METADATA BY ID USING SSR
export const useOpUserMetadataSSR = async (id: string) => {
    const userId = await getOpUserId(id);
    if (!userId) {
         console.error("User ID not found");
         return { first_name: "Anonymous", last_name: "", username: "anonymous", bio: "", created_at: "" };
    }

    return getUserMetaData(userId);
};

// FETCHES THE USER ID OF THE OP OF A WORKOUT PROGRAM
export const useProgramOpUserId = (program_id: string) => {
    return getOpUserId(program_id);
};

export const useOpProfilePictureByIdSSR = async (id: string) => {
    const userId = await getOpUserId(id);
    if (!userId) {
        console.error("User ID not found");
        return null;
    }
    return await getProfilePicByID(userId);
};
// GET BLOG BY ID
export const useBlogByIdSSR = async (id: string) => {
    const blog = await getBlogById(Number(id));
    if (!blog) {
        console.error("Blog not found");
    }
    return blog as unknown as TBlog;
};

// GET ALL BLOGS USING SSR
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
