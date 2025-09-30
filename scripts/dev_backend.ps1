﻿Set-Location "$PSScriptRoot\..\services\agents-service"
Remove-Item Env:OPA_URL -ErrorAction SilentlyContinue
uvicorn app.main:app --host 0.0.0.0 --port 8070 --reload
