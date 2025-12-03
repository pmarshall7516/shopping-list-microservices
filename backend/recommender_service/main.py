import time
from collections import Counter
from typing import List as ListType

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from database import get_history_collection, get_lists_collection
from metrics import send_metric
from schemas import RecommendationItem, RecommendationRequest, RecommendationResponse

load_dotenv()

SERVICE_NAME = "recommender_service"
app = FastAPI(title="Smart Shopping List - Recommendation Service")

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
    await send_metric(SERVICE_NAME, request.url.path, request.method, response.status_code, start)
    return response


@app.get("/health")
async def health():
    return {"service": SERVICE_NAME, "status": "ok"}


async def fetch_user_history(user_id: str):
    collection = get_history_collection()
    cursor = collection.find({"user_id": user_id})
    history = []
    async for doc in cursor:
        history.append(doc)
    return history


async def cooccurrence_scores(current_items: set[str], current_list_id: str | None):
    """Compute similarity scores based on co-occurrence across lists (simple clustering heuristic)."""
    collection = get_lists_collection()
    cursor = collection.find({})
    score: Counter[str] = Counter()
    async for doc in cursor:
        if current_list_id and doc.get("_id") == current_list_id:
            continue
        items = {item.get("item_id") for item in doc.get("items", []) if item.get("item_id")}
        if len(items) < 2:
            continue
        overlap = current_items.intersection(items)
        if not overlap:
            continue
        for candidate in items:
            if candidate in current_items:
                continue
            # Score boost by overlap size and list size to mimic clustering proximity
            score[candidate] += 1 + (len(overlap) / max(len(items), 1))
    return score


@app.post("/recommendations", response_model=RecommendationResponse)
async def recommend(payload: RecommendationRequest):
    current_set = set(payload.current_items or [])
    if len(current_set) < 2:
        return RecommendationResponse(recommendations=[])

    recs_counter = await cooccurrence_scores(current_set, payload.list_id)

    # Blend in user history to break ties / enrich scoring
    history = await fetch_user_history(payload.user_id)
    for record in history:
        for item in record.get("items", []):
            if item in current_set:
                continue
            recs_counter[item] += 0.5

    recommendations: ListType[RecommendationItem] = []
    for item_id, freq in recs_counter.most_common(10):
        if item_id in current_set:
            continue
        reason = "Often bought with your current items"
        recommendations.append(
            RecommendationItem(
                item_id=item_id,
                score=float(freq),
                reason=reason,
            )
        )

    return RecommendationResponse(recommendations=recommendations)


# Developer notes:
# - This service currently reads historical list data from the list_history collection.
#   A background job could mirror data from the List Service or stream events here.
# - Real ML model training/inference can be plugged into recommend() replacing the frequency heuristic.
# - Mongo connection configured via MONGO_URI/DB_NAME env vars; metrics sent when STATS_SERVICE_URL is set.
