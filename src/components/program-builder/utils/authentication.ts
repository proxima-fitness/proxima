import { resetPassword, signInViaEmail, signUpViaEmail } from "@/api/authentication";

export const handleSignUpViaEmail =
    (   email: string,
        password: string,
        confirmPassword: string,
        userName: string,
        turnstileToken: string,
        firstName: string,
        lastName: string | undefined,
        setShowGuest: (showGuest: boolean ) => void,
        setShowSocialMediaLogins: (showSocialMediaLogins: boolean ) => void,
        setAccountCreated: (accountCreated: boolean) => void,
        setIsPasswordMismatchToastOpen: (isPasswordMismatchToastOpen: boolean) => void,
        setIsEmailPasswordUserNameToastOpen: (isEmailPasswordUserNameToastOpen: boolean) => void,
    ) => {
        if (email !== "" && password !== "" && confirmPassword !== "" && userName !== "" && turnstileToken != "") {
            if (password === confirmPassword) {
                const account = signUpViaEmail(email, password, turnstileToken, userName, firstName, lastName);
                if (account !== null && account !== undefined) {
                    setShowGuest(false);
                    setShowSocialMediaLogins(false);
                    setAccountCreated(true);
                }
            } else {
                setIsPasswordMismatchToastOpen(true);
            }
        } else {
            setIsEmailPasswordUserNameToastOpen(true);
        }
};


export const handleSignInViaEmail =  async (email: string, password: string, turnstileToken: string) => {
    if (email !== "" && password !== "" && turnstileToken !== "") {
        const status = await signInViaEmail(email, password, turnstileToken);
        return status;
    }
};


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
