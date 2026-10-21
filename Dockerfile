# Multi-stage Dockerfile: Frontend Builder + Python Backend
# Stage 1: Build the React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# Stage 2: Python FastAPI + DuckDB Backend
FROM python:3.12-slim
WORKDIR /app

# Install system dependencies (curl for healthchecks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy application source code and data
COPY backend/ ./backend/
COPY data/ ./data/
COPY nfl-big-data-bowl-regional-event-data/ ./nfl-big-data-bowl-regional-event-data/

# Copy built frontend assets from Stage 1 into frontend/dist
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 8000

ENV PORT=8000
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
