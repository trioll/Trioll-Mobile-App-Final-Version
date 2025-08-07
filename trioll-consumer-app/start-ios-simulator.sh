#!/bin/bash

# Start iOS Simulator Script for Trioll App

echo "🚀 Starting Trioll App in iOS Simulator..."

# Navigate to the app directory
cd "/Users/frederickcaplin/Desktop/Trioll Github Aug File/trioll-mvp/trioll-consumer-app"

# Kill any existing Expo processes
echo "🔄 Cleaning up existing processes..."
pkill -f "expo start" || true
pkill -f "metro" || true

# Clear Metro cache
echo "🗑️  Clearing Metro cache..."
npx react-native start --reset-cache &
sleep 2
pkill -f "react-native start" || true

# Start Expo with iOS
echo "📱 Starting Expo for iOS..."
npx expo start --ios --clear

echo "✅ App should be opening in iOS Simulator..."
echo "ℹ️  If the app doesn't open automatically:"
echo "   1. Press 'i' in the terminal to open iOS simulator"
echo "   2. Or scan the QR code in Expo Go app"