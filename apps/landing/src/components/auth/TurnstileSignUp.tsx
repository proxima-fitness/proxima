// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module TurnstileSignUp
 * Cloudflare Turnstile widget shown after user submits sign-up form. On verify, calls handleSignUpViaEmail
 * with form data and token; navigation is handled inside that helper.
 * Depends on: react-turnstile, program-builder authentication, @/api sitekey.
 * Used by: sign-up-form.
 */
import Turnstile from "react-turnstile";
import { useState } from "react";
import { sitekey } from "@/api";
import { handleSignUpViaEmail } from "../program-builder/utils/authentication";
import { useRouter } from "next/navigation";

/** @property email - New account email. */
/** @property password - New account password. */
/** @property confirmPassword - Repeated password for validation. */
/** @property userName - Username for the account. */
/** @property firstName - User's first name. */
/** @property lastName - User's last name (optional). */
interface IProps {
    email: string,
    password: string,
    confirmPassword: string,
    userName: string,
    firstName: string,
    lastName: string | undefined,
}

/** Renders Turnstile; on verify triggers sign-up with collected form data. */
export const TurnstileSignUp: React.FC<IProps> = (props) => {

    const {
        email,
        password,
        confirmPassword,
        userName,
        firstName,
        lastName,
    } = props;

    const [ signingUp, setSigningUp ] = useState(false);
    const router = useRouter();

    return (
        <>
            <Turnstile
                sitekey={ sitekey }
                onVerify={ (token) => {
                    handleSignUpViaEmail(email, password, confirmPassword, userName, token, firstName, lastName, router);
                    setSigningUp(true);
                } }
            />
            { signingUp &&
                "Creating your account..."
            }
        </>
    );
};
