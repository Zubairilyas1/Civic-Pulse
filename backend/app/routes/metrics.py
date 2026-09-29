from fastapi import APIRouter, Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

router = APIRouter(tags=["Observability"])


@router.get("/metrics")
def metrics() -> Response:
    """Prometheus text exposition: request count, request latency histogram,
    triage latency histogram and the triage fallback counter (contract §2.2)."""
    return Response(content=generate_latest(), headers={"Content-Type": CONTENT_TYPE_LATEST})
