/**
 * @module instrumentation
 *
 * Next.js instrumentation hook: registers OpenTelemetry with Langfuse export
 * via LangfuseSpanProcessor (Langfuse v4 / @langfuse/otel). Next.js calls
 * `register()` once at server startup.
 *
 * Depends on: @langfuse/otel, @opentelemetry/sdk-trace-node
 * Used by: Next.js runtime; api/chat imports `langfuseSpanProcessor` for flush
 */

import { LangfuseSpanProcessor } from '@langfuse/otel';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';

/** Exported for serverless flush after streaming responses (see api/chat). */
export const langfuseSpanProcessor = new LangfuseSpanProcessor();

const tracerProvider = new NodeTracerProvider({
  spanProcessors: [langfuseSpanProcessor],
});

export function register() {
  tracerProvider.register();
}
