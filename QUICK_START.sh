#!/bin/bash

# Codura App - Quick Start Script
# This script helps you start the app quickly

echo "=========================================="
echo "  Codura Mock Interview - Quick Start"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    echo "   cd /Users/michaelcatalanotti/IdeaProjects/codura"
    exit 1
fi

echo "✓ In correct directory"
echo ""

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Check dependencies
echo "Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
else
    echo "✓ Frontend dependencies installed"
fi

if [ ! -d "server/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd server && npm install && cd ..
else
    echo "✓ Backend dependencies installed"
fi

echo ""
echo "=========================================="
echo "  Starting Servers"
echo "=========================================="
echo ""

# Check if ports are available
if check_port 3001; then
    echo "⚠️  Warning: Port 3001 is already in use"
    echo "   You may need to kill the existing process:"
    echo "   kill -9 \$(lsof -ti:3001)"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "Starting backend server on port 3001..."
cd server && npm run dev &
BACKEND_PID=$!
cd ..

echo "Backend PID: $BACKEND_PID"
echo ""
echo "Waiting 3 seconds for backend to start..."
sleep 3
echo ""

echo "Starting Next.js frontend..."
npm run dev &
FRONTEND_PID=$!

echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "=========================================="
echo "  Servers Started!"
echo "=========================================="
echo ""
echo "✅ Backend Server PID: $BACKEND_PID"
echo "✅ Frontend Server PID: $FRONTEND_PID"
echo ""
echo "🌐 Open your browser to:"
echo "   http://localhost:3000 (or check terminal for actual port)"
echo ""
echo "🎯 To test Mock Interview:"
echo "   1. Login to your account"
echo "   2. Go to: Dashboard → Compete → Mock Interview"
echo "   3. Or directly: http://localhost:3000/mock-interview"
echo ""
echo "⚠️  To stop the servers:"
echo "   Press Ctrl+C or run:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "=========================================="
echo ""

# Save PIDs to file for easy cleanup
echo "$BACKEND_PID" > .server.pid
echo "$FRONTEND_PID" >> .server.pid

# Wait for user interrupt
trap "echo ''; echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; rm -f .server.pid; echo 'Servers stopped.'; exit 0" INT TERM

# Keep script running
wait
