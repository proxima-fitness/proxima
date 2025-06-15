"use client";

import { supabase } from "@/api";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export const AuthCallback = () => {

    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        const exchangeCode = async () => {
        const code = searchParams.get('code')

        if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code)
            if (error) {
            console.error('Client-side code exchange failed:', error)
            router.replace('/auth/error')
            } else {
            // Now the session is stored in localStorage
            router.replace('/program-builder')
            }
        }
        }

        exchangeCode()
    }, [searchParams, router])

    return (
        <>
            <p className="text-center mt-16">Finishing login...</p>
        </>
    )
}