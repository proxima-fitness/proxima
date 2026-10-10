/**
 * @module api/authentication
 *
 * Provides all Supabase-backed authentication operations for the Proxima app:
 * email/password sign-up, sign-in, sign-out, and password reset/update flows.
 * Every auth call includes an hCaptcha token to prevent automated abuse.
 *
 * Depends on: ./index (supabase client)
 * Used by: sign-up/login pages, password-recovery flow, Navbar sign-out
 */
import { supabase } from ".";

/**
 * Registers a new user with email/password credentials.
 *
 * Conditionally includes first and/or last name in the user metadata
 * depending on which optional fields the caller supplies.
 *
 * @param email - The user's email address
 * @param password - The chosen password
 * @param captchaToken - hCaptcha verification token from the sign-up form
 * @param userName - Unique display username stored in auth metadata
 * @param firstName - Optional first name
 * @param lastName - Optional last name
 * @returns The Supabase user object on success, or an empty array on error
 */
export const signUpViaEmail = async (email: string, password: string, captchaToken: string, userName: string, firstName?: string, lastName?: string) => {
    if (firstName && lastName && firstName.length > 0 && lastName.length > 0) {
        try {
            const { data: user, error: userError } = await supabase.auth.signUp (
                {
                    email: email,
                    password: password,
                    options: {
                        captchaToken,
                        data: {
                            first_name: firstName,
                            last_name: lastName,
                            username: userName,
                        },
                    },
                },
            );
            if (userError) {
                console.error("Error signing up via email:", userError);
                return [];
            }
            return user;
        } catch (error: unknown) {
            console.error("Error signing up via email:", error);
        }
    } else if (firstName && firstName.length > 0) {
        try {
            const { data: user, error: userError } = await supabase.auth.signUp (
                {
                    email: email,
                    password: password,
                    options: {
                        captchaToken,
                        data: {
                            first_name: firstName,
                            username: userName,
                        },
                    },
                },
            );
            if (userError) {
                console.error("Error signing up via email:", userError);
                return [];
            }
            return user;
        } catch (error: unknown) {
            console.error("Error signing up via email:", error);
        }
    } else if (lastName && lastName.length > 0) {
        try {
            const { data: user, error: userError } = await supabase.auth.signUp (
                {
                    email: email,
                    password: password,
                    options: {
                        captchaToken,
                        data: {
                            last_name: lastName,
                            username: userName,
                        },
                    },
                },
            );
            if (userError) {
                console.error("Error signing up via email:", userError);
                return [];
            }
            return user;
        } catch (error: unknown) {
            console.error("Error signing up via email:", error);
        }
    } else {
        try {
            const { data: user, error: userError } = await supabase.auth.signUp (
                {
                    email: email,
                    password: password,
                    options: {
                        captchaToken,
                        data: {
                            username: userName,
                        },
                    },
                },
            );
            if (userError) {
                console.error("Error signing up via email:", userError);
                return [];
            }
            return user;
        } catch (error: unknown) {
            console.error("Error signing up via email:", error);
        }
    }
};

/**
 * Sends a password-reset email to the given address.
 *
 * @param email - The account email to send the reset link to
 * @param captchaToken - hCaptcha verification token
 * @returns A status object indicating success or containing the error
 */
export const resetPassword = async (email: string, captchaToken: string) => {
    try {
        await supabase.auth.resetPasswordForEmail(email, { captchaToken, redirectTo: 'https://app.proximafitness.com/password-recovery' });
        return { status: "success", data: "Reset password email sent successfully" };
    } catch (error: unknown) {
        console.error("Error resetting password:", error);
        return { status: "success", data: error};
    }
};

/**
 * Updates the currently authenticated user's password.
 *
 * Intended for use on the password-recovery page after the user follows the
 * reset link and has a valid session.
 *
 * @param new_password - The replacement password
 */
export const updatePassword = async (new_password: string) => {
    try {
        await supabase.auth.updateUser({ password: new_password });
    } catch (error: unknown) {
        console.error("Unable to update password",error);
    }
};

/**
 * Authenticates a user with email and password.
 *
 * @param email - The user's email address
 * @param password - The user's password
 * @param captchaToken - hCaptcha verification token from the login form
 * @returns The authenticated user/session object on success, or the error object on failure
 */
export const signInViaEmail = async (email: string, password: string, captchaToken: string) => {
    try {
        const { data: user, error: userError } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
            options: {
                captchaToken,
            },
        } );

        if (userError) {
            console.error("Error signing in via email:", userError);
            return userError;
        }
        return user;
    } catch (error: unknown) {
        console.error("Error signing in via email:", error);
    }
};

/**
 * Signs out the current user by refreshing the session (to ensure a valid
 * token) then calling Supabase sign-out.
 *
 * The session refresh before sign-out prevents edge cases where an expired
 * token causes the sign-out RPC to silently fail.
 */
export const signOutUser = async () => {
    const {  error: refreshError } = await supabase.auth.refreshSession();
    const { error: signOutError }  = await supabase.auth.signOut();

    if (refreshError) {
        console.error("refresh session error:",refreshError);
    }
    if (signOutError) {
        console.error("signOutUser fct return this response:", signOutError);
    }
};
