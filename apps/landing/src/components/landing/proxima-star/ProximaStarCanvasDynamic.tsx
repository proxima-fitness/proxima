// SPDX-License-Identifier: AGPL-3.0-only

"use client";

/**
 * @module proxima-star/ProximaStarCanvasDynamic
 * Client-only loader so vgpu and WGSL stay out of the SSR bundle.
 * Depends on: next/dynamic, ProximaStarCanvas. Used by: Prompt.
 */
import dynamic from "next/dynamic";

export const ProximaStarCanvasDynamic = dynamic(
    () => import("./ProximaStarCanvas").then((mod) => mod.ProximaStarCanvas),
    { ssr: false },
);
