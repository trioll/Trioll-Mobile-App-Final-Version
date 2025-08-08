#!/bin/bash

# Trioll Mobile App Startup Script
# This script helps fix common Expo startup issues

echo "🚀 Starting Trioll Mobile App..."

# Navigate to the app directory
cd "/Users/frederickcaplin/Desktop/Trioll Mobile App Final Version/trioll-consumer-app"

# Kill any existing Expo processes
echo "🔧 Cleaning up old processes..."
pkill -f "expo" 2>/dev/null || true
pkill -f "react-native" 2>/dev/null || true
sleep 2

# Clear caches
echo "🧹 Clearing caches..."
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf .expo 2>/dev/null || true
rm -rf $TMPDIR/metro-* 2>/dev/null || true
rm -rf $TMPDIR/react-native-* 2>/dev/null || true

# Start Expo with clear cache
echo "📱 Starting Expo..."
npx expo start --clear

# If the above fails, try with a different port
if [ $? -ne 0 ]; then
    echo "⚠️  Default port might be in use. Trying port 19001..."
    npx expo start --clear --port 19001
fi