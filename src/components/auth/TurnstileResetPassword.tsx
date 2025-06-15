import Turnstile from "react-turnstile";
import { useState } from "react";
import { toast } from "sonner";
import { handleResetPasswordRequest } from "../program-builder/utils/authentication";
import { sitekey } from "@/api";

interface IProps {
    email: string,
    setSuccess: (success: boolean) => void,
}

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
