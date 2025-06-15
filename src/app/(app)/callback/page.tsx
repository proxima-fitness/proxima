import AuthCallback from "@/components/auth/AuthCallback";
import { Suspense } from "react";

export default function Page() {

    return (
        <Suspense fallback={null}>
            <AuthCallback />
        </Suspense>
    )
}
