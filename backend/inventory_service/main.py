import time
import uuid
from typing import List as ListType, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware

from database import get_categories_collection, get_items_collection
from metrics import send_metric
from schemas import CategoryCreate, CategoryResponse, ItemCreate, ItemResponse, ItemUpdate

load_dotenv()

SERVICE_NAME = "inventory_service"
app = FastAPI(title="Smart Shopping List - Inventory Service")

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


def serialize_item(doc) -> ItemResponse:
    return ItemResponse(
        id=doc.get("_id"),
        name=doc.get("name"),
        category=doc.get("category"),
        default_unit=doc.get("default_unit"),
        description=doc.get("description"),
        barcode=doc.get("barcode"),
    )


def serialize_category(doc) -> CategoryResponse:
    return CategoryResponse(id=doc.get("_id"), name=doc.get("name"), description=doc.get("description"))


@app.get("/health")
async def health():
    return {"service": SERVICE_NAME, "status": "ok"}


@app.get("/items", response_model=list[ItemResponse])
async def list_items(category: Optional[str] = None, text: Optional[str] = Query(default=None)):
    collection = get_items_collection()
    filters = {}
    if category:
        filters["category"] = category
    if text:
        filters["name"] = {"$regex": text, "$options": "i"}
    cursor = collection.find(filters)
    results: ListType[ItemResponse] = []
    async for doc in cursor:
        results.append(serialize_item(doc))
    return results


@app.post("/items", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(payload: ItemCreate):
    collection = get_items_collection()
    item_id = str(uuid.uuid4())
    doc = {"_id": item_id, **payload.model_dump()}
    await collection.insert_one(doc)
    return serialize_item(doc)


async def get_item_or_404(item_id: str):
    collection = get_items_collection()
    doc = await collection.find_one({"_id": item_id})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return doc


@app.get("/items/{item_id}", response_model=ItemResponse)
async def get_item(item_id: str):
    doc = await get_item_or_404(item_id)
    return serialize_item(doc)


@app.put("/items/{item_id}", response_model=ItemResponse)
async def update_item(item_id: str, payload: ItemUpdate):
    collection = get_items_collection()
    doc = await get_item_or_404(item_id)
    update_data = payload.dict(exclude_none=True)
    if update_data:
        await collection.update_one({"_id": item_id}, {"$set": update_data})
        doc.update(update_data)
    return serialize_item(doc)


@app.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(item_id: str):
    collection = get_items_collection()
    await get_item_or_404(item_id)
    await collection.delete_one({"_id": item_id})
    return {}


@app.get("/categories", response_model=list[CategoryResponse])
async def list_categories():
    collection = get_categories_collection()
    cursor = collection.find({})
    results: ListType[CategoryResponse] = []
    async for doc in cursor:
        results.append(serialize_category(doc))
    return results


@app.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(payload: CategoryCreate):
    collection = get_categories_collection()
    cat_id = str(uuid.uuid4())
    doc = {"_id": cat_id, **payload.model_dump()}
    await collection.insert_one(doc)
    return serialize_category(doc)


# Developer note: Inventory data is global in this starter; per-user scoping can be layered later.
# MongoDB connection uses MONGO_URI/DB_NAME env vars.
# Metrics emitted to Stats Service when STATS_SERVICE_URL is set.
