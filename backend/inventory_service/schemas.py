from typing import Optional
from pydantic import BaseModel


class ItemBase(BaseModel):
    name: str
    category: Optional[str] = None
    default_unit: Optional[str] = None
    description: Optional[str] = None
    barcode: Optional[str] = None


class ItemCreate(ItemBase):
    pass


class ItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    default_unit: Optional[str] = None
    description: Optional[str] = None
    barcode: Optional[str] = None


class ItemResponse(ItemBase):
    id: str


class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None


class CategoryCreate(CategoryBase):
    pass


class CategoryResponse(CategoryBase):
    id: str
