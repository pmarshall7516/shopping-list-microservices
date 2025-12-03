import time
import uuid
from typing import List as ListType

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware

from auth import get_current_user
from database import get_lists_collection
from metrics import send_metric
from schemas import ListCreate, ListItemCreate, ListItemResponse, ListItemUpdate, ListResponse, ListUpdate

load_dotenv()

SERVICE_NAME = "list_service"
app = FastAPI(title="Smart Shopping List - List Service")

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


def serialize_list(doc) -> ListResponse:
    items = [
        ListItemResponse(
            id=item.get("id"),
            item_id=item.get("item_id"),
            quantity=item.get("quantity", 1),
            notes=item.get("notes"),
            checked=item.get("checked", False),
        )
        for item in doc.get("items", [])
    ]
    return ListResponse(
        id=doc.get("_id"),
        user_id=doc.get("user_id"),
        name=doc.get("name"),
        description=doc.get("description"),
        items=items,
    )


@app.get("/health")
async def health():
    return {"service": SERVICE_NAME, "status": "ok"}


@app.get("/lists", response_model=list[ListResponse])
async def list_lists(current_user=Depends(get_current_user)):
    collection = get_lists_collection()
    cursor = collection.find({"user_id": current_user["id"]})
    results: ListType[ListResponse] = []
    async for doc in cursor:
        results.append(serialize_list(doc))
    return results


@app.post("/lists", response_model=ListResponse, status_code=status.HTTP_201_CREATED)
async def create_list(payload: ListCreate, current_user=Depends(get_current_user)):
    collection = get_lists_collection()
    list_id = str(uuid.uuid4())
    doc = {
        "_id": list_id,
        "user_id": current_user["id"],
        "name": payload.name,
        "description": payload.description,
        "items": [],
    }
    await collection.insert_one(doc)
    return serialize_list(doc)


async def get_user_list(list_id: str, user_id: str):
    collection = get_lists_collection()
    doc = await collection.find_one({"_id": list_id, "user_id": user_id})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="List not found")
    return doc


@app.get("/lists/{list_id}", response_model=ListResponse)
async def get_list(list_id: str, current_user=Depends(get_current_user)):
    doc = await get_user_list(list_id, current_user["id"])
    return serialize_list(doc)


@app.put("/lists/{list_id}", response_model=ListResponse)
async def update_list(list_id: str, payload: ListUpdate, current_user=Depends(get_current_user)):
    collection = get_lists_collection()
    doc = await get_user_list(list_id, current_user["id"])
    update_data = {k: v for k, v in payload.dict(exclude_none=True).items()}
    if update_data:
        await collection.update_one({"_id": list_id}, {"$set": update_data})
        doc.update(update_data)
    return serialize_list(doc)


@app.delete("/lists/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_list(list_id: str, current_user=Depends(get_current_user)):
    collection = get_lists_collection()
    await get_user_list(list_id, current_user["id"])
    await collection.delete_one({"_id": list_id})
    return {}


@app.post("/lists/{list_id}/items", response_model=ListResponse)
async def add_list_item(list_id: str, payload: ListItemCreate, current_user=Depends(get_current_user)):
    collection = get_lists_collection()
    doc = await get_user_list(list_id, current_user["id"])
    list_item = {
        "id": str(uuid.uuid4()),
        "item_id": payload.item_id,
        "quantity": payload.quantity,
        "notes": payload.notes,
        "checked": payload.checked,
    }
    doc.setdefault("items", []).append(list_item)
    await collection.update_one({"_id": list_id}, {"$set": {"items": doc["items"]}})
    return serialize_list(doc)


@app.put("/lists/{list_id}/items/{list_item_id}", response_model=ListResponse)
async def update_list_item(list_id: str, list_item_id: str, payload: ListItemUpdate, current_user=Depends(get_current_user)):
    collection = get_lists_collection()
    doc = await get_user_list(list_id, current_user["id"])
    updated = False
    for item in doc.get("items", []):
        if item.get("id") == list_item_id:
            data = payload.dict(exclude_none=True)
            item.update(data)
            updated = True
            break
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="List item not found")
    await collection.update_one({"_id": list_id}, {"$set": {"items": doc.get("items", [])}})
    return serialize_list(doc)


@app.delete("/lists/{list_id}/items/{list_item_id}", response_model=ListResponse)
async def delete_list_item(list_id: str, list_item_id: str, current_user=Depends(get_current_user)):
    collection = get_lists_collection()
    doc = await get_user_list(list_id, current_user["id"])
    items = [item for item in doc.get("items", []) if item.get("id") != list_item_id]
    doc["items"] = items
    await collection.update_one({"_id": list_id}, {"$set": {"items": items}})
    return serialize_list(doc)


# Developer note: All list operations are scoped to the authenticated user via JWT bearer tokens.
# Mongo connection is configured through MONGO_URI/DB_NAME env vars.
# Metrics are emitted to the Stats Service when STATS_SERVICE_URL is configured.
