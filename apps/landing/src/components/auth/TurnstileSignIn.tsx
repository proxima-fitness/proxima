/**
 * @module TurnstileSignIn
 * Cloudflare Turnstile widget shown after user submits email/password login. On verify, signs in via
 * handleSignInViaEmail; on success redirects, on AuthError toasts and resets Turnstile.
 * Depends on: react-turnstile, program-builder authentication, @/api sitekey.
 * Used by: login-form.
 */
import Turnstile, { useTurnstile } from "react-turnstile";
import { useState } from "react";
import { AuthError } from "@supabase/supabase-js";
import { sitekey } from "@/api";
import { handleSignInViaEmail } from "../program-builder/utils/authentication";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { sanitizeSignInReturn } from "@/lib/sign-in-return";

/** @property email - User's email for sign-in. */
/** @property password - User's password. */
/** @property handleTurnstileClose - Called to hide Turnstile (e.g. after error). */
/** @property onSignInError - Optional callback when sign-in fails (e.g. clear password). */
/** @property redirectPath - Path to redirect to on success; default '/'. */
interface IProps {
    email: string,
    password: string,
    handleTurnstileClose: () => void;
    onSignInError?: () => void;
    redirectPath?: string;

}

/** Renders Turnstile; on verify signs in with email/password and redirects or handles error. */
export const TurnstileSignIn: React.FC<IProps> = (props) => {

    const {
        email,
        password,
        handleTurnstileClose,
        onSignInError,
        redirectPath = '/',
    } = props;

    const safeRedirectPath = sanitizeSignInReturn(redirectPath);
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
                        router.push(safeRedirectPath)
                    }
                } }
            />
            { signingIn &&
                <span className="text-sm text-lightSecondary">Verifying you&apos;re not a bot…</span>
            }
        </>
    );
};
