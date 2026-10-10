// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module program-builder/utils/authentication
 *
 * Thin wrappers around the core authentication API (`@/api/authentication`)
 * that add client-side validation and toast notifications before delegating
 * to the underlying Supabase auth calls. Each handler guards against empty
 * fields and surfaces user-facing error messages via Sonner toasts.
 *
 * Depends on: @/api/authentication, next/navigation (AppRouterInstance), sonner
 * Used by: sign-up, sign-in, and password-reset form components
 */

import { resetPassword, signInViaEmail, signUpViaEmail } from "@/api/authentication";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { toast } from "sonner";

function isSignUpFailure(result: unknown): boolean {
    return !result || (Array.isArray(result) && result.length === 0);
}

/**
 * Validates sign-up form fields and creates a new account via email.
 * On success the user is redirected to the sign-up confirmation page.
 * Legal/optional consents are collected later via LegalAcceptanceDialog.
 *
 * @param email - The user's email address
 * @param password - Chosen password
 * @param confirmPassword - Must match `password` or a toast error is shown
 * @param userName - Unique display name for the account
 * @param turnstileToken - Cloudflare Turnstile CAPTCHA token for bot protection
 * @param firstName - User's first name
 * @param lastName - Optional last name
 * @param router - Next.js app router instance used for redirect on success
 */
export const handleSignUpViaEmail = async (
        email: string,
        password: string,
        confirmPassword: string,
        userName: string,
        turnstileToken: string,
        firstName: string,
        lastName: string | undefined,
        router: AppRouterInstance,
    ) => {
        if (email !== "" && password !== "" && confirmPassword !== "" && userName !== "" && turnstileToken != "") {
            if (password === confirmPassword) {
                const account = await signUpViaEmail(email, password, turnstileToken, userName, firstName, lastName);
                if (isSignUpFailure(account)) {
                    toast.error("Failed to create account");
                    return;
                }

                router.push("/auth/sign-up-success");
            } else {
                toast.error("Passwords must match");
            }
        } else {
            toast.error("Please enter an Email, Password and Username");
        }
};


/**
 * Validates credentials and signs the user in via email/password.
 *
 * @param email - The user's email address
 * @param password - The user's password
 * @param turnstileToken - Cloudflare Turnstile CAPTCHA token
 * @returns The authentication status from the API, or `undefined` if fields are empty
 */
export const handleSignInViaEmail =  async (email: string, password: string, turnstileToken: string) => {
    if (email !== "" && password !== "" && turnstileToken !== "") {
        const status = await signInViaEmail(email, password, turnstileToken);
        return status;
    }
};


/**
 * Sends a password-reset email after validating that required fields are present.
 *
 * @param email - The account email to send the reset link to
 * @param turnstileToken - Cloudflare Turnstile CAPTCHA token
 * @returns A status/data object from the API, an error object on failure,
 *          or `undefined` if fields are empty
 */
export const handleResetPasswordRequest = async (email: string, turnstileToken: string) => {
    if (email !== "" && turnstileToken !== "") {
        const response = await resetPassword(email, turnstileToken);
        if (!response) {
            console.error("No response was received from resetPassword call");
            return { status: "error", data: "Failed to send reset password email"};
        } else {
            return response;
        }
    }
};
