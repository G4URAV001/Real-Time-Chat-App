#!/bin/bash

echo "Installing frontend dependencies..."
npm install socket.io-client uuid date-fns

echo "Installing backend dependencies..."
cd backend
npm install

echo "Installation complete!"
echo "Run ./start.sh to start the application"
