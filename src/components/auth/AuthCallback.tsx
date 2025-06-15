"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserContext } from "@/contexts/UserContext";
import { supabase } from "@/api";

const AuthCallback = () => {

    const { setUser } = useUserContext();
    const router = useRouter();

    useEffect(() => {
        const fetchSession = async () => {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
            console.error("Auth callback error:", error);
            router.push("/auth/login");
        } else if (data?.session && data.session.user) {
            setUser(data.session.user);
            router.push("/program-builder");
        }
    };

    fetchSession();
  }, [router, setUser]);

    return (
        <div className="flex justify-center items-center h-screen">
            <p>Loading...</p>
        </div>
    );
};

export default AuthCallback;
