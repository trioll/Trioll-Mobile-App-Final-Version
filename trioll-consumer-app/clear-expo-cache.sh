#!/bin/bash

echo "🧹 Clearing all Expo and React Native caches..."

# Kill any running Metro processes
echo "📱 Stopping Metro bundler..."
pkill -f metro || true
pkill -f "expo start" || true

# Clear Expo caches
echo "🗑️  Clearing Expo cache..."
rm -rf .expo
rm -rf .expo-shared

# Clear Metro cache
echo "🚇 Clearing Metro cache..."
rm -rf node_modules/.cache
rm -rf $TMPDIR/metro-* 2>/dev/null || true
rm -rf $TMPDIR/haste-* 2>/dev/null || true

# Clear React Native cache
echo "⚛️  Clearing React Native cache..."
rm -rf $TMPDIR/react-* 2>/dev/null || true

# Clear watchman cache
echo "👁️  Clearing Watchman cache..."
watchman watch-del-all 2>/dev/null || echo "Watchman not installed"

# Clear package manager caches
echo "📦 Clearing package manager caches..."
npm cache clean --force 2>/dev/null || true

# Clear iOS build cache (if on macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 Clearing iOS build cache..."
    rm -rf ~/Library/Developer/Xcode/DerivedData/* 2>/dev/null || true
    cd ios && pod cache clean --all 2>/dev/null || true
    cd ..
fi

# Clear Android build cache
echo "🤖 Clearing Android build cache..."
cd android 2>/dev/null && ./gradlew clean 2>/dev/null || true
cd ..
rm -rf android/.gradle 2>/dev/null || true
rm -rf android/app/build 2>/dev/null || true

# Remove and reinstall node_modules (optional - uncomment if needed)
# echo "📦 Reinstalling dependencies..."
# rm -rf node_modules
# npm install

echo "✅ All caches cleared!"
echo ""
echo "To start Expo with cleared cache, run:"
echo "  npx expo start -c"
echo ""
echo "To start for Expo Go app, run:"
echo "  npx expo start --tunnel"