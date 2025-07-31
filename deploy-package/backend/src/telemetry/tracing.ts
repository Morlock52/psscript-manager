import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { RedisInstrumentation } from '@opentelemetry/instrumentation-redis-4';
import { IORedisInstrumentation } from '@opentelemetry/instrumentation-ioredis';

// Enable OpenTelemetry diagnostics for debugging
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

// Configure the resource
const resource = Resource.default().merge(
  new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'psscript-backend',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.SERVICE_VERSION || '0.1.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'psscript',
    'service.instance.id': process.env.HOSTNAME || 'local',
  })
);

// Configure exporters
const collectorUrl = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4317';

const traceExporter = new OTLPTraceExporter({
  url: `${collectorUrl}`,
  headers: {},
});

const metricExporter = new OTLPMetricExporter({
  url: `${collectorUrl}`,
  headers: {},
});

const logExporter = new OTLPLogExporter({
  url: `${collectorUrl}`,
  headers: {},
});

// Create SDK instance
export const otelSDK = new NodeSDK({
  resource,
  spanProcessor: new BatchSpanProcessor(traceExporter),
  instrumentations: [
    // Auto-instrumentations
    getNodeAutoInstrumentations({
      // Disable fs instrumentation to reduce noise
      '@opentelemetry/instrumentation-fs': {
        enabled: false,
      },
      // Configure specific instrumentations
      '@opentelemetry/instrumentation-http': {
        requestHook: (span, request) => {
          span.setAttribute('http.request.body.size', request.headers['content-length'] || 0);
        },
        responseHook: (span, response) => {
          span.setAttribute('http.response.body.size', response.headers['content-length'] || 0);
        },
        ignoreIncomingPaths: ['/health', '/metrics'],
        ignoreOutgoingUrls: [],
      },
    }),
    // Manual instrumentations for better control
    new ExpressInstrumentation({
      requestHook: (span, info) => {
        span.updateName(`${info.request.method} ${info.route}`);
        span.setAttribute('express.route', info.route);
        span.setAttribute('express.type', info.layerType);
      },
    }),
    new HttpInstrumentation({
      requestHook: (span, request) => {
        span.setAttribute('http.request.method', request.method);
        span.setAttribute('http.request.url', request.url || '');
      },
    }),
    new PgInstrumentation({
      enhancedDatabaseReporting: true,
      responseHook: (span, responseInfo) => {
        span.setAttribute('db.rows_affected', responseInfo.data.rowCount || 0);
      },
    }),
    new RedisInstrumentation({
      responseHook: (span, cmdName, cmdArgs, response) => {
        span.setAttribute('redis.command', cmdName);
        span.setAttribute('redis.key', cmdArgs[0] || '');
      },
    }),
    new IORedisInstrumentation({
      responseHook: (span, cmdName, cmdArgs, response) => {
        span.setAttribute('redis.command', cmdName);
        span.setAttribute('redis.key', cmdArgs[0] || '');
      },
    }),
  ],
  metricReader: new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 10000, // Export metrics every 10 seconds
  }),
  logRecordProcessor: new BatchLogRecordProcessor(logExporter),
});

// Initialize the SDK
export async function initializeTelemetry(): Promise<void> {
  try {
    await otelSDK.start();
    console.log('OpenTelemetry initialized successfully');
    
    // Ensure proper shutdown on exit
    process.on('SIGTERM', async () => {
      try {
        await otelSDK.shutdown();
        console.log('OpenTelemetry terminated');
      } catch (error) {
        console.error('Error shutting down OpenTelemetry', error);
      }
    });
  } catch (error) {
    console.error('Error initializing OpenTelemetry', error);
  }
}