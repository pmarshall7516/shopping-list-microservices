import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("RECOMMENDER_DB_NAME", "smart_shopping_recommender")
LIST_DB_NAME = os.getenv("LIST_DB_NAME", "smart_shopping_lists")

_client: AsyncIOMotorClient | None = None

def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(MONGO_URI)
    return _client


def get_database():
    return get_client()[DB_NAME]


def get_history_collection():
    return get_database()["list_history"]


def get_lists_collection():
    return get_client()[LIST_DB_NAME]["lists"]
