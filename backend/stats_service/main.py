import time
from typing import List as ListType

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from database import get_metrics_collection
from schemas import MetricCreate, MetricSummary, MethodSummary

load_dotenv()

SERVICE_NAME = "stats_service"
app = FastAPI(title="Smart Shopping List - Stats Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def record_metrics(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    # Stats service self-metrics could be sent elsewhere; omitted to avoid recursion.
    return response


@app.get("/health")
async def health():
    return {"service": SERVICE_NAME, "status": "ok"}


@app.post("/metrics", status_code=201)
async def ingest_metric(payload: MetricCreate):
    collection = get_metrics_collection()
    await collection.insert_one(payload.model_dump())
    return {"status": "recorded"}


@app.get("/metrics/summary", response_model=list[MetricSummary])
async def metrics_summary():
    collection = get_metrics_collection()
    pipeline = [
        {
            "$group": {
                "_id": {
                    "service_name": "$service_name",
                    "endpoint": "$endpoint",
                    "method": "$method",
                },
                "request_count": {"$sum": 1},
                "average_latency_ms": {"$avg": "$latency_ms"},
            }
        }
    ]
    cursor = collection.aggregate(pipeline)
    summaries: ListType[MetricSummary] = []
    async for doc in cursor:
        meta = doc.get("_id", {})
        summaries.append(
            MetricSummary(
                service_name=meta.get("service_name"),
                endpoint=meta.get("endpoint"),
                method=meta.get("method"),
                request_count=doc.get("request_count", 0),
                average_latency_ms=doc.get("average_latency_ms", 0.0),
            )
        )
    return summaries


@app.get("/metrics/method-summary", response_model=list[MethodSummary])
async def metrics_method_summary():
    collection = get_metrics_collection()
    pipeline = [
        {
            "$group": {
                "_id": {
                    "service_name": "$service_name",
                    "method": "$method",
                },
                "request_count": {"$sum": 1},
                "average_latency_ms": {"$avg": "$latency_ms"},
            }
        },
        {"$sort": {"_id.method": 1, "_id.service_name": 1}},
    ]
    cursor = collection.aggregate(pipeline)
    summaries: ListType[MethodSummary] = []
    async for doc in cursor:
        meta = doc.get("_id", {})
        summaries.append(
            MethodSummary(
                service_name=meta.get("service_name"),
                method=meta.get("method"),
                request_count=doc.get("request_count", 0),
                average_latency_ms=doc.get("average_latency_ms", 0.0),
            )
        )
    return summaries


# Developer note: Other services can POST metrics here. MongoDB configured via MONGO_URI/DB_NAME env vars.
