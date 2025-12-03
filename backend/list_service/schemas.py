from typing import List, Optional
from pydantic import BaseModel, Field


class ListItemCreate(BaseModel):
    item_id: str
    quantity: int = Field(default=1, ge=1)
    notes: Optional[str] = None
    checked: bool = False


class ListItemUpdate(BaseModel):
    quantity: Optional[int] = Field(default=None, ge=1)
    notes: Optional[str] = None
    checked: Optional[bool] = None


class ListCreate(BaseModel):
    name: str
    description: Optional[str] = None


class ListUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class ListItemResponse(BaseModel):
    id: str
    item_id: str
    quantity: int
    notes: Optional[str] = None
    checked: bool = False


class ListResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str] = None
    items: List[ListItemResponse] = []
