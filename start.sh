#!/bin/bash
set -e

echo "========================================="
echo "  AuditFlow — starting up"
echo "========================================="
echo ""

# Check Python
if ! command -v python3 &>/dev/null; then
  echo "ERROR: python3 not found. Install Python 3.8+ first."
  exit 1
fi

# Check Node
if ! command -v node &>/dev/null; then
  echo "ERROR: node not found. Install Node.js 18+ first."
  exit 1
fi

# Install Python deps
echo "[1/3] Installing Python dependencies..."
pip3 install flask flask-cors dnspython google-genai google-generativeai requests beautifulsoup4 lxml google-auth google-api-python-client -q
echo "      ✅ Python deps ready"

# Install Node deps
echo "[2/3] Installing Node dependencies..."
npm install --silent
echo "      ✅ Node deps ready"

# Start backend
echo "[3/3] Starting backend on port 5001..."
python3 server.py &
BACKEND_PID=$!
sleep 2

# Verify backend came up
if curl -s http://localhost:5001/api/health > /dev/null 2>&1; then
  echo "      ✅ Backend online"
else
  echo "      ⚠️  Backend may still be starting..."
fi

# Start frontend
echo ""
echo "Starting frontend on port 5173..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "========================================="
echo "  AuditFlow is running!"
echo ""
echo "  App:     http://localhost:5173"
echo "  Backend: http://localhost:5001"
echo ""
echo "  Press Ctrl+C to stop everything"
echo "========================================="

trap "echo ''; echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
