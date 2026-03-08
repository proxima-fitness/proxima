"use client";

/*
 * @module ProgramsLayout
 * @description Layout wrapper for the programs index page that tracks page views and provides consistent horizontal padding.
 * @dependsOn User context, PostHog analytics client, and the `Programs` discovery component.
 * @usedBy The `/programs` route as the main shell around the program search experience.
 */

/**
 * ProgramsLayout renders the programs page shell and records a page view for analytics when mounted.
 */
import posthog from "posthog-js";
import { Programs } from "./Programs";
import { useEffect } from "react";
import { useUserContext } from "@/contexts/UserContext";

export default function ProgramsLayout() {

    const { user } = useUserContext();
    useEffect(() => {
        posthog?.capture?.('page_view', { page: '/programs', user: user?.id ?? "user_id_unknown" });
    }, [user]);

    return (
        <div className="px-24 max-sm:px-0">
            <Programs />
        </div>
    );
};
