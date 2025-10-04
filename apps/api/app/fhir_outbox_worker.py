import os
import asyncio
import datetime as dt
import random
import httpx
from sqlalchemy.orm import Session
from .db import SessionLocal
from .models import FHIROutbox, FHIRRetryHistory

RETRIABLE = {408, 409, 425, 429, 500, 502, 503, 504}
MAX_ATTEMPTS = int(os.getenv("OUTBOX_MAX_ATTEMPTS", "6"))
CONCURRENCY = int(os.getenv("OUTBOX_CONCURRENCY", "3"))

def next_delay(attempt: int) -> int:
    base = min(2 ** attempt, 300)  # máx 5 min
    return int(base * random.uniform(0.5, 1.5))

async def _send_one(client: httpx.AsyncClient, r: FHIROutbox, db: Session):
    method_map = {
        "CREATE": "POST", "UPDATE": "PUT", "DELETE": "DELETE",
        "PATCH": "PATCH", "UPSERT": "PUT"
    }
    method = method_map.get(r.operation, "POST")

    base = r.endpoint.rstrip("/")
    url = f"{base}/{r.resource_type}"
    if r.resource_id and method != "POST":
        url += f"/{r.resource_id}"

    headers = (r.headers or {}).copy()
    headers.setdefault("Idempotency-Key", r.idempotency_key or str(r.id))

    body = None if method == "DELETE" else (r.body or {})

    status_code = 0
    try:
        resp = await client.request(
            method, url, json=body, headers=headers, timeout=30
        )
        status_code = resp.status_code
        ok = 200 <= status_code < 300
        retriable = status_code in RETRIABLE

        if ok:
            r.status = "SENT"
            r.updated_at = dt.datetime.utcnow()
            r.last_error = None
            db.commit()
            return

        # fallo HTTP
        r.attempts += 1
        if retriable and r.attempts < MAX_ATTEMPTS:
            r.status = "PENDING"
            r.available_at = dt.datetime.utcnow() + dt.timedelta(
                seconds=next_delay(r.attempts)
            )
        else:
            r.status = "DEAD"
        r.updated_at = dt.datetime.utcnow()
        text = (resp.text or "")[:2000]
        r.last_error = f"{status_code}: {text}"
        db.add(FHIRRetryHistory(
            outbox_id=r.id, attempt=r.attempts, http_status=status_code,
            error=text, response_body=None
        ))
        db.commit()

    except Exception as e:
        # error de red/timeout/etc.
        r.attempts += 1
        r.updated_at = dt.datetime.utcnow()
        msg = str(e)[:2000]
        if r.attempts < MAX_ATTEMPTS:
            r.status = "PENDING"
            r.available_at = dt.datetime.utcnow() + dt.timedelta(
                seconds=next_delay(r.attempts)
            )
        else:
            r.status = "DEAD"
        r.last_error = f"EXC: {msg}"
        db.add(FHIRRetryHistory(
            outbox_id=r.id, attempt=r.attempts, http_status=status_code,
            error=msg, response_body=None
        ))
        db.commit()

async def worker_loop():
    async with httpx.AsyncClient() as client:
        while True:
            now = dt.datetime.utcnow()
            with SessionLocal() as db:
                rows = (
                    db.query(FHIROutbox)
                    .filter(FHIROutbox.status.in_(("PENDING", "FAILED")))
                    .filter(FHIROutbox.available_at <= now)
                    .order_by(FHIROutbox.priority.asc(), FHIROutbox.available_at.asc())
                    .limit(10)
                    .all()
                )

                if not rows:
                    await asyncio.sleep(2)
                    continue

                # marca como SENDING
                for r in rows:
                    r.status = "SENDING"
                db.commit()

                sem = asyncio.Semaphore(CONCURRENCY)

                async def run(rec: FHIROutbox):
                    async with sem:
                        await _send_one(client, rec, db)

                await asyncio.gather(*[run(r) for r in rows])
