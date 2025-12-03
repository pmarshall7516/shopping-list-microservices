import os
import time
import uuid
from typing import Any

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm

from auth import create_access_token, get_current_user, get_password_hash, verify_password
from database import get_user_collection
from metrics import send_metric
from schemas import TokenResponse, UserCreate, UserLogin, UserOut

load_dotenv()

SERVICE_NAME = "user_service"
app = FastAPI(title="Smart Shopping List - User Service")

# Allow all origins in dev; lock down for production.
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
    await send_metric(
        SERVICE_NAME,
        request.url.path,
        request.method,
        response.status_code,
        start,
    )
    return response


async def get_user_by_email(email: str) -> Any | None:
    user_collection = get_user_collection()
    return await user_collection.find_one({"email": email})


@app.get("/health")
async def health():
    return {"service": SERVICE_NAME, "status": "ok"}


@app.post("/auth/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate):
    user_collection = get_user_collection()
    existing = await get_user_by_email(payload.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user_id = str(uuid.uuid4())
    hashed_pw = get_password_hash(payload.password)
    user_doc = {
        "_id": user_id,
        "email": payload.email,
        "password": hashed_pw,
        "display_name": payload.display_name,
    }
    await user_collection.insert_one(user_doc)
    return UserOut(id=user_id, email=payload.email, display_name=payload.display_name)


@app.post("/auth/login", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await get_user_by_email(form_data.username)
    if not user or not verify_password(form_data.password, user.get("password")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token({"sub": user.get("_id"), "email": user.get("email")})
    return TokenResponse(access_token=token)


@app.get("/users/me", response_model=UserOut)
async def get_me(current_user=Depends(get_current_user)):
    return UserOut(id=current_user["id"], email=current_user["email"], display_name=current_user["display_name"])


# Developer note: Auth tokens are expected via Authorization: Bearer <token> header.
# JWT secret/algorithm can be configured via env vars: JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRES_MIN.
# This service connects to MongoDB using MONGO_URI/DB_NAME env vars.
# Metrics are sent to the Stats Service when STATS_SERVICE_URL is set.
