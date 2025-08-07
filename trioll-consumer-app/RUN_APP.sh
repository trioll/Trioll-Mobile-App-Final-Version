#!/bin/bash

echo "🎮 Starting TRIOLL UI App..."
echo "📱 Remember to rotate to LANDSCAPE mode!"
echo ""
echo "Clearing caches..."

# Kill any existing Expo processes
pkill -f "expo start" 2>/dev/null || true

# Clear all caches
rm -rf .expo
rm -rf $TMPDIR/react-*
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-*

# Clear watchman
watchman watch-del-all 2>/dev/null || true

# Start fresh
npx expo start -c