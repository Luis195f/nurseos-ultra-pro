from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Any

class EventOut(BaseModel):
    id: int
    ts: datetime
    category: Optional[str] = None
    action: Optional[str] = None
    status: Optional[str] = None
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    http_status: Optional[int] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    request_body: Optional[Any] = None
    response_body: Optional[Any] = None
    meta: Optional[Any] = None
    class Config:
        from_attributes = True
