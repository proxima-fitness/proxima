/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from ".";

// SIGN UP A USER VIA EMAIL AND PASSWORD IN SUPABASE
export const signUpViaEmail = async (email: string, password: string, captchaToken: any, userName: string, firstName?: string, lastName?: string) => {
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

// RESET A PASSWORD IN SUPABASE
export const resetPassword = async (email: string, captchaToken: any) => {
    try {
        await supabase.auth.resetPasswordForEmail(email, { captchaToken, redirectTo: 'https://app.proximafitness.com/password-recovery' });
        return { status: "success", data: "Reset password email sent successfully" };
    } catch (error: unknown) {
        console.error("Error resetting password:", error);
        return { status: "success", data: error};
    }
};

// UPDATE A PASSWORD IN SUPABASE
export const updatePassword = async (new_password: string) => {
    try {
        await supabase.auth.updateUser({ password: new_password });
    } catch (error: unknown) {
        console.error("Unable to update password",error);
    }
};

// SIGN IN A USER VIA EMAIL AND PASSWORD
export const signInViaEmail = async (email: string, password: string, captchaToken: any) => {
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

// SIGN OUT USER AND REMOVE AUTH TOKEN, THEN REDIRECT USER TO LOGIN PAGE
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
