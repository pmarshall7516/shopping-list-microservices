import time
from collections import Counter
from typing import List as ListType

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from database import get_history_collection
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


@app.post("/recommendations", response_model=RecommendationResponse)
async def recommend(payload: RecommendationRequest):
    history = await fetch_user_history(payload.user_id)
    current_set = set(payload.current_items or [])

    # Simple placeholder logic: frequency-based recommendation excluding current list items.
    counter: Counter[str] = Counter()
    for record in history:
        for item in record.get("items", []):
            counter[item] += 1

    recommendations: ListType[RecommendationItem] = []
    for item_id, freq in counter.most_common(5):
        if item_id in current_set:
            continue
        recommendations.append(
            RecommendationItem(
                item_id=item_id,
                score=float(freq),
                reason="Frequently purchased previously but not in current list",
            )
        )

    # If we have no history, return a few generic placeholders for UI development.
    if not recommendations:
        fallback = ["milk", "bread", "eggs"]
        for idx, item in enumerate(fallback, start=1):
            recommendations.append(
                RecommendationItem(
                    item_id=item,
                    score=float(len(fallback) - idx + 1),
                    reason="Starter suggestion placeholder",
                )
            )

    return RecommendationResponse(recommendations=recommendations)


# Developer notes:
# - This service currently reads historical list data from the list_history collection.
#   A background job could mirror data from the List Service or stream events here.
# - Real ML model training/inference can be plugged into recommend() replacing the frequency heuristic.
# - Mongo connection configured via MONGO_URI/DB_NAME env vars; metrics sent when STATS_SERVICE_URL is set.
