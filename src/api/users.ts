import { supabase } from ".";


export const getOpUserId = async (program_id: string) => {
    try {
        const { data: userId, error: userIdError } = await supabase.
            from("programs")
            .select("user_id")
            .eq("id",program_id);

        if (userIdError) {
            console.error("Error fetching program creator user id",userIdError);
        } else {
            return userId[0].user_id as string;
        }
    } catch (error: unknown) {
        console.error("Error fetching program creator user id",error);
    }
};
// Gets the users full name
export const getUserFullName = async (id: string | undefined, id_type: "program" | "user") => {
    if (id_type === "program") {
        try {

            if (!id) {
                return "Anonymous";
            }

            const { data: userId, error: userIdError } = await
                supabase.from("programs").
                select("user_id").
                eq("id",id);

            if (userIdError) {
                console.error("Error fetching users userID", userIdError);
            }

            if (userId) {
                const { data: fullName, error: fullNameError } = await
                    supabase.from("users").
                    select("first_name,last_name").
                    eq("id",userId[0].user_id);

                if (fullNameError) {
                    return "Anonymous";
                } else {
                    if (fullName[0].first_name && fullName[0].last_name && fullName[0].first_name !== null && fullName[0].last_name !== null) {
                        return fullName[0].first_name + " " + fullName[0].last_name;
                    } else {
                        return "Anonymous";
                    }
                }
            }
        } catch (error: unknown) {
            console.error("Error fetching full name via program_id", error);
        }
    }
    else if (id_type === "user") {
        try {
            const { data: fullName, error: fullNameError } = await supabase.
            from("users")
            .select("first_name,last_name")
            .eq("id",id);

            if (fullNameError) {
                console.error('Error fetching users full name:', fullNameError);
            } else {
                if (fullName[0].first_name && fullName[0].last_name && fullName[0].first_name !== null && fullName[0].last_name !== null) {
                    return fullName[0].first_name + " " + fullName[0].last_name;
                } else {
                    return "Anonymous";
                }
            }
        } catch (error) {
            console.error("Error fetching users full name", error);
        }
    }
};

// GETS ALL USER METADATA
export const getUserMetaData = async (id: string) => {
    try {
        const { data: metaData, error: metaDataError } = await supabase.
        from("users")
        .select("first_name,last_name,username,bio,created_at")
        .eq("id",id);

        if (metaDataError) {
            console.error('Error fetching users metadata', metaDataError);
        } else {
           return metaData[0] as TUserDetails;
        }
    } catch (error) {
        console.error("Error fetching users metadata", error);
    }
};
