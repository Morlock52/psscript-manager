"""
OpenTelemetry tracing configuration for AI service
"""
import os
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.resources import Resource, SERVICE_NAME, SERVICE_VERSION, DEPLOYMENT_ENVIRONMENT
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.psycopg2 import Psycopg2Instrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.instrumentation.aiohttp_client import AioHttpClientInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.trace import Status, StatusCode
from functools import wraps
import logging

logger = logging.getLogger(__name__)

# Configure resource
resource = Resource.create({
    SERVICE_NAME: "psscript-ai-service",
    SERVICE_VERSION: "0.1.0",
    DEPLOYMENT_ENVIRONMENT: os.getenv("NODE_ENV", "development"),
    "service.namespace": "psscript",
    "service.instance.id": os.getenv("HOSTNAME", "local"),
})

# Configure tracer provider
provider = TracerProvider(resource=resource)

# Configure OTLP exporter
otlp_exporter = OTLPSpanExporter(
    endpoint=os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "otel-collector:4317"),
    insecure=True,
)

# Add span processor
provider.add_span_processor(BatchSpanProcessor(otlp_exporter))

# Set tracer provider
trace.set_tracer_provider(provider)

# Get tracer
tracer = trace.get_tracer("psscript.ai", "1.0.0")

def initialize_instrumentations(app=None):
    """Initialize all instrumentations"""
    try:
        # Instrument FastAPI
        if app:
            FastAPIInstrumentor.instrument_app(
                app,
                tracer_provider=provider,
                excluded_urls="/health,/metrics"
            )
        
        # Instrument HTTP clients
        HTTPXClientInstrumentor().instrument(tracer_provider=provider)
        RequestsInstrumentor().instrument(tracer_provider=provider)
        AioHttpClientInstrumentor().instrument(tracer_provider=provider)
        
        # Instrument database
        Psycopg2Instrumentor().instrument(tracer_provider=provider)
        SQLAlchemyInstrumentor().instrument(tracer_provider=provider)
        
        # Instrument Redis
        RedisInstrumentor().instrument(tracer_provider=provider)
        
        logger.info("OpenTelemetry instrumentations initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing OpenTelemetry instrumentations: {e}")

def trace_async_function(span_name: str = None):
    """Decorator for tracing async functions"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            name = span_name or f"{func.__module__}.{func.__name__}"
            with tracer.start_as_current_span(name) as span:
                try:
                    # Add function attributes to span
                    span.set_attribute("function.name", func.__name__)
                    span.set_attribute("function.module", func.__module__)
                    
                    # Execute function
                    result = await func(*args, **kwargs)
                    
                    # Mark span as successful
                    span.set_status(Status(StatusCode.OK))
                    return result
                except Exception as e:
                    # Record exception
                    span.record_exception(e)
                    span.set_status(Status(StatusCode.ERROR, str(e)))
                    raise
        return wrapper
    return decorator

def trace_sync_function(span_name: str = None):
    """Decorator for tracing sync functions"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            name = span_name or f"{func.__module__}.{func.__name__}"
            with tracer.start_as_current_span(name) as span:
                try:
                    # Add function attributes to span
                    span.set_attribute("function.name", func.__name__)
                    span.set_attribute("function.module", func.__module__)
                    
                    # Execute function
                    result = func(*args, **kwargs)
                    
                    # Mark span as successful
                    span.set_status(Status(StatusCode.OK))
                    return result
                except Exception as e:
                    # Record exception
                    span.record_exception(e)
                    span.set_status(Status(StatusCode.ERROR, str(e)))
                    raise
        return wrapper
    return decorator

def add_span_attributes(**attributes):
    """Add attributes to the current span"""
    span = trace.get_current_span()
    if span and span.is_recording():
        for key, value in attributes.items():
            span.set_attribute(key, value)

def create_span(name: str, kind=trace.SpanKind.INTERNAL):
    """Create a new span"""
    return tracer.start_as_current_span(name, kind=kind)

# Custom span creators for AI operations
def create_ai_operation_span(operation: str, model: str = None):
    """Create a span for AI operations"""
    span = tracer.start_as_current_span(f"ai.{operation}")
    if span.is_recording():
        span.set_attribute("ai.operation", operation)
        if model:
            span.set_attribute("ai.model", model)
    return span

def create_script_analysis_span(script_name: str, script_size: int = None):
    """Create a span for script analysis"""
    span = tracer.start_as_current_span("script.analysis")
    if span.is_recording():
        span.set_attribute("script.name", script_name)
        if script_size:
            span.set_attribute("script.size", script_size)
    return span

def create_embedding_span(text_length: int = None):
    """Create a span for embedding generation"""
    span = tracer.start_as_current_span("ai.embedding")
    if span.is_recording():
        if text_length:
            span.set_attribute("embedding.text_length", text_length)
    return span