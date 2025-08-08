# App Store Submission Guide - Trioll Mobile

## 📱 Quick Setup Timeline: 1-2 Hours Total

### Part 1: Production Keystore (30 minutes)

#### For Android (Google Play)

1. **Generate Keystore** (5 minutes):
```bash
cd "/Users/frederickcaplin/Desktop/Trioll Mobile App Final Version/trioll-consumer-app/android/app"

# Generate production keystore
keytool -genkey -v -keystore trioll-release.keystore -alias trioll -keyalg RSA -keysize 2048 -validity 10000

# You'll be prompted for:
# - Keystore password (save this!)
# - Your name
# - Organization unit
# - Organization
# - City/Locality
# - State/Province
# - Country code (US)
```

2. **Configure Gradle** (5 minutes):
Create `android/keystore.properties`:
```properties
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=trioll
storeFile=trioll-release.keystore
```

3. **Update build.gradle** (already configured in most React Native apps)

**⚠️ CRITICAL**: 
- Back up `trioll-release.keystore` in multiple secure locations
- Save passwords in a password manager
- You CANNOT recover if lost!

#### For iOS (App Store)

iOS signing is handled automatically by Expo EAS Build:
```bash
# Install EAS CLI if not already installed
npm install -g eas-cli

# Configure your project
eas build:configure

# Build for iOS (handles certificates automatically)
eas build --platform ios
```

### Part 2: App Store Accounts (30 minutes)

#### Google Play Console ($25 one-time)

1. **Sign up**: https://play.google.com/console/signup
2. **Pay $25** registration fee (one-time)
3. **Create app**:
   - Click "Create app"
   - App name: "Trioll Mobile"
   - Default language: English
   - App type: Game
   - Category: Casual

4. **Required before publishing**:
   - App icon (512x512)
   - Feature graphic (1024x500)
   - Screenshots (minimum 2)
   - Short description (80 chars)
   - Full description (4000 chars)
   - Privacy policy URL

#### Apple Developer Account ($99/year)

1. **Sign up**: https://developer.apple.com/programs/
2. **Pay $99** annual fee
3. **Wait for approval** (24-48 hours)
4. **Create app in App Store Connect**:
   - Bundle ID: com.trioll.mobile
   - SKU: trioll-mobile-001
   - App name: Trioll Mobile

5. **Required before publishing**:
   - App icon (1024x1024)
   - Screenshots for each device size
   - App description
   - Keywords
   - Privacy policy URL

### Part 3: Build & Upload (30 minutes)

#### Using Expo EAS (Recommended - Easiest!)

```bash
# First time setup
eas build:configure

# Build for both platforms
eas build --platform all

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

#### Manual Build

**Android**:
```bash
cd android
./gradlew assembleRelease
# APK location: android/app/build/outputs/apk/release/app-release.apk
```

**iOS**:
- Use Xcode or EAS Build (manual iOS builds are complex)

## 🚀 Super Quick Start (Fastest Path)

If you want to get started immediately:

1. **For Testing Only** (Today):
   ```bash
   # Install EAS
   npm install -g eas-cli
   
   # Build APK for testing
   eas build --platform android --profile preview
   ```

2. **For Production** (When Ready):
   - Create Google Play account ($25)
   - Use EAS to handle all certificates
   - Upload with `eas submit`

## 💡 Pro Tips

1. **Start with Android**: 
   - Faster approval (2-3 hours vs 24-48 hours)
   - Easier testing
   - Only $25 one-time fee

2. **Use EAS Build**:
   - Handles all certificates automatically
   - No need to install Android Studio or Xcode
   - Works from command line

3. **Test First**:
   - Use TestFlight (iOS) or Internal Testing (Android)
   - Get 5-10 beta testers
   - Fix any issues before public release

## 📋 Minimal Checklist for First Submission

### Assets Needed (1 hour to create):
- [ ] App icon (1024x1024 PNG)
- [ ] 2-5 screenshots (use phone or simulator)
- [ ] App description (2-3 paragraphs)
- [ ] Privacy policy (can use generator)

### Quick Descriptions:

**Short Description** (80 chars):
"Discover and play amazing games instantly. Swipe, play, enjoy!"

**Full Description**:
```
Trioll Mobile is your gateway to discovering and playing incredible games instantly. 

With our TikTok-style interface, swipe through games, try them instantly, and find your next favorite. No downloads required - just tap and play!

Features:
• Instant game trials - play without downloading
• Swipe to discover new games
• Track your progress and achievements  
• Connect with friends
• Save your favorite games

Join thousands of gamers discovering their next adventure on Trioll!
```

**Privacy Policy**: Use a generator like https://app.termly.io/

## 🎯 Total Time Investment

- **Minimum Setup**: 1-2 hours
- **First Submission**: 2-3 hours
- **Approval Wait**: 
  - Android: 2-3 hours
  - iOS: 24-48 hours

You can have your app in the Google Play Store by tomorrow! 🚀