from random import choice, randint
from .db import SessionLocal, Base, engine
from .models import EventLog

Base.metadata.create_all(bind=engine)
db = SessionLocal()
cats = ["FHIR","AUTH","UI","ABAC","JOB"]
acts = ["CREATE","UPDATE","DELETE","SEND","RETRY"]
stats = ["OK","ERROR"]
types = ["Patient","Observation","Encounter","Consent"]

for _ in range(50):
    ev = EventLog(
        category=choice(cats), action=choice(acts), status=choice(stats),
        resource_type=choice(types), resource_id=str(randint(1,9999)),
        http_status=choice([200,201,400,401,403,409,500,503]),
        request_body={"demo": True}, response_body={"ok": True}
    )
    db.add(ev)
db.commit(); db.close()
print("Seed OK")
