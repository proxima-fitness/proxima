/**
 * @module TurnstileResetPassword
 * Cloudflare Turnstile widget that runs after the user submits the forgot-password email.
 * On verify, calls the reset-password API with the email and token; toasts result and calls setSuccess on success.
 * Depends on: react-turnstile, program-builder authentication, @/api sitekey.
 * Used by: forgot-password-form.
 */
import Turnstile from "react-turnstile";
import { useState } from "react";
import { toast } from "sonner";
import { handleResetPasswordRequest } from "../program-builder/utils/authentication";
import { sitekey } from "@/api";

/** @property email - Email address to send the reset link to. */
/** @property setSuccess - Callback to mark flow as successful (e.g. show "check your email"). */
interface IProps {
    email: string,
    setSuccess: (success: boolean) => void,
}

/** Renders Turnstile; on verify, requests password reset and updates parent via setSuccess/toast. */
export const TurnstileResetPassword: React.FC<IProps> = (props) => {

    const {
        email,
        setSuccess,
    } = props;

    // const turnstile = useTurnstile();
    const [ resetPassword, setResetPassword ] = useState(false);

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
                onVerify={ async (token) => {
                    setResetPassword(true);
                    const response: {status: string; data: unknown} | undefined = await handleResetPasswordRequest(email, token);
                    if (response && response?.status === "success") {
                        toast.success(response?.data as string ?? "success");
                        setSuccess(true);
                    } else {
                        toast.error(response?.data as string ?? "Unknown error occured while logging in");
                    }
                    setResetPassword(false);
                } }
            />
            { resetPassword && "Veryifying you are not a bot ..." }
        </>

    );
};
