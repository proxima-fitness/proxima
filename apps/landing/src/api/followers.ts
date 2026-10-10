/**
 * @module api/followers
 *
 * Follower/following data: fetches followers and following for a user with
 * blocked-users exclusion. Used by profile hero for counts and (future) list views.
 *
 * Depends on: . (supabase client)
 * Used by: api/hooks.ts, ProfileHero
 */
import { supabase } from ".";


/**
 * Get list of user IDs blocked by the given user.
 *
 * @param userId - The user whose blocked list to fetch
 * @returns Array of { blocked_id }
 */
export const getBlockedUsers = async (userId: string): Promise<TBlockedUserRow[]> => {
    const { data, error } = await supabase
        .from("blocked_users")
        .select("blocked_id")
        .eq("user_id", userId);

    if (error) {
        console.error("Error fetching blocked users:", error);
        return [];
    }
    return (data ?? []).filter((row): row is TBlockedUserRow => row.blocked_id != null);
};

/**
 * Get all followers of a user (people who follow this user), excluding blocked users.
 *
 * @param userId - The user's id
 * @returns Array of follower rows with nested user info
 */
export const getFollowers = async (userId: string): Promise<TFollowersRow[]> => {
    try {
        const blockedRows = await getBlockedUsers(userId);
        const blocked_ids = blockedRows.map((u) => u.blocked_id).filter(Boolean) as string[];

        let query = supabase
            .from("followers")
            .select(`follower_id, users:follower_id (first_name, last_name, email)`)
            .eq("following_id", userId);

        if (blocked_ids.length > 0) {
            query = query.not("follower_id", "in", `(${blocked_ids.join(",")})`);
        }

        const { data: followers, error } = await query.returns<TFollowersRow[]>();

        if (error) {
            console.error("Error fetching followers:", error);
            return [];
        }
        return followers ?? [];
    } catch (error) {
        console.error("Error fetching followers:", error);
        return [];
    }
};

/**
 * Get all users the given user is following, excluding blocked users.
 *
 * @param userId - The user's id
 * @returns Array of following rows with nested user info
 */
export const getFollowing = async (userId: string): Promise<TFollowingRow[]> => {
    try {
        const blockedRows = await getBlockedUsers(userId);
        const blocked_ids = blockedRows.map((u) => u.blocked_id).filter(Boolean) as string[];

        let query = supabase
            .from("followers")
            .select(`following_id, users:following_id (first_name, last_name, email)`)
            .eq("follower_id", userId);

        if (blocked_ids.length > 0) {
            query = query.not("following_id", "in", `(${blocked_ids.join(",")})`);
        }

        const { data: following, error } = await query.returns<TFollowingRow[]>();

        if (error) {
            console.error("Error fetching users you follow:", error);
            return [];
        }
        return following ?? [];
    } catch (error) {
        console.error("Error fetching users you follow:", error);
        return [];
    }
};
