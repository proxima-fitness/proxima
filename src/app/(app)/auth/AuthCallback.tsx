"use client";

import { supabase } from "@/api";
import { useSessionContext } from "@/contexts/SessionContext";
import { useEffect } from "react";

export const AuthCallback = () => {

    const { setSession } = useSessionContext();

    useEffect( () => {

        const getSession = async () => {
            const { data, error } = await supabase.auth.getSession();
            if (error) {
                console.error("Error signing in on Auth Callback page:", error);
            } else if (data.session) {
                setSession(data.session);
            }
        };

        getSession();

    }, [setSession]);


    return (
        <>
        </>
    );
};