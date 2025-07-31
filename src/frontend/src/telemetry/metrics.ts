import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

// Configure the resource
const resource = Resource.default().merge(
  new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'psscript-frontend',
    [SemanticResourceAttributes.SERVICE_VERSION]: '0.1.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: import.meta.env.MODE || 'development',
  })
);

// Configure the metric exporter
const collectorUrl = import.meta.env.VITE_OTEL_COLLECTOR_URL || 'http://localhost:4318/v1/metrics';
const metricExporter = new OTLPMetricExporter({
  url: collectorUrl,
  headers: {},
});

// Create meter provider
const meterProvider = new MeterProvider({
  resource,
  readers: [
    new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 10000, // Export every 10 seconds
    }),
  ],
});

// Get meter for custom metrics
const meter = meterProvider.getMeter('psscript-frontend', '1.0.0');

// Page view counter
export const pageViewCounter = meter.createCounter('page_views_total', {
  description: 'Total number of page views',
});

// User interaction counter
export const userInteractionCounter = meter.createCounter('user_interactions_total', {
  description: 'Total number of user interactions',
});

// API request counter
export const apiRequestCounter = meter.createCounter('api_requests_total', {
  description: 'Total number of API requests',
});

// Script operation counter
export const scriptOperationCounter = meter.createCounter('script_operations_total', {
  description: 'Total number of script operations',
});

// API response time histogram
export const apiResponseTimeHistogram = meter.createHistogram('api_response_time_seconds', {
  description: 'API response time in seconds',
  unit: 'seconds',
});

// Page load time histogram
export const pageLoadTimeHistogram = meter.createHistogram('page_load_time_seconds', {
  description: 'Page load time in seconds',
  unit: 'seconds',
});

// Component render time histogram
export const componentRenderTimeHistogram = meter.createHistogram('component_render_time_seconds', {
  description: 'Component render time in seconds',
  unit: 'seconds',
});

// Web Vitals metrics
export const webVitalsHistogram = meter.createHistogram('web_vitals_score', {
  description: 'Web Vitals scores',
  unit: 'milliseconds',
});

// Initialize Web Vitals reporting
export function initializeWebVitals() {
  // Cumulative Layout Shift
  getCLS((metric) => {
    webVitalsHistogram.record(metric.value, { 
      metric: 'cls',
      rating: metric.rating 
    });
  });

  // First Input Delay
  getFID((metric) => {
    webVitalsHistogram.record(metric.value, { 
      metric: 'fid',
      rating: metric.rating 
    });
  });

  // First Contentful Paint
  getFCP((metric) => {
    webVitalsHistogram.record(metric.value, { 
      metric: 'fcp',
      rating: metric.rating 
    });
  });

  // Largest Contentful Paint
  getLCP((metric) => {
    webVitalsHistogram.record(metric.value, { 
      metric: 'lcp',
      rating: metric.rating 
    });
  });

  // Time to First Byte
  getTTFB((metric) => {
    webVitalsHistogram.record(metric.value, { 
      metric: 'ttfb',
      rating: metric.rating 
    });
  });
}

// Helper functions for recording metrics
export function recordPageView(page: string) {
  pageViewCounter.add(1, { page });
}

export function recordUserInteraction(action: string, target: string) {
  userInteractionCounter.add(1, { action, target });
}

export function recordApiRequest(method: string, endpoint: string, status: number) {
  apiRequestCounter.add(1, { method, endpoint, status: status.toString() });
}

export function recordScriptOperation(operation: string, status: 'success' | 'failure') {
  scriptOperationCounter.add(1, { operation, status });
}

export function recordApiResponseTime(endpoint: string, duration: number) {
  apiResponseTimeHistogram.record(duration, { endpoint });
}

export function recordPageLoadTime(page: string, duration: number) {
  pageLoadTimeHistogram.record(duration, { page });
}

export function recordComponentRenderTime(component: string, duration: number) {
  componentRenderTimeHistogram.record(duration, { component });
}

// Performance observer for resource timing
export function initializeResourceTiming() {
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          const resourceEntry = entry as PerformanceResourceTiming;
          const duration = resourceEntry.duration / 1000; // Convert to seconds
          
          apiResponseTimeHistogram.record(duration, {
            resource_type: resourceEntry.initiatorType,
            resource_name: resourceEntry.name,
          });
        }
      }
    });
    
    observer.observe({ entryTypes: ['resource'] });
  }
}

// Initialize all metrics collection
export function initializeMetrics() {
  initializeWebVitals();
  initializeResourceTiming();
}