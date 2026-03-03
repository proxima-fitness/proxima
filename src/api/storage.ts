/**
 * @module api/storage
 *
 * Supabase Storage helpers for retrieving binary assets: profile pictures,
 * program thumbnails, exercise GIFs/images, and temporary uploads. Each
 * function either downloads a blob or resolves a public URL from the
 * appropriate storage bucket.
 *
 * Storage buckets used:
 * - `profile_pictures` — user avatar images, keyed by user UUID
 * - `programs` — program thumbnail images, keyed by program ID
 * - `exercises-new` — exercise animation GIFs and stills, keyed by gif_id
 * - `tmp` — temporary uploads (e.g. image-to-text pipeline)
 *
 * Depends on: ./index (supabase client), @supabase/supabase-js (User type)
 * Used by: hooks.ts, programs.ts, user profile components
 */
import { supabase } from ".";
import { User } from '@supabase/supabase-js';

/**
 * Checks whether a profile picture exists for a user and returns the filename
 * if found.
 *
 * @param user - Optional Supabase User object (ID is extracted from it)
 * @param id - Optional explicit user UUID; takes precedence over `user.id`
 * @returns The filename string, null if the folder is empty, or an empty array on error
 */
export const getProfilePictureStatus = async (user?: User, id?: string) => {

    const userID = id ?? user?.id;

    try {
        const { data, error } = await supabase.storage.from('profile_pictures').list(userID , {
            limit: 100,
            offset: 0,
            sortBy: { column: 'name', order: 'asc' },
        });
        if (error) {
            console.error('Error checking profile exists:', error);
            return null;
        } else {
            return data[0]?.name || null;
        }
    } catch ( error: unknown) {
        console.error('Error checking profile exists',error);
        return [];
    }
};

/**
 * Checks whether a thumbnail exists in the `programs` bucket for the given ID.
 *
 * @param id - The program ID (string form) used as the storage folder name
 * @returns The thumbnail filename, null if none, or an empty array on error
 */
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
            return data[0]?.name || null;
        }
    } catch ( error: unknown) {
        console.error('Error checking program thumbnail exists',error);
        return [];
    }
};


/**
 * Returns the public URL for an exercise animation or still image at the
 * requested resolution from the `exercises-new` bucket.
 *
 * @param gif_id - The exercise media asset identifier
 * @param resolution - Pixel width ("180" or "360")
 * @param file_type - "gif" for animation, "jpg" for a static frame
 * @returns The public URL string, or null if gif_id is missing
 */
export const getExerciseGif = async (gif_id: string | undefined, resolution: "180" | "360", file_type: "jpg" | "gif") => {
    let filePath = "";
    if (file_type === "jpg") {
        filePath = `${resolution}/${gif_id}/1.jpg`;
    } else if (file_type === "gif") {
        filePath = `${resolution}/${gif_id}/${gif_id}.gif`;
    }
    if (!gif_id || gif_id === "") return null;
    try {
        const { data } = supabase.storage.from('exercises-new').getPublicUrl(filePath);
        return data?.publicUrl ?? null;

    } catch (error: unknown) {
        console.error('Error fetching exercise GIF:', error);
        return null;
    }
};

/**
 * Downloads an exercise animation or still image as a blob (private variant).
 * Unlike {@link getExerciseGif}, this uses `download()` instead of `getPublicUrl()`
 * for buckets that aren't publicly readable.
 *
 * @param gif_id - The exercise media asset identifier
 * @param resolution - Pixel width ("180" or "360")
 * @param file_type - "gif" for animation, "jpg" for a static frame
 * @returns The downloaded Blob, or null on error/missing ID
 */
export const getPrivateExerciseGif = async (gif_id: string | undefined, resolution: "180" | "360", file_type: "jpg" | "gif") => {
    let filePath = "";
    if (file_type === "jpg") {
        filePath = `${resolution}/${gif_id}/1.jpg`;
    } else if (file_type === "gif") {
        filePath = `${resolution}/${gif_id}/${gif_id}.gif`;
    }
    if (!gif_id || gif_id === "") return null;
    try {
        const { data, error } = await supabase.storage.from('exercises-new').download(filePath);
        if (error) {
            console.error('Error fetching exercise GIF:', error);
            return null;
        } else {
            return data ?? null;
        }
    } catch (error: unknown) {
        console.error('Error fetching exercise GIF:', error);
        return null;
    }
};

/**
 * Downloads a user's profile picture blob by first resolving the filename
 * via {@link getProfilePictureStatus}.
 *
 * @param id - The user's UUID
 * @returns The profile picture as a Blob, or null if not found
 */
export const getProfilePicByID = async (id: string) => {
    try {
            const fileName = await getProfilePictureStatus(undefined, id);
            if (fileName !== null  && fileName.length > 0) {
                const { data, error } = await supabase.storage.from('profile_pictures').download(id + "/" + fileName);
                if (error) {
                    console.error('Error fetching profile picture:', error);
                    return null;
                } else {
                    return data || null;
                }
            }
            return null;
    } catch (error: unknown) {
        console.error('Error fetching profile picture:', error);
        return null;
    }
};

/**
 * Returns the public URL for a file in the `tmp` storage bucket (used for
 * short-lived uploads like image-to-text inputs).
 *
 * @param filePath - Path within the `tmp` bucket
 * @returns The public URL string, or undefined on error
 */
export const getTmpPublicUrl = (filePath: string) => {
    try {
        const { data: publicUrl } = supabase
            .storage
            .from('tmp')
            .getPublicUrl(filePath);

        return publicUrl.publicUrl;
    } catch (error: unknown) {
        console.error("Error attempting to get the public url", error);
    }
};
