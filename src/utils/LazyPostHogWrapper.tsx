"use client";

/**
 * Wraps children with PostHogClientProvider only after requestIdleCallback,
 * so posthog-js loads in a separate chunk and does not block LCP.
 */

import { PropsWithChildren, useEffect, useState } from "react";

export function LazyPostHogWrapper({ children }: PropsWithChildren) {
    const [Provider, setProvider] = useState<React.ComponentType<PropsWithChildren> | null>(null);

    useEffect(() => {
        const schedule = typeof requestIdleCallback !== "undefined"
            ? requestIdleCallback
            : (cb: () => void) => setTimeout(cb, 0);
        const id = schedule(() => {
            import("@/utils/PostHogClientProvider").then(({ PostHogClientProvider }) => {
                setProvider(() => PostHogClientProvider);
            });
        });
        return () => {
            if (typeof cancelIdleCallback !== "undefined") {
                cancelIdleCallback(id as number);
            } else {
                clearTimeout(id as number);
            }
        };
    }, []);

    if (Provider) {
        return <Provider>{children}</Provider>;
    }
    return <>{children}</>;
}
