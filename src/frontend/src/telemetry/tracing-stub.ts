// OpenTelemetry tracing stub - used when full tracing is disabled
// This provides empty implementations to prevent compilation errors

export function initializeTracing() {
  console.log('[Tracing] OpenTelemetry tracing is disabled');
}

export function shutdown() {
  // No-op
}

// Export an empty object to maintain compatibility
export const tracer = {
  startSpan: () => ({
    end: () => {},
    setAttributes: () => {},
    recordException: () => {},
    setStatus: () => {}
  })
};