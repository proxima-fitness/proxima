/**
 * @module instrumentation
 *
 * Next.js instrumentation hook that wires up OpenTelemetry tracing with
 * Langfuse as the export backend. Next.js calls `register()` once at
 * server startup, before any request handling begins.
 *
 * Depends on: @vercel/otel, langfuse-vercel
 * Used by: Next.js runtime (automatic instrumentation entry-point)
 */

import { registerOTel } from '@vercel/otel';
import { LangfuseExporter } from 'langfuse-vercel';

/**
 * Register OpenTelemetry with Langfuse trace export.
 *
 * Called automatically by Next.js at server startup. Enables distributed
 * tracing across API routes and server components, with traces forwarded
 * to Langfuse for observability.
 */
export function register() {
  registerOTel({
    serviceName: 'next-app',
    traceExporter: new LangfuseExporter(),
  });
}
