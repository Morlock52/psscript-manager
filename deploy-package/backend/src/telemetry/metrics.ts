import { metrics } from '@opentelemetry/api';
import { Counter, Histogram, ObservableGauge } from '@opentelemetry/api';
import * as promClient from 'prom-client';

// Get meter for custom metrics
const meter = metrics.getMeter('psscript-backend', '1.0.0');

// Business metrics
export const scriptUploadCounter = meter.createCounter('scripts_uploaded_total', {
  description: 'Total number of scripts uploaded',
});

export const scriptExecutionCounter = meter.createCounter('scripts_executed_total', {
  description: 'Total number of scripts executed',
});

export const scriptAnalysisCounter = meter.createCounter('scripts_analyzed_total', {
  description: 'Total number of scripts analyzed',
});

export const aiRequestCounter = meter.createCounter('ai_requests_total', {
  description: 'Total number of AI service requests',
});

export const authenticationCounter = meter.createCounter('authentication_attempts_total', {
  description: 'Total number of authentication attempts',
});

export const scriptUploadSizeHistogram = meter.createHistogram('script_upload_size_bytes', {
  description: 'Size of uploaded scripts in bytes',
  unit: 'bytes',
});

export const scriptExecutionDurationHistogram = meter.createHistogram('script_execution_duration_seconds', {
  description: 'Duration of script executions',
  unit: 'seconds',
});

export const aiResponseTimeHistogram = meter.createHistogram('ai_response_time_seconds', {
  description: 'Response time for AI service calls',
  unit: 'seconds',
});

export const databaseQueryDurationHistogram = meter.createHistogram('database_query_duration_seconds', {
  description: 'Duration of database queries',
  unit: 'seconds',
});

// Observable gauges for system metrics
export const activeUsersGauge = meter.createObservableGauge('active_users_count', {
  description: 'Number of currently active users',
});

export const scriptQueueSizeGauge = meter.createObservableGauge('script_queue_size', {
  description: 'Number of scripts in processing queue',
});

export const cacheHitRateGauge = meter.createObservableGauge('cache_hit_rate', {
  description: 'Cache hit rate percentage',
});

// Prometheus metrics for compatibility
const promRegister = new promClient.Registry();
promClient.collectDefaultMetrics({ register: promRegister });

// Custom Prometheus metrics
export const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [promRegister],
});

export const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [promRegister],
});

export const databaseConnectionPool = new promClient.Gauge({
  name: 'database_connection_pool_size',
  help: 'Current size of database connection pool',
  labelNames: ['state'],
  registers: [promRegister],
});

export const redisConnectionStatus = new promClient.Gauge({
  name: 'redis_connection_status',
  help: 'Redis connection status (1 = connected, 0 = disconnected)',
  registers: [promRegister],
});

// Business-specific Prometheus metrics
export const scriptSecurityScore = new promClient.Histogram({
  name: 'script_security_score',
  help: 'Security score distribution of analyzed scripts',
  buckets: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
  registers: [promRegister],
});

export const scriptComplexityScore = new promClient.Histogram({
  name: 'script_complexity_score',
  help: 'Complexity score distribution of analyzed scripts',
  buckets: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
  registers: [promRegister],
});

// Export Prometheus registry
export const getPrometheusMetrics = () => promRegister.metrics();

// Helper functions for recording metrics
export function recordScriptUpload(size: number, category: string) {
  scriptUploadCounter.add(1, { category });
  scriptUploadSizeHistogram.record(size, { category });
}

export function recordScriptExecution(duration: number, status: 'success' | 'failure') {
  scriptExecutionCounter.add(1, { status });
  scriptExecutionDurationHistogram.record(duration, { status });
}

export function recordAIRequest(service: string, duration: number, status: 'success' | 'failure') {
  aiRequestCounter.add(1, { service, status });
  aiResponseTimeHistogram.record(duration, { service, status });
}

export function recordAuthentication(method: string, success: boolean) {
  authenticationCounter.add(1, { method, status: success ? 'success' : 'failure' });
}

export function recordHttpRequest(method: string, route: string, statusCode: number, duration: number) {
  httpRequestTotal.inc({ method, route, status_code: statusCode.toString() });
  httpRequestDuration.observe({ method, route, status_code: statusCode.toString() }, duration);
}

export function updateDatabasePoolMetrics(active: number, idle: number, waiting: number) {
  databaseConnectionPool.set({ state: 'active' }, active);
  databaseConnectionPool.set({ state: 'idle' }, idle);
  databaseConnectionPool.set({ state: 'waiting' }, waiting);
}

export function updateRedisStatus(connected: boolean) {
  redisConnectionStatus.set(connected ? 1 : 0);
}

export function recordScriptAnalysisScores(securityScore: number, complexityScore: number) {
  scriptSecurityScore.observe(securityScore);
  scriptComplexityScore.observe(complexityScore);
}