#!/bin/bash
# Start ZeroKey Treasury development environment
# Access at http://localhost:8000 or https://zerokey.exe.xyz:8000

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo "========================================"
echo "ZeroKey Treasury - Development Server"
echo "========================================"
echo ""

# Kill existing processes
echo "Cleaning up existing processes..."
pkill -f "tsx watch" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
pkill -f "nginx.*nginx.conf" 2>/dev/null || true
sleep 2

# Create temp directories for nginx
mkdir -p /tmp/nginx-client-body /tmp/nginx-proxy /tmp/nginx-fastcgi /tmp/nginx-uwsgi /tmp/nginx-scgi

# Start backend (port 3001)
echo "Starting backend on port 3001..."
cd "$PROJECT_DIR/packages/backend"
pnpm dev > /tmp/zerokey-backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend
sleep 5
if curl -s http://localhost:3001/health > /dev/null; then
  echo "✅ Backend is running"
else
  echo "❌ Backend failed to start"
  cat /tmp/zerokey-backend.log
  exit 1
fi

# Start frontend (port 3000)
echo "Starting frontend on port 3000..."
cd "$PROJECT_DIR/packages/frontend"
PORT=3000 pnpm dev > /tmp/zerokey-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Wait for frontend
sleep 10
if curl -s http://localhost:3000 > /dev/null; then
  echo "✅ Frontend is running"
else
  echo "⚠️ Frontend may still be starting..."
fi

# Start nginx reverse proxy (port 8000)
echo "Starting nginx reverse proxy on port 8000..."
nginx -c "$PROJECT_DIR/nginx.conf" -g 'daemon off;' > /tmp/zerokey-nginx.log 2>&1 &
NGINX_PID=$!
echo "Nginx PID: $NGINX_PID"

sleep 2
if curl -s http://localhost:8000/health > /dev/null; then
  echo "✅ Reverse proxy is running"
else
  echo "❌ Reverse proxy failed"
  cat /tmp/zerokey-nginx.log
fi

echo ""
echo "========================================"
echo "ZeroKey Treasury is running!"
echo "========================================"
echo ""
echo "Access URLs:"
echo "  Local:    http://localhost:8000"
echo "  Public:   https://zerokey.exe.xyz:8000"
echo ""
echo "Endpoints:"
echo "  Frontend:  http://localhost:8000/"
echo "  API:       http://localhost:8000/api/"
echo "  Swagger:   http://localhost:8000/docs"
echo "  Health:    http://localhost:8000/health"
echo ""
echo "Logs:"
echo "  Backend:   /tmp/zerokey-backend.log"
echo "  Frontend:  /tmp/zerokey-frontend.log"
echo "  Nginx:     /tmp/zerokey-nginx.log"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait and handle shutdown
trap "echo 'Shutting down...'; kill $BACKEND_PID $FRONTEND_PID $NGINX_PID 2>/dev/null; exit 0" SIGINT SIGTERM

wait
