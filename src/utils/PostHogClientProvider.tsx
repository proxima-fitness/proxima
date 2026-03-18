"use client";

/**
 * @module PostHogClientProvider
 * Client-side wrapper that initializes PostHog analytics and exposes its React context.
 *
 * Depends on: `posthog-js`, `PostHogProvider`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`.
 * Used by: Top-level layout to enable analytics for the client application.
 */

import posthog from 'posthog-js';
import { PropsWithChildren, useEffect } from 'react'
import { PostHogProvider } from 'posthog-js/react';
import { PostHogIdentify } from '@/utils/PostHogIdentify';

/**
 * Initializes the PostHog client and provides it to descendant components.
 *
 * @param children React subtree that should have access to PostHog analytics.
 */
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
            disable_session_recording: true,
            loaded: (ph) => {
                if ('requestIdleCallback' in window) {
                    requestIdleCallback(() => ph.startSessionRecording());
                } else {
                    setTimeout(() => ph.startSessionRecording(), 3000);
                }
            },
        });
    }, []);

    return (
        <PostHogProvider client={posthog}>
            <PostHogIdentify />
            {children}
        </PostHogProvider>
  )
}
