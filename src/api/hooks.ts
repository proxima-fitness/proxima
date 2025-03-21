// USE OF REACT QUERY IS STRICTLY CLIENT-SIDE, USE SUPABASE SSR FOR SERVER SIDE
import { useQuery } from "@tanstack/react-query";
import { getBlogById, getBlogs } from "./blog";
import { getExplorePageProgramDetails, getExplorePagePrograms, getProgramByID, getPrograms, getProgramThumbnailByID } from "./programs";
import { getOpUserId, getUserFullName, getUserMetaData } from "./users";
import { getExerciseGif, getProfilePicByID } from "./storage";
import { getExercises } from "./exercises";
import { getHevyExercises } from "./hevy";
import { getExerciseGifIdForHevyExercise } from "@/utils/program-builder";
import { buildAiProgram } from "./edge-functions";

/*********************************/
/** CLIENT SIDE RENDERED HOOKS **/
/*********************************/

// GET ALL BLOGS
export const useBlogs = (limit: number, offset: number) => {
    return useQuery({
        queryKey: [ 'blogs', limit, offset ],
        queryFn: () => getBlogs(limit, offset),
    });
};

// FETCHES THE FULL NAME OF A USER BY ID
export const useUserFullName = (id: string, id_type: "program" | "user") => {
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

export const useBuildAiProgram = (request: TTextToJsonRequest, isHevy: boolean) => {
    return useQuery({
        queryKey: ['ai-program', isHevy, JSON.stringify(request)],
        queryFn: () => buildAiProgram(request, isHevy),
        enabled: !!request && isHevy !== undefined,
        refetchOnWindowFocus: false,
        retry: false,
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
    });
};

// FETCH EXERCISES
export const useExercises = () => {
    return useQuery({
        queryKey: ["existing-exercises"],
        queryFn: () => getExercises(),
    });
};

// FETCH EXERCISES FROM THE HEVY APP
export const useHevyExercises = () => {
    return useQuery({
        queryKey: ["hevy-exercises"],
        queryFn: () => getHevyExercises(),
    });
};

// FETCHES PROXIMA GIF ID TO BE USED ON HEVY EXERCISES
export const useExerciseGifId = (exercise_name: string) => {
    return useQuery({
        queryKey: [ "hevy-exercise-gif-id", exercise_name ],
        queryFn: () => getExerciseGifIdForHevyExercise(exercise_name),
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
        throw new Error("User ID not found");
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
        throw new Error("User ID not found");
    }
    return await getProfilePicByID(userId);
};
// GET BLOG BY ID
export const useBlogByIdSSR = async (id: string) => {
    const blog = await getBlogById(Number(id));
    if (!blog) {
        throw new Error("Blog not found");
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
//         throw new Error("Programs not found");
//     }

//     const programsWithThumbnails = await Promise.all(
//         programs.map( async (program) => {
//             const thumbnail = await getProgramThumbnailByID(program.id);
//             return {...program, thumbnail};
//         }),
//     );

//     return programsWithThumbnails as TProgram[];
// };
