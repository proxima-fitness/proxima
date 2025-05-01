import { supabase } from ".";
import { User } from '@supabase/supabase-js';

/***** GET REQUESTS *****/

// CHECK IF A PROFILE PICTURE EXISTS IN USERS S3 STORAGE FOLDER (Profile Exists ?)
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
            return data[0]?.name || null;
        }
    } catch ( error: unknown) {
        console.error('Error checking program thumbnail exists',error);
        return [];
    }
};

// EXERCISE GIF
export const getExerciseGif = async (gif_id: string | undefined, resolution: "180" | "360", file_type: "jpg" | "gif") => {
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

// GET PROFILE PICTURE FOR A USER VIA UUID
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
    } catch (error: unknown) {
        console.error('Error fetching profile picture:', error);
        return [];
    }
};

// GET PUBLIC URL FOR IMAGE IN THE TMP BUCKET
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
