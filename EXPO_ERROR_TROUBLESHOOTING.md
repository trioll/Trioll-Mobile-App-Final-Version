# Expo "Unknown error: Interrupted system call" Troubleshooting Guide

## Error Description
You're seeing: "There was a problem running the requested app. Unknown error: The operation couldn't be completed. Interrupted system call"

This typically happens when:
- The Expo development server crashes
- The connection between your phone and computer is interrupted
- Metro bundler encounters an error

## Quick Fix Steps

### 1. Use the Startup Script
```bash
./START_APP.sh
```

### 2. Manual Steps (if script doesn't work)

#### Step 1: Kill All Processes
```bash
# Kill Expo and Node processes
pkill -f expo
pkill -f node
pkill -f "react-native"
```

#### Step 2: Clear All Caches
```bash
cd trioll-consumer-app

# Clear Expo cache
rm -rf .expo
rm -rf node_modules/.cache

# Clear Metro bundler cache
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/react-native-*

# Clear watchman (if installed)
watchman watch-del-all 2>/dev/null || true
```

#### Step 3: Restart Expo
```bash
# Start with clear cache
npx expo start --clear

# OR try a different port if 8081 is in use
npx expo start --clear --port 19001
```

### 3. Alternative Solutions

#### If the above doesn't work:

1. **Restart your computer** - This clears all stuck processes

2. **Check port conflicts**:
   ```bash
   lsof -i :8081  # Check if port is in use
   kill -9 <PID>  # Kill the process using the port
   ```

3. **Reset network settings on phone**:
   - iOS: Settings → General → Reset → Reset Network Settings
   - Android: Settings → System → Reset options → Reset Wi-Fi, mobile & Bluetooth

4. **Use tunnel mode** (if local network is problematic):
   ```bash
   npx expo start --tunnel
   ```

5. **Reinstall node_modules** (last resort):
   ```bash
   rm -rf node_modules
   npm install
   npx expo start --clear
   ```

## Prevention Tips

1. **Always stop Expo properly**: Press `Ctrl+C` in terminal instead of closing the window
2. **Keep Expo Go app updated**: Check App Store/Play Store for updates
3. **Stay on same network**: Ensure phone and computer are on the same WiFi
4. **Monitor memory**: Close other apps if your computer is running low on memory

## Common Causes & Solutions

| Cause | Solution |
|-------|----------|
| Port conflict | Use `--port 19001` |
| Stale cache | Use `--clear` flag |
| Network issues | Use `--tunnel` mode |
| Process stuck | Kill and restart |
| Expo Go outdated | Update the app |

## Still Having Issues?

1. Check the terminal for specific error messages
2. Try running in web browser first: Press `w` in Expo terminal
3. Create a new Expo development build:
   ```bash
   npx expo prebuild --clean
   ```

## Quick Commands Reference

```bash
# Normal start
npx expo start

# Start with cleared cache
npx expo start --clear

# Start on different port
npx expo start --port 19001

# Start with tunnel (slower but more reliable)
npx expo start --tunnel

# Start for iOS only
npx expo start --ios

# Start for Android only
npx expo start --android
```