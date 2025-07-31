import { Request, Response, NextFunction } from 'express';
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import { recordHttpRequest } from '../telemetry/metrics';

const tracer = trace.getTracer('psscript-backend-middleware', '1.0.0');

// Middleware to add tracing to all requests
export function telemetryMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const span = tracer.startSpan(`${req.method} ${req.path}`, {
    kind: SpanKind.SERVER,
    attributes: {
      'http.method': req.method,
      'http.url': req.url,
      'http.target': req.path,
      'http.host': req.hostname,
      'http.scheme': req.protocol,
      'http.user_agent': req.get('user-agent') || '',
      'http.request_content_length': req.get('content-length') || 0,
      'net.peer.ip': req.ip,
      'user.id': (req as any).user?.id || 'anonymous',
    },
  });

  // Store span in request for use in controllers
  (req as any).span = span;

  // Wrap the response end method to capture response details
  const originalEnd = res.end;
  res.end = function(...args: any[]) {
    const duration = (Date.now() - startTime) / 1000;
    
    // Set response attributes
    span.setAttributes({
      'http.status_code': res.statusCode,
      'http.response_content_length': res.get('content-length') || 0,
    });

    // Set span status based on HTTP status code
    if (res.statusCode >= 400) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: `HTTP ${res.statusCode}`,
      });
    } else {
      span.setStatus({ code: SpanStatusCode.OK });
    }

    // Record metrics
    recordHttpRequest(req.method, req.route?.path || req.path, res.statusCode, duration);

    // End the span
    span.end();

    // Call the original end method
    return originalEnd.apply(res, args);
  };

  // Continue with the request in the span context
  context.with(trace.setSpan(context.active(), span), () => {
    next();
  });
}

// Middleware to create child spans for specific operations
export function createOperationSpan(operationName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parentSpan = (req as any).span;
    const span = tracer.startSpan(operationName, {
      kind: SpanKind.INTERNAL,
      attributes: {
        'operation.type': operationName,
        'user.id': (req as any).user?.id || 'anonymous',
      },
    });

    // Store the operation span
    (req as any).operationSpan = span;

    // Wrap next to end span when operation completes
    const wrappedNext = (error?: any) => {
      if (error) {
        span.recordException(error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });
      }
      span.end();
      next(error);
    };

    context.with(trace.setSpan(context.active(), span), () => {
      next = wrappedNext;
      next();
    });
  };
}

// Error tracking middleware
export function errorTrackingMiddleware(err: Error, req: Request, res: Response, next: NextFunction) {
  const span = (req as any).span || trace.getActiveSpan();
  
  if (span) {
    span.recordException(err);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: err.message,
    });
    
    // Add error details as attributes
    span.setAttributes({
      'error.type': err.name,
      'error.message': err.message,
      'error.stack': err.stack || '',
    });
  }

  next(err);
}