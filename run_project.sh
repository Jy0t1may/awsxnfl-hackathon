#!/bin/bash
set -e

# GridironLens Startup Script for AWS x NFL Hackathon
echo "=========================================================="
echo "    🏈 STARTING GRIDIRONLENS: AWS x NFL VISUAL ANALYTICS  "
echo "=========================================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 1. Check Python virtual environment
VENV_DIR="$SCRIPT_DIR/.venv"
if [ ! -d "$VENV_DIR" ]; then
    echo "[1/4] Creating Python 3.12 virtual environment..."
    if command -v python3.12 >/dev/null 2>&1; then
        python3.12 -m venv .venv
    elif [ -f "/opt/homebrew/bin/python3.12" ]; then
        /opt/homebrew/bin/python3.12 -m venv .venv
    else
        python3 -m venv .venv
    fi
    .venv/bin/pip install --upgrade pip
    .venv/bin/pip install "pandas>=2.0" duckdb fastapi uvicorn pyarrow requests polars httpx
fi

PYTHON_BIN="$VENV_DIR/bin/python"

# 2. Run ETL Pipeline if DuckDB database or golden plays do not exist
if [ ! -f "data/processed/gridiron.duckdb" ] || [ ! -f "data/processed/golden_plays/play_2032.json" ]; then
    echo "[2/4] Running ETL Pipeline (Ingesting Regional + nflverse + PFR)..."
    "$PYTHON_BIN" backend/etl_pipeline.py
else
    echo "[2/4] Processed database and golden plays already generated ✓"
fi

# 3. Check and install frontend dependencies if needed
if [ ! -d "frontend/node_modules" ]; then
    echo "[3/4] Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

# Ensure frontend production dist exists
if [ ! -d "frontend/dist" ]; then
    echo "[3/4] Building frontend production bundle..."
    cd frontend && npm run build && cd ..
fi

echo "[4/4] Launching FastAPI Backend & Vite Frontend..."
echo ""
echo "----------------------------------------------------------"
echo "  🚀 FASTAPI BACKEND:  http://127.0.0.1:8000"
echo "  🌐 VITE FRONTEND:     http://localhost:5173"
echo "  📖 API DOCS (SWAGGER): http://127.0.0.1:8000/docs"
echo "----------------------------------------------------------"
echo "Press Ctrl+C to stop both servers."
echo ""

# Cleanup trap to kill child processes on Ctrl+C
cleanup() {
    echo ""
    echo "Shutting down servers..."
    kill "$BACKEND_PID" 2>/dev/null || true
    kill "$FRONTEND_PID" 2>/dev/null || true
    wait 2>/dev/null || true
    echo "Servers stopped. Bye!"
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# Start backend
"$PYTHON_BIN" -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait 1s for backend
sleep 1

# Start Vite frontend
cd frontend
npx vite --port 5173 --host 0.0.0.0 &
FRONTEND_PID=$!
cd ..

# Wait for both processes
wait
