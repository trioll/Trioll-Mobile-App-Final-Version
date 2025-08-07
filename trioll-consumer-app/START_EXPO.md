# 📱 How to Open TRIOLL in Expo Go

## Prerequisites

1. Install **Expo Go** app on your phone:
   - iOS: Search "Expo Go" in App Store
   - Android: Search "Expo Go" in Google Play Store

2. Make sure your phone and computer are on the **same WiFi network**

## Steps to Run

### 1. Start the Expo Server

Open Terminal in the app directory and run:

```bash
cd /Users/yoavlester/Desktop/trioll-mvp/trioll-consumer-app
npx expo start --clear
```

### 2. View the QR Code

After running the command, you'll see:

- A QR code in the terminal
- Metro Bundler running on http://localhost:8081
- Options to press keys for different actions

### 3. Open in Expo Go

**For iPhone:**

1. Open Camera app
2. Point at the QR code in terminal
3. Tap the notification banner that appears
4. This will open Expo Go and load your app

**For Android:**

1. Open Expo Go app
2. Tap "Scan QR Code"
3. Scan the QR code from terminal

### 4. What You'll See

The app will load and show the **Compliance Gate** flow:

1. 🎂 Age Verification - Enter your birthdate
2. 🌍 Region Selection - Choose your country
3. 🔒 Data Privacy (GDPR regions only) - Set consent preferences
4. 📜 Terms & Conditions - Accept terms to start

### Troubleshooting

**If the app won't load:**

- Press `r` in terminal to reload
- Press `c` to clear cache
- Make sure you're on same WiFi network
- Try restarting with: `npx expo start --tunnel`

**If you see package warnings:**
The app will still work, but you can update packages with:

```bash
npx expo install expo-secure-store@~14.2.3
npx expo install @react-native-community/datetimepicker@8.4.1
```

**To see the feed screen directly (skip compliance):**
You can temporarily modify App.tsx line 38:

```javascript
setNeedsCompliance(false); // Change to false to skip
```

### Metro Bundler Commands

While the server is running, you can press:

- `r` - Reload the app
- `m` - Toggle menu
- `d` - Show developer menu
- `c` - Clear Metro cache
- `i` - Run on iOS simulator
- `a` - Run on Android emulator

### Current Features

✅ Age verification with date picker
✅ 70+ countries with GDPR detection
✅ Granular consent options for EU users
✅ Animated progress indicator
✅ Secure data storage
✅ Beautiful animations and haptics

Enjoy testing TRIOLL! 🎮
