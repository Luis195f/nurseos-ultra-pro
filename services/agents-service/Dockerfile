FROM python:3.11-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
RUN pip install --no-cache-dir --upgrade pip uvicorn fastapi
# Copiamos todo el servicio (si existe requirements.txt, se instalará)
COPY services/agents-service /app
RUN if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi
EXPOSE 8070
CMD ["uvicorn","app.main:app","--host","0.0.0.0","--port","8070"]
