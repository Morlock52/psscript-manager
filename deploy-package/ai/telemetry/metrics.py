"""
OpenTelemetry metrics configuration for AI service
"""
import os
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.resources import Resource, SERVICE_NAME, SERVICE_VERSION
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.prometheus import PrometheusMetricReader
from prometheus_client import start_http_server
import logging

logger = logging.getLogger(__name__)

# Configure resource
resource = Resource.create({
    SERVICE_NAME: "psscript-ai-service",
    SERVICE_VERSION: "0.1.0",
    "service.namespace": "psscript",
})

# Configure OTLP metric exporter
otlp_exporter = OTLPMetricExporter(
    endpoint=os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "otel-collector:4317"),
    insecure=True,
)

# Configure metric readers
otlp_reader = PeriodicExportingMetricReader(
    exporter=otlp_exporter,
    export_interval_millis=10000,  # Export every 10 seconds
)

# Configure Prometheus exporter
prometheus_reader = PrometheusMetricReader()

# Create meter provider
meter_provider = MeterProvider(
    resource=resource,
    metric_readers=[otlp_reader, prometheus_reader],
)

# Set meter provider
metrics.set_meter_provider(meter_provider)

# Get meter
meter = metrics.get_meter("psscript.ai", "1.0.0")

# Create metrics
script_analysis_counter = meter.create_counter(
    "ai_script_analysis_total",
    description="Total number of script analyses performed",
    unit="1",
)

embedding_generation_counter = meter.create_counter(
    "ai_embeddings_generated_total",
    description="Total number of embeddings generated",
    unit="1",
)

ai_api_request_counter = meter.create_counter(
    "ai_api_requests_total",
    description="Total number of AI API requests",
    unit="1",
)

ai_token_usage_counter = meter.create_counter(
    "ai_tokens_used_total",
    description="Total number of tokens used",
    unit="1",
)

script_analysis_duration_histogram = meter.create_histogram(
    "ai_script_analysis_duration_seconds",
    description="Duration of script analysis operations",
    unit="seconds",
)

embedding_generation_duration_histogram = meter.create_histogram(
    "ai_embedding_generation_duration_seconds",
    description="Duration of embedding generation",
    unit="seconds",
)

ai_api_response_time_histogram = meter.create_histogram(
    "ai_api_response_time_seconds",
    description="Response time for AI API calls",
    unit="seconds",
)

script_complexity_histogram = meter.create_histogram(
    "ai_script_complexity_score",
    description="Complexity scores of analyzed scripts",
    unit="1",
)

script_security_histogram = meter.create_histogram(
    "ai_script_security_score",
    description="Security scores of analyzed scripts",
    unit="1",
)

# Observable gauges
active_analysis_gauge = meter.create_observable_gauge(
    "ai_active_analyses",
    callbacks=[],
    description="Number of currently active script analyses",
    unit="1",
)

model_queue_size_gauge = meter.create_observable_gauge(
    "ai_model_queue_size",
    callbacks=[],
    description="Size of the AI model request queue",
    unit="1",
)

# Active analysis tracking
_active_analyses = 0
_model_queue_size = 0

def _get_active_analyses():
    """Callback for active analyses gauge"""
    return [(_active_analyses, {})]

def _get_model_queue_size():
    """Callback for model queue size gauge"""
    return [(_model_queue_size, {})]

# Set callbacks
active_analysis_gauge.add_callback(_get_active_analyses)
model_queue_size_gauge.add_callback(_get_model_queue_size)

def start_metrics_server(port: int = 9090):
    """Start Prometheus metrics server"""
    try:
        start_http_server(port)
        logger.info(f"Prometheus metrics server started on port {port}")
    except Exception as e:
        logger.error(f"Failed to start metrics server: {e}")

# Helper functions for recording metrics
def record_script_analysis(status: str, duration: float, complexity: float = None, security: float = None):
    """Record script analysis metrics"""
    script_analysis_counter.add(1, {"status": status})
    script_analysis_duration_histogram.record(duration, {"status": status})
    
    if complexity is not None:
        script_complexity_histogram.record(complexity)
    
    if security is not None:
        script_security_histogram.record(security)

def record_embedding_generation(text_type: str, duration: float, token_count: int = 0):
    """Record embedding generation metrics"""
    embedding_generation_counter.add(1, {"text_type": text_type})
    embedding_generation_duration_histogram.record(duration, {"text_type": text_type})
    
    if token_count > 0:
        ai_token_usage_counter.add(token_count, {"operation": "embedding", "text_type": text_type})

def record_ai_api_request(provider: str, model: str, operation: str, status: str, duration: float, tokens: int = 0):
    """Record AI API request metrics"""
    labels = {
        "provider": provider,
        "model": model,
        "operation": operation,
        "status": status
    }
    
    ai_api_request_counter.add(1, labels)
    ai_api_response_time_histogram.record(duration, labels)
    
    if tokens > 0:
        ai_token_usage_counter.add(tokens, labels)

def increment_active_analyses():
    """Increment active analyses counter"""
    global _active_analyses
    _active_analyses += 1

def decrement_active_analyses():
    """Decrement active analyses counter"""
    global _active_analyses
    _active_analyses = max(0, _active_analyses - 1)

def set_model_queue_size(size: int):
    """Set model queue size"""
    global _model_queue_size
    _model_queue_size = size

# Context managers for tracking durations
class AnalysisTimer:
    """Context manager for timing script analysis"""
    def __init__(self):
        self.start_time = None
        
    def __enter__(self):
        import time
        self.start_time = time.time()
        increment_active_analyses()
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        import time
        duration = time.time() - self.start_time
        decrement_active_analyses()
        
        if exc_type is None:
            return duration
        return False

class EmbeddingTimer:
    """Context manager for timing embedding generation"""
    def __init__(self):
        self.start_time = None
        
    def __enter__(self):
        import time
        self.start_time = time.time()
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        import time
        duration = time.time() - self.start_time
        
        if exc_type is None:
            return duration
        return False