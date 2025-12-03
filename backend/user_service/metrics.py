import os
import time
import httpx

STATS_SERVICE_URL = os.getenv("STATS_SERVICE_URL")


async def send_metric(service_name: str, endpoint: str, method: str, status_code: int, start_time: float):
    """Send metrics to the Stats Service. Safe to fail silently so it never blocks business logic."""
    if not STATS_SERVICE_URL:
        return
    latency_ms = int((time.time() - start_time) * 1000)
    payload = {
        "service_name": service_name,
        "endpoint": endpoint,
        "method": method,
        "status_code": status_code,
        "latency_ms": latency_ms,
    }
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            await client.post(f"{STATS_SERVICE_URL}/metrics", json=payload)
    except Exception:
        # Intentionally swallow errors to avoid affecting main requests.
        return
