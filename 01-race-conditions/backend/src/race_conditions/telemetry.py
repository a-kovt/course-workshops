from opentelemetry import metrics, trace
from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.asyncpg import AsyncPGInstrumentor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.metrics.view import ExplicitBucketHistogramAggregation, View
from opentelemetry.sdk.resources import SERVICE_INSTANCE_ID, SERVICE_NAME, Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

LATENCY_BUCKETS_MS = (
    5, 10, 25, 50, 100, 250, 500, 1_000, 2_500, 5_000,
    10_000, 20_000, 30_000, 60_000, 120_000, 300_000,
)  # fmt: skip


def setup_telemetry(service_name: str, instance: str) -> None:
    resource = Resource.create({SERVICE_NAME: service_name, SERVICE_INSTANCE_ID: instance})

    tracer_provider = TracerProvider(resource=resource)
    tracer_provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
    trace.set_tracer_provider(tracer_provider)

    reader = PeriodicExportingMetricReader(OTLPMetricExporter(), export_interval_millis=5_000)
    latency = View(
        instrument_name="prize_*",
        aggregation=ExplicitBucketHistogramAggregation(LATENCY_BUCKETS_MS),
    )
    metrics.set_meter_provider(
        MeterProvider(resource=resource, metric_readers=[reader], views=[latency])
    )

    AsyncPGInstrumentor().instrument()
