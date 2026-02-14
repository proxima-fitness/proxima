import Turnstile, { useTurnstile } from "react-turnstile";
import { useState } from "react";
import { AuthError } from "@supabase/supabase-js";
import { sitekey } from "@/api";
import { handleSignInViaEmail } from "../program-builder/utils/authentication";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface IProps {
    email: string,
    password: string,
    handleTurnstileClose: () => void;
    onSignInError?: () => void;
    redirectPath?: string;

}

export const TurnstileSignIn: React.FC<IProps> = (props) => {

    const {
        email,
        password,
        handleTurnstileClose,
        onSignInError,
        redirectPath = '/',
    } = props;

    const turnstile = useTurnstile();
    const router = useRouter();
    const [ signingIn, setSigningIn ] = useState(false);

    return (
        <>

            <Turnstile
                sitekey={ sitekey }
                onVerify={ async (token) => {
                    setSigningIn(true);
                    const status = await handleSignInViaEmail(email, password, token);
                    if (status instanceof AuthError) {
                        onSignInError?.();
                        toast.error("Error signing in: " + status.message);
                        setTimeout(() => {
                            handleTurnstileClose();
                        }, 3000);
                        turnstile.reset();

                    } else if (status) {
                        router.push(redirectPath)
                    }
                } }
            />
            { signingIn &&
                <span className="text-sm text-lightSecondary">Veryifying you&apos;re not a bot...</span>
            }
        </>
    );
};
