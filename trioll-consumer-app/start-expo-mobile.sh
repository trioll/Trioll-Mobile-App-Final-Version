#!/bin/bash

echo "🚀 Starting Expo for Mobile Device Connection"
echo "==========================================="

# Set the hostname explicitly
export REACT_NATIVE_PACKAGER_HOSTNAME=192.168.1.34

# Clear Metro cache
echo "📦 Clearing Metro cache..."
npx expo start -c --lan

# The above command will start Expo in LAN mode with:
# - Clear cache (-c)
# - LAN mode (--lan) for mobile device access
# - Explicit hostname set for proper IP binding