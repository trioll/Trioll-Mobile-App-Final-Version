# App Loading and Game Playing Simulation

## 1. App Launch (App.tsx)
- ✅ App initializes with ErrorBoundary wrapper
- ✅ Loads environment configuration from Config
- ✅ Checks compliance status from storage
- ✅ Since no compliance data exists, shows ComplianceGateScreen

## 2. Compliance Gate (ComplianceGateScreen) 
- ✅ User selects age 25+ 
- ✅ User selects region "United States"
- ✅ User accepts privacy policy
- ✅ Saves compliance data to storage
- ✅ Navigates to MinimalOnboardingScreen

## 3. Onboarding (MinimalOnboardingScreen)
- ✅ Shows game discovery features
- ✅ User taps "Get Started"
- ✅ Navigates to RegistrationMethodScreen

## 4. Registration Method (RegistrationMethodScreen)
- ✅ Shows email, Google, Apple registration options
- ✅ User taps "Continue as Guest" button
- ✅ Loading spinner appears
- ✅ authenticateAsGuest() called:
  - Generates unique guest ID: guest_us-east-1:1737264000000-abc123def456
  - Configures API client for guest mode
  - Sets isGuest = true, isAuthenticated = false
- ✅ Navigates to FeedScreen

## 5. Feed Screen (FeedScreen) - Main Game Discovery
- ✅ GuestBanner appears at top: "Playing as Guest | Create Account >"
- ✅ Shows Trioll logo in header
- ✅ GameFeedContainer loads with 3 dummy games initially:
  - Evolution Runner
  - Platform Jumper  
  - Tap Tap Hero
- ✅ API call to GET /games attempts to fetch real games
  - If successful: Replaces dummy games with real data
  - If failed: Continues showing dummy games
- ✅ User can swipe horizontally between game cards

## 6. Playing a Game
User taps "PLAY" button on "Evolution Runner":
- ✅ Haptic feedback triggers
- ✅ Since user is guest, interaction saved locally via localStorageService
- ✅ Navigation to TrialPlayerScreen with game data

## 7. Trial Player Screen (TrialPlayerScreen)
- ✅ Shows loading overlay with game tips
- ✅ Progress bar animates: "Preparing..." → "Loading game assets..." → "Starting trial..."
- ✅ WebView loads game URL: https://evolution-runner.example.com
- ✅ Trial timer starts at 5:00 minutes
- ✅ HUD shows: Timer, Pause button, Settings
- ✅ Auto-hides HUD after 5 seconds of no interaction
- ✅ Guest can play the full trial

## 8. During Gameplay
- ✅ Timer counts down with pulse animation at <60 seconds
- ✅ User earns points/score in game
- ✅ If user pauses: Shows pause menu with Resume, Settings, Quit options
- ✅ All interactions work normally for guest users

## 9. Trial Ends
When timer reaches 0:00 or user completes trial:
- ✅ Shows PostTrialScreen overlay
- ✅ Displays performance summary
- ✅ Guest prompted to "Create Account to Save Progress"
- ✅ User can:
  - Rate the trial (stored locally)
  - Like the game (stored locally)
  - Play again
  - Return to feed

## 10. Guest Data Persistence
All guest interactions stored locally:
- ✅ Game likes saved to AsyncStorage
- ✅ Play sessions tracked with duration
- ✅ Ratings saved locally
- ✅ Can accumulate unlimited plays as guest
- ✅ Data ready for merge when user registers

## API Endpoints Used
- GET /games - Fetches game list (works for guests)
- All POST endpoints (likes, ratings, plays) use local storage for guests

## No UI Impact
✅ All screens render exactly as designed
✅ Animations and transitions work normally
✅ Haptic feedback functions properly
✅ Dark theme with neon accents preserved
✅ Guest indicators blend seamlessly with UI
✅ No error messages shown to user
✅ Smooth fallback to dummy data if API fails