"""Prometheus collectors (contract §2.2 /metrics).

The contract requires request count, request latency histogram, triage latency
and a fallback counter; labels are bounded (route templates, four providers) so
the registry stays small under load.
"""

from prometheus_client import Counter, Histogram

HTTP_REQUESTS_TOTAL = Counter(
    "http_requests_total",
    "Total HTTP requests handled, by method, route template and status code.",
    ["method", "route", "status"],
)

HTTP_REQUEST_DURATION_SECONDS = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds, by method and route template.",
    ["method", "route"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)

TRIAGE_DURATION_SECONDS = Histogram(
    "triage_duration_seconds",
    "AI triage pipeline latency in seconds, by active provider.",
    ["provider"],
    buckets=(0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)

TRIAGE_FALLBACKS_TOTAL = Counter(
    "triage_fallbacks_total",
    "Triage attempts that degraded to the rules provider or failed, by active provider.",
    ["provider"],
)
