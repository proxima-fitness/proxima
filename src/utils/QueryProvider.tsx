"use client";

/**
 * @module QueryProvider
 * Wrapper component that instantiates a React Query client and provides it to the app.
 *
 * Depends on: `@tanstack/react-query` QueryClient and provider.
 * Used by: Top-level layouts that need data fetching and caching via React Query.
 */

import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { useState } from "react";

/**
 * Props for the `QueryProvider` component.
 *
 * @property children React subtree that should have access to the shared QueryClient.
 */
interface IProps {
    children: React.ReactNode;
}

/**
 * Creates a single `QueryClient` instance and provides it via React Query context.
 *
 * @param children React subtree wrapped by the `QueryClientProvider`.
 */
export default function QueryProvider({children}: IProps) {
    const [queryClient] = useState(() => new QueryClient());
    return <QueryClientProvider client={ queryClient }>{ children }</QueryClientProvider>;
}
