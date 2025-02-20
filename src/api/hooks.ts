// USE OF REACT QUERY IS STRICTLY CLIENT-SIDE, USE SUPABASE SSR FOR SERVER SIDE
import { useQuery } from "@tanstack/react-query";
import { getBlogById, getBlogs } from "./blog";
import { getExplorePageProgramDetails, getExplorePagePrograms, getProgramByID, getPrograms, getProgramThumbnailByID } from "./programs";
import { getUserFullName } from "./users";

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
export const useExplorePagePrograms = (limit?: number) => {
    return useQuery({
        queryKey: ['explore-page-programs'],
        queryFn: () => getExplorePagePrograms(limit),
    });
};

// FETCHES THE PROGRAM NAMES DISPLAYED ON THE PROGRAMS PAGE WITH THUMBNAILS
export const usePrograms = (limit?: number) => {
    return useQuery({
        queryKey: ['programs'],
        queryFn: () => getPrograms(limit),
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


/*********************************/
/** SERVER SIDE RENDERED HOOKS **/
/*********************************/

// FETCHES A PROGRAM BY PROGRAM ID USING SSR
export const useProgramByIdSSR = async (program_id: string) => {

    const programOverview: TProgramPage = {
        program: await getProgramByID(program_id),
        thumbnail: await getProgramThumbnailByID(program_id),
        schedule: await getExplorePageProgramDetails(program_id),
    }

    return programOverview;
};

// FETCHES THE FULL NAME OF A USER BY ID USING SSR
export const useUserFullNameSSR = (id: string, id_type: "program" | "user") => {
    const fullName = getUserFullName(id, id_type);
    return fullName;
};


// GET BLOG BY ID
export const useBlogByIdSSR = async (id: string) => {
    const blog = await getBlogById(Number(id));
    return blog;
}

// GET ALL BLOGS USING SSR
export const useBlogsSSR = async () => {
    const blogsWithImage = await getBlogs();
    return blogsWithImage as TBlog[];
};

export const useProgramsSSR = async () => {
    const programs = await getExplorePagePrograms(42);

    const programsWithThumbnails = await Promise.all(
        programs.map( async (program) => {
            const thumbnail = await getProgramThumbnailByID(program.id);
            return {...program, thumbnail};
        })
    );

    return programsWithThumbnails as TProgram[];
}
