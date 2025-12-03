from typing import List, Optional
from pydantic import BaseModel


class RecommendationRequest(BaseModel):
    user_id: str
    list_id: Optional[str] = None
    current_items: List[str] = []


class RecommendationItem(BaseModel):
    item_id: str
    score: float
    reason: str


class RecommendationResponse(BaseModel):
    recommendations: List[RecommendationItem]
