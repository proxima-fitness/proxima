/**
 * @module openapi.json
 *
 * Serves the Public API OpenAPI 3 document (ADR 0026 / 03).
 *
 * Depends on: @/lib/public-api/openapi
 * Used by: Scalar at /developers, third-party clients
 */

import { NextResponse } from "next/server";
import { PUBLIC_API_OPENAPI } from "@/lib/public-api/openapi";

/** GET /openapi.json */
export function GET() {
    return NextResponse.json(PUBLIC_API_OPENAPI);
}
