from fastapi import FastAPI, Depends, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional, Any, Dict
from .db import Base, engine, SessionLocal
from .models import EventLog
from .schemas import EventOut

app = FastAPI(title="NurseOS API (Events/Handover)")
Base.metadata.create_all(bind=engine)

# CORS básico (ajusta orígenes para tu dominio)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ← cámbialo si necesitas restringir
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/api/healthz")
def healthz():
    return {"ok": True}

@app.get("/api/events", response_model=List[EventOut])
def list_events(
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    limit: int = 100,
    db: Session = Depends(get_db),
):
    q = db.query(EventLog).order_by(EventLog.ts.desc()).limit(limit)
    if status:
        q = q.filter(EventLog.status == status)
    if category:
        q = q.filter(EventLog.category == category)
    if resource_type:
        q = q.filter(EventLog.resource_type == resource_type)
    return q.all()

# --- Auditoría simple desde el frontend (opcional) ---
class AuditIn(BaseModel):
    action: str
    status: str = "ok"
    category: str = "handover"
    resource_type: str = "DocumentReference"
    resource_id: Optional[str] = None
    data: Optional[Dict[str, Any]] = None

@app.post("/api/audit")
def create_audit(ev: AuditIn, db: Session = Depends(get_db)):
    try:
        obj = EventLog(
            status=ev.status,
            category=ev.category,
            resource_type=ev.resource_type,
            resource_id=ev.resource_id,
            action=ev.action,
            data=ev.data,  # si tu modelo es JSONB/JSON; si no, cambia a str(ev.data)
        )
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return {"ok": True, "id": getattr(obj, "id", None)}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"audit insert failed: {e}")

