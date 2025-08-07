#!/bin/bash

# Kill any existing Metro bundler processes
echo "Cleaning up existing processes..."
npx kill-port 8081 2>/dev/null || true

# Clear watchman cache
echo "Clearing watchman cache..."
watchman watch-del-all 2>/dev/null || true

# Start Expo in background
echo "Starting Expo..."
npx expo start --clear &

# Wait for Metro bundler to be ready
echo "Waiting for Metro bundler..."
sleep 10

# Check if bundler is running
if curl -s http://localhost:8081 > /dev/null; then
    echo "Metro bundler is running!"
    echo "Opening in iOS simulator..."
    # Open in iOS simulator
    npx expo run:ios --simulator="iPhone 16 Pro"
else
    echo "Metro bundler failed to start. Please check the logs."
fi