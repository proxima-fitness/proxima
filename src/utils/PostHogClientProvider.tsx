"use client";

import posthog from 'posthog-js';
import { PropsWithChildren, useEffect } from 'react'
import { PostHogProvider } from 'posthog-js/react';

export function PostHogClientProvider({ children }: PropsWithChildren) {

    useEffect(() => {
        posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "", {
            api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "",
            // capture_pageview: false // Disable automatic pageview capture, as we capture manually
        });
    }, []);

    return (
        <PostHogProvider client={posthog}>
            {children}
        </PostHogProvider>
  )
}
