#!/bin/bash

# Start the backend server
echo "Starting backend server..."
cd backend
npm install
node server.js &
BACKEND_PID=$!

# Wait for backend to initialize
sleep 3

# Start the frontend server
echo "Starting frontend server..."
cd ..
npm install
VITE_API_URL=http://localhost:5000/api VITE_SOCKET_URL=http://localhost:5000 npm run dev &
FRONTEND_PID=$!

# Function to handle exit and kill all processes
function cleanup {
    echo "Shutting down servers..."
    kill $BACKEND_PID
    kill $FRONTEND_PID
    exit
}

# Handle Ctrl+C
trap cleanup SIGINT

# Wait for user to press Ctrl+C
echo ""
echo "ChitChat is running!"
echo "Backend: http://localhost:5000"
echo "Frontend: http://localhost:8080"
echo ""
echo "Press Ctrl+C to stop all servers"

# Keep script running
wait
