from fastapi import FastAPI, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from .db import Base, engine, SessionLocal
from .models import EventLog
from .schemas import EventOut

app = FastAPI(title="NurseOS API (Events)")
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

@app.get("/api/healthz")
def healthz(): return {"ok": True}

@app.get("/api/events", response_model=List[EventOut])
def list_events(
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    limit: int = 100,
    db: Session = Depends(get_db),
):
    q = db.query(EventLog).order_by(EventLog.ts.desc()).limit(limit)
    if status: q = q.filter(EventLog.status == status)
    if category: q = q.filter(EventLog.category == category)
    if resource_type: q = q.filter(EventLog.resource_type == resource_type)
    return q.all()
