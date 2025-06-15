"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessionContext } from "@/contexts/SessionContext";
import { supabase } from "@/api";

const AuthCallback = () => {

    const { setSession } = useSessionContext();
    const router = useRouter();

    useEffect(() => {
        const fetchSession = async () => {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
            console.error("Auth callback error:", error);
            router.push("/auth/login");
        } else if (data.session) {
            setSession(data.session);
            router.push("/program-builder");
        }
    };

    fetchSession();
  }, [router, setSession]);

    return (
        <div className="flex justify-center items-center h-screen">
            <p>Loading...</p>
        </div>
    );
};

export default AuthCallback;
