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
export const getUserFullName = async (id: string | number | undefined, id_type: "program" | "user") => {
    if (id_type === "program") {
        try {

            if (!id) {
                return "Anonymous";
            }

            // Convert to string for database query (programs.id is a string in DB)
            const programId = typeof id === 'string' ? id : id.toString();

            const { data: userId, error: userIdError } = await
                supabase.from("programs").
                select("user_id").
                eq("id", programId);

            if (userIdError) {
                console.error("Error fetching users userID", userIdError);
            }

            if (userId && userId.length > 0) {
                const { data: fullName, error: fullNameError } = await
                    supabase.from("users").
                    select("first_name,last_name").
                    eq("id",userId[0].user_id);

                if (fullNameError) {
                    return "Anonymous";
                } else {
                    if (fullName && fullName.length > 0 && fullName[0].first_name && fullName[0].last_name && fullName[0].first_name !== null && fullName[0].last_name !== null) {
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
            if (!id) {
                return "Anonymous";
            }

            // Convert to string for database query (users.id is a string UUID in DB)
            const userId = typeof id === 'string' ? id : id.toString();

            const { data: fullName, error: fullNameError } = await supabase.
            from("users")
            .select("first_name,last_name")
            .eq("id", userId);

            if (fullNameError) {
                console.error('Error fetching users full name:', fullNameError);
                return "Anonymous";
            } else {
                if (fullName && fullName.length > 0 && fullName[0].first_name && fullName[0].last_name && fullName[0].first_name !== null && fullName[0].last_name !== null) {
                    return fullName[0].first_name + " " + fullName[0].last_name;
                } else {
                    return "Anonymous";
                }
            }
        } catch (error) {
            console.error("Error fetching users full name", error);
            return "Anonymous";
        }
    }
    
    return "Anonymous";
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

/**
 * GETS USER METADATA AND PROFILE PICTURES FOR MULTIPLE USERS IN BATCH
 *
 * PII EXPOSURE POLICY:
 * - ONLY exposes: first_name, last_name (combined as fullName), and profile pictures
 * - DOES NOT expose: email, username, bio, created_at, or any other PII
 * - Returns "Anonymous" if name data is missing or null
 * - Profile pictures are user-uploaded content (users consent by uploading)
 *
 * SECURITY SAFEGUARDS:
 * - Explicit field selection (only id, first_name, last_name)
 * - Input validation (filters invalid/empty IDs)
 * - No PII in error logs (only user IDs, never names/emails)
 * - Returns empty object on any error (fail-safe)
 */
export const getUsersBatch = async (userIds: string[]): Promise<Record<string, { fullName: string; profilePic: Blob | null }>> => {
    try {
        // Input validation: Remove duplicates and filter out invalid IDs
        // Only allow UUID-like strings (basic validation to prevent injection)
        const uniqueUserIds = Array.from(new Set(
            userIds.filter(id =>
                id &&
                typeof id === 'string' &&
                id.length > 0 &&
                id.length <= 100 && // Reasonable UUID length limit
                /^[a-zA-Z0-9\-_]+$/.test(id) // Only alphanumeric, hyphens, underscores
            )
        ));

        if (uniqueUserIds.length === 0) {
            return {};
        }

        // Limit batch size to prevent abuse (max 100 users per request)
        const limitedUserIds = uniqueUserIds.slice(0, 100);

        // EXPLICIT FIELD SELECTION: Only select id, first_name, last_name
        // DO NOT select: email, username, bio, created_at, or any other fields
        const { data: usersData, error: usersError } = await supabase
            .from("users")
            .select("id, first_name, last_name") // Explicitly limited fields
            .in("id", limitedUserIds);

        if (usersError) {
            // Log error without exposing PII (only log error type, not user data)
            console.error('Error fetching users batch metadata:', usersError.message);
            return {};
        }

        // Create a map of user data with default anonymous values
        const userDataMap: Record<string, { fullName: string; profilePic: Blob | null }> = {};

        // Initialize all requested users with default anonymous values
        limitedUserIds.forEach(id => {
            userDataMap[id] = { fullName: "Anonymous", profilePic: null };
        });

        // Process user metadata with PII sanitization
        if (usersData && usersData.length > 0) {
            const profilePicPromises = usersData.map(async (user) => {
                // Sanitize name data: Only combine if both fields exist and are non-empty
                // Default to "Anonymous" if any name data is missing
                let fullName = "Anonymous";
                if (user.first_name && user.last_name &&
                    typeof user.first_name === 'string' &&
                    typeof user.last_name === 'string' &&
                    user.first_name.trim().length > 0 &&
                    user.last_name.trim().length > 0) {
                    // Trim and sanitize names (remove extra whitespace)
                    fullName = `${user.first_name.trim()} ${user.last_name.trim()}`;
                }

                // Fetch profile picture for this user (user-uploaded, consent implied)
                let profilePic: Blob | null = null;
                try {
                    // Validate user.id before using in storage path
                    if (user.id && typeof user.id === 'string' && /^[a-zA-Z0-9\-_]+$/.test(user.id)) {
                        const { data: profilePicData, error: profilePicError } = await supabase.storage
                            .from('profile_pictures')
                            .list(user.id, { limit: 1, sortBy: { column: 'name', order: 'asc' } });

                        if (!profilePicError && profilePicData && profilePicData.length > 0) {
                            const fileName = profilePicData[0].name;
                            // Additional validation on filename
                            if (fileName && typeof fileName === 'string' && fileName.length < 255) {
                                const { data: picData, error: downloadError } = await supabase.storage
                                    .from('profile_pictures')
                                    .download(`${user.id}/${fileName}`);

                                if (!downloadError && picData) {
                                    profilePic = picData;
                                }
                            }
                        }
                    }
                } catch (error) {
                    // Silently fail for profile pictures - not critical
                    // Log without exposing user ID or PII
                    console.error('Error fetching profile picture (user ID redacted):', error instanceof Error ? error.message : 'Unknown error');
                }

                return { userId: user.id, fullName, profilePic };
            });

            const results = await Promise.all(profilePicPromises);
            results.forEach(({ userId, fullName, profilePic }) => {
                // Only set data if userId is valid
                if (userId && typeof userId === 'string') {
                    userDataMap[userId] = { fullName, profilePic };
                }
            });
        }

        return userDataMap;
    } catch (error) {
        // Fail-safe: Return empty object on any error
        // Log error without exposing any PII
        console.error("Error fetching users batch (no PII exposed):", error instanceof Error ? error.message : 'Unknown error');
        return {};
    }
};
