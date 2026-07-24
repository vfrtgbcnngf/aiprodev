from pydantic import BaseModel, Field
from datetime import date

class FortuneRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=10)
    birth: date = Field(...)

    class Config:
        json_schema_extra = {
            "example": {"name": "홍길동", "birth": "2026-07-17"}
        }