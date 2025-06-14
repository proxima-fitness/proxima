import Turnstile from "react-turnstile";
import { useState } from "react";
import { sitekey } from "@/api";
import { handleSignUpViaEmail } from "../program-builder/utils/authentication";
import { useRouter } from "next/navigation";

interface IProps {
    email: string,
    password: string,
    confirmPassword: string,
    userName: string,
    firstName: string,
    lastName: string | undefined,
}

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
