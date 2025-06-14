import Turnstile from "react-turnstile";
import { useState } from "react";
import { sitekey } from "@/api";
import { handleSignUpViaEmail } from "../program-builder/utils/authentication";

interface IProps {
    email: string,
    password: string,
    confirmPassword: string,
    userName: string,
    firstName: string,
    lastName: string | undefined,
    handleShowGuest: (showGuest: boolean ) => void,
    handleShowSocialMediaLogins: (showSocialMediaLogins: boolean ) => void,
    handleAccountCreated: (accountCreated: boolean) => void,
    handlePasswordMismatchToast: (isPasswordMismatchToastOpen: boolean) => void,
    handleEmailPasswordUserNameToast: (isEmailPasswordUserNameToastOpen: boolean) => void,
}

export const TurnstileSignUp: React.FC<IProps> = (props) => {

    const {
        email,
        password,
        confirmPassword,
        userName,
        firstName,
        lastName,
        handleShowGuest,
        handleShowSocialMediaLogins,
        handleAccountCreated,
        handlePasswordMismatchToast,
        handleEmailPasswordUserNameToast,
    } = props;

    // const turnstile = useTurnstile();
    const [ signingUp, setSigningUp ] = useState(false);

    return (
    //   <Turnstile
    //     sitekey={ sitekey }
    //     onVerify={ (token) => {
    //         fetch("/login", {
    //         method: "POST",
    //         body: JSON.stringify({ token }),
    //         }).then((response) => {
    //         if (!response.ok) turnstile.reset();
    //         });
    //     } }
    // />
        <>
            <Turnstile
                sitekey={ sitekey }
                onVerify={ (token) => {
                    handleSignUpViaEmail(email, password, confirmPassword, userName, token, firstName, lastName, handleShowGuest, handleShowSocialMediaLogins, handleAccountCreated, handlePasswordMismatchToast, handleEmailPasswordUserNameToast);
                    setSigningUp(true);
                } }
            />
            { signingUp &&
                "Creating your account..."
            }
        </>
    );
};
