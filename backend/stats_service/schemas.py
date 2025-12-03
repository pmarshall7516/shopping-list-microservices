from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class MetricCreate(BaseModel):
    service_name: str
    endpoint: str
    method: str
    status_code: int
    latency_ms: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class MetricSummary(BaseModel):
    service_name: str
    endpoint: str
    method: str
    average_latency_ms: float
    request_count: int
