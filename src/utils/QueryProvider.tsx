"use client";

import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { useState } from "react";

interface IProps {
    children: React.ReactNode;
}

export default function QueryProvider({children}: IProps) {
    const [queryClient] = useState(() => new QueryClient());
    return <QueryClientProvider client={ queryClient }>{ children }</QueryClientProvider>;
}
