"use client";

import posthog from "posthog-js";
import { Programs } from "./Programs";
import { useEffect } from "react";
import { useUserContext } from "@/contexts/UserContext";

export default function ProgramsLayout() {

    const { user } = useUserContext();
    useEffect(() => {
        posthog.capture('page_view', { page: '/programs', user: user?.id ?? "user_id_unknown" });
    }, [user]);

    return (
        <div className="px-24 max-sm:px-0">
            <Programs />
        </div>
    );
};
