from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.dialects.sqlite import JSON as SQLiteJSON
from sqlalchemy.sql import func
from .db import Base

class EventLog(Base):
    __tablename__ = "event_log"
    id = Column(Integer, primary_key=True)
    ts = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    category = Column(String(32))
    action = Column(String(64))
    status = Column(String(16))
    resource_type = Column(String(64))
    resource_id = Column(String(64))
    http_status = Column(Integer)
    error_code = Column(String(64))
    error_message = Column(Text)
    request_body = Column(SQLiteJSON)
    response_body = Column(SQLiteJSON)
    meta = Column(SQLiteJSON)
