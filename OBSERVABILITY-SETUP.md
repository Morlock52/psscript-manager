# PSScript OpenTelemetry Observability Setup

This document describes the comprehensive observability implementation for PSScript using OpenTelemetry, providing distributed tracing, metrics collection, log aggregation, and performance monitoring across all services.

## Architecture Overview

The observability stack consists of:

- **OpenTelemetry Collector**: Central component for receiving, processing, and exporting telemetry data
- **Jaeger**: Distributed tracing backend and UI
- **Prometheus**: Metrics storage and querying
- **Grafana**: Visualization and dashboards
- **Loki**: Log aggregation
- **Tempo**: Trace storage backend
- **Alertmanager**: Alert routing and management

## Quick Start

### 1. Start the Observability Stack

```bash
# Start main services
docker-compose up -d

# Start observability stack
docker-compose -f docker-compose.observability.yml up -d
```

### 2. Access the UIs

- **Grafana**: http://localhost:3001 (admin/admin)
- **Jaeger**: http://localhost:16686
- **Prometheus**: http://localhost:9090
- **Alertmanager**: http://localhost:9093
- **OpenTelemetry Collector Health**: http://localhost:13133

## Service Instrumentation

### Backend Service (Node.js/TypeScript)

The backend service is instrumented with:

- Automatic HTTP instrumentation
- Express.js middleware tracing
- PostgreSQL query tracing
- Redis operation tracing
- Custom business metrics
- Error tracking

Key files:
- `/src/backend/src/telemetry/tracing.ts` - OpenTelemetry initialization
- `/src/backend/src/telemetry/metrics.ts` - Custom metrics definitions
- `/src/backend/src/middleware/telemetryMiddleware.ts` - Request tracing middleware

### Frontend Service (React/TypeScript)

The frontend service includes:

- Page load performance tracking
- User interaction tracing
- API call instrumentation
- Web Vitals monitoring
- Custom component metrics

Key files:
- `/src/frontend/src/telemetry/tracing.ts` - Browser tracing setup
- `/src/frontend/src/telemetry/metrics.ts` - Frontend metrics

### AI Service (Python/FastAPI)

The AI service features:

- FastAPI automatic instrumentation
- OpenAI API call tracing
- Script analysis metrics
- Embedding generation tracking
- Token usage monitoring

Key files:
- `/src/ai/telemetry/tracing.py` - Python tracing configuration
- `/src/ai/telemetry/metrics.py` - AI-specific metrics

## Custom Business Metrics

### Script Operations
- `scripts_uploaded_total` - Total script uploads by category
- `scripts_executed_total` - Script execution count by status
- `scripts_analyzed_total` - Script analysis operations
- `script_upload_size_bytes` - Upload size distribution
- `script_execution_duration_seconds` - Execution time histogram

### AI Metrics
- `ai_requests_total` - AI service requests by provider/model
- `ai_tokens_used_total` - Token usage tracking
- `ai_script_analysis_duration_seconds` - Analysis time distribution
- `ai_script_security_score` - Security score distribution
- `ai_script_complexity_score` - Complexity score distribution

### Performance Metrics
- `http_request_duration_seconds` - HTTP request latency
- `database_query_duration_seconds` - Database query performance
- `cache_hit_rate` - Cache effectiveness
- `active_users_count` - Current active users
- `web_vitals_score` - Frontend performance scores

## Distributed Tracing

### Trace Context Propagation

All services automatically propagate trace context through:
- HTTP headers (W3C Trace Context)
- Message queues
- Database calls
- External API calls

### Key Trace Operations

1. **Script Upload Flow**
   - Frontend: File selection and upload
   - Backend: File processing and validation
   - AI Service: Script analysis
   - Database: Metadata storage

2. **Script Execution Flow**
   - Frontend: Execution request
   - Backend: Authentication and authorization
   - Executor: PowerShell execution
   - Backend: Result processing

3. **AI Analysis Flow**
   - Backend: Analysis request
   - AI Service: Script parsing
   - OpenAI API: Embedding/completion
   - Database: Result storage

## Monitoring Dashboards

### Provided Dashboards

1. **PSScript Overview**
   - Service health status
   - Request rates and error rates
   - Response time percentiles
   - Business metrics summary

2. **Service Performance** (Create additional dashboards)
   - Detailed service metrics
   - Database performance
   - Cache statistics
   - Resource utilization

3. **AI Operations** (Create additional dashboards)
   - Token usage trends
   - Model performance
   - Analysis success rates
   - Cost tracking

## Alerting Rules

### Critical Alerts
- Service down for >2 minutes
- Database connection pool exhausted
- Redis connection failure
- High error rate (>5%)

### Warning Alerts
- High response time (p95 >2s)
- Slow script analysis (>30s)
- High memory usage (>90%)
- High CPU usage (>90%)
- Authentication failures spike

### Business Alerts
- High script upload failure rate
- Low security scores trend
- High token usage rate

## Performance Optimization

### Trace Sampling

The collector implements tail-based sampling:
- 100% of error traces
- 100% of slow traces (>1s)
- 10% of normal traces

### Metrics Aggregation

- 10-second export interval
- Pre-aggregation at collector level
- Efficient histogram buckets

### Resource Limits

Each component has defined resource limits:
- OpenTelemetry Collector: 512MB RAM
- Prometheus: 2GB storage retention
- Jaeger: Badger backend for efficiency

## Troubleshooting

### Common Issues

1. **No traces appearing**
   - Check OTEL_EXPORTER_OTLP_ENDPOINT environment variable
   - Verify collector is running: `docker logs psscript-otel-collector`
   - Check service logs for instrumentation errors

2. **Missing metrics**
   - Verify Prometheus targets: http://localhost:9090/targets
   - Check metric endpoints: `/metrics` on each service
   - Review collector logs for export errors

3. **High memory usage**
   - Adjust sampling rates in collector config
   - Reduce metric cardinality
   - Configure shorter retention periods

### Debug Mode

Enable debug logging:

```bash
# Backend
export OTEL_LOG_LEVEL=debug

# AI Service
export OTEL_PYTHON_LOG_LEVEL=debug

# Collector
# Edit otel-collector-config.yaml:
# service.telemetry.logs.level: debug
```

## Best Practices

### Instrumentation Guidelines

1. **Span Naming**
   - Use dot notation: `service.operation.suboperation`
   - Be consistent across services
   - Keep names descriptive but concise

2. **Attribute Usage**
   - Add business context (user ID, script ID)
   - Avoid high-cardinality values in metrics
   - Sanitize sensitive data

3. **Error Handling**
   - Always record exceptions in spans
   - Set appropriate span status
   - Include error details in attributes

### Performance Considerations

1. **Batch Operations**
   - Use batch processors for efficiency
   - Configure appropriate batch sizes
   - Monitor collector memory usage

2. **Sampling Strategy**
   - Sample intelligently (errors, slow requests)
   - Adjust rates based on traffic
   - Use head sampling for high-volume endpoints

## Extending Observability

### Adding New Metrics

1. Define metric in service telemetry module
2. Instrument code to record metric
3. Add to Prometheus scrape config if needed
4. Create Grafana panel for visualization
5. Add alerting rules if applicable

### Adding New Traces

1. Import tracer in module
2. Create spans for operations
3. Add relevant attributes
4. Link related spans
5. Test trace propagation

### Custom Dashboards

1. Access Grafana at http://localhost:3001
2. Create new dashboard
3. Add panels with PromQL queries
4. Save and provision dashboard
5. Export JSON for version control

## Maintenance

### Regular Tasks

- Review and acknowledge alerts
- Check dashboard health daily
- Monitor resource usage trends
- Update sampling rates as needed
- Archive old trace data

### Upgrades

When upgrading OpenTelemetry components:
1. Review changelog for breaking changes
2. Test in development environment
3. Update instrumentation libraries
4. Verify metric/trace compatibility
5. Roll out gradually

## Security Considerations

- Don't expose telemetry endpoints publicly
- Sanitize sensitive data in spans/logs
- Use TLS for external exporters
- Implement RBAC in Grafana
- Secure Prometheus endpoints

## Additional Resources

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Grafana Best Practices](https://grafana.com/docs/grafana/latest/best-practices/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [Jaeger Performance Tuning](https://www.jaegertracing.io/docs/latest/performance-tuning/)