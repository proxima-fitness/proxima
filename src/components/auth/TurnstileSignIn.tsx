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
    setTurnstileOpen: (turnstileOpen: boolean) => void;
}

export const TurnstileSignIn: React.FC<IProps> = (props) => {

    const {
        email,
        password,
        setTurnstileOpen,
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
                        toast.error("Error signing in: " + status.message);
                        setTimeout(() => {
                            setTurnstileOpen(false);
                        }, 3000);
                        turnstile.reset();

                    } else {
                        router.push('/')
                    }
                } }
            />
            { signingIn &&
                <span className="text-sm text-lightSecondary">Veryifying you're not a bot...</span>
            }
        </>
    );
};
