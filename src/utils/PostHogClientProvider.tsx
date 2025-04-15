"use client";

import posthog from 'posthog-js';
import { PropsWithChildren, useEffect } from 'react'
import { PostHogProvider } from 'posthog-js/react';

export function PostHogClientProvider({ children }: PropsWithChildren) {

    useEffect(() => {
        const token = process.env.NEXT_PUBLIC_POSTHOG_KEY;
        const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

        if (!token || !host) {
            console.warn("PostHog not initialized: Missing token or host.");
            return;
        }

        posthog.init(token, {
            api_host: host,
        });
    }, []);

    return (
        <PostHogProvider client={posthog}>
            {children}
        </PostHogProvider>
  )
}
