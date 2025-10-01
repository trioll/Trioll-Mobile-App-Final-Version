# Dependency Impact Matrix
*Generated: October 1, 2025*

This document maps all dependencies and downstream impacts for the frontend refactoring plan. Use this to understand what else might break when you change a component.

---

## Critical Component Dependencies

### 1. CommentModal.tsx ⚠️ HIGH RISK

**Direct Importers (1 file):**
- `components/GameFeedContainer.tsx` - Main feed container

**Downstream Impact Chain:**
```
CommentModal.tsx
└─ GameFeedContainer.tsx
   └─ screens/FeedScreen.tsx
      └─ navigation/MainNavigator.tsx (PRIMARY APP SCREEN)
```

**If CommentModal Breaks:**
- ❌ Users can't comment on games
- ❌ Feed screen may not render
- ❌ App may crash on game interaction
- ⚠️ PREVIOUS INCIDENT: Sept 30 - CommentModal change broke entire app

**Testing Required:**
1. Open feed
2. Tap comment button on game card
3. Type comment
4. Submit comment
5. Close modal
6. Rotate device
7. Open modal in landscape
8. Verify no other screens affected

**Related Components to Test:**
- `GameFeedContainer.tsx` - Comment modal integration
- `FeedScreen.tsx` - Feed navigation
- `GameDetailScreen.tsx` - Also has commenting

---

### 2. BottomSheet.tsx ⚠️ MEDIUM RISK

**Direct Importers (1 file):**
- `screens/FeedScreen.tsx`

**Usage Context:**
- Game actions menu (like, save, share)
- Settings quick access
- Filter options

**Downstream Impact:**
```
BottomSheet.tsx
└─ FeedScreen.tsx (PRIMARY SCREEN)
   └─ IconBloom menu navigation
   └─ Game interaction actions
```

**If BottomSheet Breaks:**
- ❌ Users can't access IconBloom menu
- ❌ Can't like/save/share games
- ❌ Feed navigation broken

**Testing Required:**
1. Tap Trioll logo (IconBloom)
2. Verify 4 icons appear
3. Tap each icon
4. Test swipe-to-dismiss
5. Test backdrop tap
6. Rotate device during bottom sheet open

---

### 3. Compliance Flow Components 🔴 CRITICAL

**Components:**
- `components/compliance/AgeVerification.tsx`
- `components/compliance/RegionSelection.tsx`
- `components/compliance/DataConsent.tsx`
- `components/compliance/TermsAcceptance.tsx`

**Parent Controller:**
- `screens/ComplianceGateScreen.tsx`

**Dependency Chain:**
```
App.tsx
└─ Checks compliance status
   └─ ComplianceGateScreen.tsx (FIRST SCREEN NEW USERS SEE)
      ├─ AgeVerification.tsx
      ├─ RegionSelection.tsx
      ├─ DataConsent.tsx (conditional, GDPR only)
      └─ TermsAcceptance.tsx
         └─ navigation.reset() → FeedScreen
```

**Shared Dependencies:**
- `utils/complianceStorage.ts` - Stores compliance data
- `context/AppContext.tsx` - `initializeGuest()` function
- `expo-screen-orientation` - Portrait lock (line 63)
- React Native Animated - Horizontal swipe transitions

**If Compliance Breaks:**
- 🔴 NEW USERS CANNOT ACCESS APP
- 🔴 App stuck on first screen
- 🔴 Cannot complete onboarding
- 🔴 TOTAL APP BLOCKER

**Testing Required:**
1. Clear app data
2. Launch app fresh
3. Complete age verification
4. Complete region selection
5. Complete consent (if GDPR)
6. Complete terms
7. Verify lands on Feed
8. Test on iPhone SE (smallest device)
9. Verify all text visible
10. Verify continue buttons accessible

**Related Files to Monitor:**
- `utils/complianceStorage.ts`
- `context/AppContext.tsx`
- `screens/MinimalOnboardingScreen.tsx` (next screen)

---

### 4. Authentication Screens 🔴 CRITICAL

**Components:**
- `screens/auth/LoginScreen.tsx`
- `screens/auth/TwoFactorScreen.tsx`
- `screens/auth/ForgotPasswordScreen.tsx`

**Registration Screens:**
- `screens/registration/EmailRegistrationScreen.tsx`
- `screens/registration/EmailVerificationScreen.tsx`
- `screens/registration/MergeGuestDataScreen.tsx`

**Shared Dependencies:**
- `src/services/auth/safeAuthService.ts` - Auth API calls
- `src/services/auth/amplifyAuthService.ts` - AWS Amplify
- `context/AppContext.tsx` - User state management
- `utils/safeStorage.ts` - Secure credential storage

**Dependency Chain:**
```
LoginScreen.tsx
├─ safeAuthService.login()
│  └─ amplifyAuthService.signIn()
│     └─ AWS Cognito
├─ AppContext.setCurrentUser()
└─ navigation.reset() → FeedScreen

EmailRegistrationScreen.tsx
├─ safeAuthService.register()
├─ TextInput components (need KeyboardAvoidingView)
└─ EmailVerificationScreen.tsx
   └─ MergeGuestDataScreen.tsx (if guest data exists)
      └─ WelcomeScreen.tsx
         └─ FeedScreen
```

**If Auth Screens Break:**
- ❌ Users can't log in
- ❌ New users can't register
- ❌ Password reset broken
- ❌ Guest-to-user conversion fails

**Testing Required:**
1. Login with existing account
2. Test 2FA if enabled
3. Test forgot password flow
4. Test new registration
5. Test email verification
6. Test guest data merge
7. Test keyboard doesn't cover inputs
8. Test on small device

---

### 5. Modal Components (8 total) ⚠️ MEDIUM-HIGH RISK

**All Modal Components:**
1. `components/CommentModal.tsx` → GameFeedContainer
2. `components/BottomSheet.tsx` → FeedScreen
3. `components/modals/PurchaseIntentModal.tsx` → GameDetailScreen
4. `components/profile/ProfileEditModal.tsx` → ProfileScreen
5. `components/guest/RegisterBenefitsModal.tsx` → Multiple screens
6. `components/search/AdvancedFiltersSheet.tsx` → SearchScreen
7. `components/TutorialOverlay.tsx` → FeedScreen (first launch)
8. `components/archive/social/MinimalCommentOverlay.tsx` → (archived)

**Shared Modal Dependencies:**
- React Native `Modal` component
- `SafeAreaView` for notch handling
- `KeyboardAvoidingView` (missing in some)
- `useOrientation` hook (not consistent)
- `Dimensions.get('window')` (needs replacement)

**Impact if Modal System Breaks:**
- Profile editing fails
- Commenting fails
- Purchase flow fails
- Tutorial doesn't show
- Search filters inaccessible

---

### 6. useOrientation Hook (HIGH IMPACT)

**Hook Location:**
- `hooks/useOrientation.ts`

**Current Users (32 files):**
- Various screens and components

**Needs Hook (42 files using Dimensions.get() instead):**
- Screens: 29 files
- Components: 13 files

**Hook Dependencies:**
- React Native `Dimensions` API
- React `useState`, `useEffect`

**Dependency Chain:**
```
useOrientation.ts
├─ Dimensions.addEventListener('change')
├─ Returns: { orientation, width, height, isPortrait }
└─ Used by components for:
   ├─ Conditional rendering
   ├─ Dynamic styling
   ├─ Layout calculations
   └─ Responsive padding
```

**If Hook Changes:**
- ⚠️ All 32 components using it affected
- Layout recalculations may be wrong
- Orientation detection may fail
- Performance impact if hook inefficient

**Testing Required:**
1. Test in portrait
2. Test in landscape
3. Rapid orientation switching
4. Check all 32 consuming components
5. Performance profiling

---

### 7. Responsive Padding Utility (NEW) ⚠️ HIGH IMPACT

**New File:**
- `utils/responsive.ts`

**Will Be Used By:**
- 25 files with hardcoded padding
- All new components going forward

**Dependencies:**
- React Native `Dimensions`
- React Native `PixelRatio`

**Impact if Utility Has Bugs:**
- 25 screens with wrong padding
- Content overflow on small devices
- Content too small on large devices
- Inconsistent spacing across app

**Testing Required:**
1. Test utility calculations in isolation
2. Test on iPhone SE (375x667)
3. Test on iPhone 14 Pro Max (430x932)
4. Test on Android small (360x640)
5. Visual comparison before/after

---

### 8. Layout Component Library (NEW) ⚠️ MEDIUM-HIGH IMPACT

**New Components:**
- `components/layout/ResponsiveContainer.tsx`
- `components/layout/FormScreen.tsx`
- `components/layout/ModalContainer.tsx`

**Dependencies:**
- `ScrollView` (React Native)
- `KeyboardAvoidingView` (React Native)
- `SafeAreaView` (react-native-safe-area-context)
- `useOrientation` hook
- `responsive.ts` utility

**Will Replace:**
- Boilerplate in ~20 screens
- Manual KeyboardAvoidingView setup
- Custom ScrollView configurations

**Dependency Chain:**
```
FormScreen.tsx
└─ ResponsiveContainer.tsx
   ├─ useOrientation()
   ├─ responsivePadding (from responsive.ts)
   ├─ KeyboardAvoidingView (if keyboardAware=true)
   └─ ScrollView (if scrollable=true)
```

**If Library Components Break:**
- All screens using them break
- Keyboard avoidance fails
- Scrolling fails
- Layout inconsistencies

**Testing Required:**
1. Test each component in isolation
2. Test with keyboard open/closed
3. Test scrolling behavior
4. Test in portrait/landscape
5. Compare to previous boilerplate behavior

---

## Hook Dependency Map

### Current Hook Usage

**hooks/useOrientation.ts** → 32 components
**hooks/useHaptics.ts** → 15+ components  
**hooks/useToast.ts** → 10+ components
**hooks/useGuestMode.ts** → 5+ screens
**hooks/useGameActions.ts** → 3 screens (Feed, GameDetail, Profile)
**hooks/useResponsiveLayout.ts** → 1 screen (ProfileScreen)

### Hook Dependencies on Each Other

```
useGameActions
├─ useToast (show success/error messages)
├─ useHaptics (feedback on actions)
└─ AppContext (like/save state)

useGuestMode
└─ AppContext (guest state, register modal)

useOrientation
└─ Dimensions API (standalone)

useResponsiveLayout
├─ useOrientation
└─ Dimensions API
```

**Impact:** Changing AppContext affects multiple hooks

---

## Context Dependencies

### AppContext.tsx (CRITICAL - GLOBAL STATE)

**Provided State:**
- `currentUser` - User object or null
- `isGuest` - Boolean
- `guestProfile` - Guest data
- `games` - Game array
- `likes` - User likes
- `bookmarks` - Saved games
- `comments` - User comments
- `currentTrialGameId` - Active game
- `showRegisterBenefitsModal` - Modal state

**Direct Consumers (15+ files):**
- All screens
- Many components
- Multiple hooks

**Functions:**
- `initializeGuest()` - Used by ComplianceGateScreen
- `setCurrentUser()` - Used by auth screens
- `updateGuestProfile()` - Used by profile screens
- `likeGame()`, `saveGame()`, etc.

**If AppContext Breaks:**
- 🔴 ENTIRE APP BREAKS
- 🔴 No user state
- 🔴 No game data
- 🔴 No navigation possible

**Testing Required for ANY AppContext Change:**
1. Test as guest
2. Test as logged-in user
3. Test guest → user conversion
4. Test all game actions
5. Test profile updates
6. Test navigation
7. Full app regression test

---

## Service Dependencies

### Authentication Services

**safeAuthService.ts:**
- Used by: LoginScreen, RegistrationScreens, ProfileScreen
- Depends on: amplifyAuthService, AWS Cognito
- Functions: login(), register(), logout(), getToken()

**amplifyAuthService.ts:**
- Used by: safeAuthService
- Depends on: AWS Amplify SDK, Cognito config
- Functions: signIn(), signUp(), signOut(), getCurrentUser()

**Impact:** Auth changes affect login, registration, profile

---

### API Services

**TriollAPI.ts:**
- Used by: All screens fetching data
- Depends on: safeAuthService (for tokens)
- Endpoints: /games, /users, /interactions, /analytics

**Dependency Chain:**
```
FeedScreen
└─ useGames() hook
   └─ TriollAPI.getGames()
      ├─ safeAuthService.getToken()
      │  └─ amplifyAuthService.getCurrentSession()
      └─ fetch() → API Gateway
```

**If API Service Breaks:**
- No game data loads
- User actions fail
- Analytics not tracked
- Profile updates fail

---

## Navigation Dependencies

### MainNavigator.tsx (APP SPINE)

**Navigation Flow:**
```
App.tsx
└─ MainNavigator.tsx
   ├─ ComplianceGateScreen (if not completed)
   ├─ MinimalOnboardingScreen (if not completed)
   ├─ FeedScreen (default)
   ├─ GameDetailScreen
   ├─ ProfileScreen
   ├─ SearchScreen
   ├─ SettingsScreen
   ├─ LoginScreen
   ├─ RegistrationScreens
   └─ 35+ other screens
```

**Dependencies:**
- `navigation/screens.ts` - Screen definitions
- `navigation/types.ts` - TypeScript types
- React Navigation v6
- All 44 screen components

**If Navigation Breaks:**
- 🔴 Can't navigate between screens
- 🔴 App stuck on one screen
- 🔴 Back button fails

---

## Storage Dependencies

### AsyncStorage / SecureStore

**Used By:**
- `utils/complianceStorage.ts` - Compliance data
- `utils/safeStorage.ts` - Auth tokens
- `hooks/useSearchHistory.ts` - Search history
- AppContext - Guest profile data

**Stored Data:**
- Compliance completion status
- Guest profile (userId, likes, plays, progress)
- Auth tokens (access, refresh, identity)
- Search history
- App preferences

**If Storage Breaks:**
- User logged out on restart
- Compliance resets (must redo)
- Guest data lost
- Search history lost

---

## Third-Party Library Dependencies

### Critical Libraries

**React Navigation:**
- Used by: ALL screens
- Version: 6.x
- Impact if breaks: No navigation

**React Native Reanimated:**
- Used by: Animations (CardSwipeStack, IconBloom, transitions)
- Impact if breaks: Animations fail, UI janky

**AWS Amplify:**
- Used by: Auth, Storage, Analytics
- Impact if breaks: No login, no profile images, no analytics

**expo-screen-orientation:**
- Used by: ComplianceGateScreen (portrait lock)
- Impact if breaks: Orientation lock fails

**@react-native-community/datetimepicker:**
- Used by: AgeVerification (birthday picker)
- Impact if breaks: Can't verify age, TOTAL BLOCKER

---

## Refactoring Impact Matrix

### Phase 1: ScrollView + KeyboardAvoidingView Changes

**Files Changing:** 20 files (4 compliance + 16 input screens)

**Potential Impacts:**
| Component | Risk | Dependencies Affected | Must Test |
|-----------|------|----------------------|-----------|
| AgeVerification | Low | ComplianceGateScreen | Age entry, DatePicker |
| RegionSelection | Low | ComplianceGateScreen | Region list, selection |
| DataConsent | Low | ComplianceGateScreen | Toggle switches |
| TermsAcceptance | Low | ComplianceGateScreen | Checkbox, scroll |
| LoginScreen | Medium | Auth flow, AppContext | Login form, keyboard |
| EmailRegistrationScreen | Medium | Registration flow | Form inputs, keyboard |
| ProfileEditModal | High | ProfileScreen, image upload | Bio field, image picker |
| CommentModal | **CRITICAL** | FeedScreen, GameDetailScreen | Commenting, feed |

**Downstream Testing Required:**
- Full compliance flow (4 screens)
- Full auth flow (3 screens)
- Full registration flow (4 screens)
- Profile editing
- Game commenting

---

### Phase 2: Orientation Hook Changes

**Files Changing:** 42 files (replacing Dimensions.get())

**Potential Impacts:**
| Component Type | Count | Risk | Must Test |
|----------------|-------|------|-----------|
| Modals | 8 | High | All 8 in portrait + landscape |
| Screens | 29 | Medium | Key screens (Feed, GameDetail, Profile) |
| Components | 5 | Low | Visual check |

**Cascading Effects:**
- Layout recalculations on orientation change
- Performance impact (hook re-renders)
- Style calculations may differ
- Existing Dimensions.get() behavior vs. hook behavior

---

### Phase 3: Import Path + Component Architecture

**Files Changing:** 10 files (import paths) + 20+ files (new components)

**Potential Impacts:**
| Change | Risk | Impact | Must Test |
|--------|------|--------|-----------|
| Import path fixes | Medium | TypeScript errors, build fails | Full build, type check |
| ResponsiveContainer | High | All screens using it | Layout, keyboard, scroll |
| FormScreen wrapper | High | Auth/registration screens | Form behavior |
| ModalContainer | High | All 8 modals | Modal behavior |
| Modal refactoring | **CRITICAL** | User interactions | All modal flows |

---

## Testing Dependency Chains

### Critical User Flows (Must Test at Each Checkpoint)

**Flow 1: First-Time User**
```
App Launch
→ ComplianceGateScreen
  → AgeVerification ✓ CHECKPOINT
  → RegionSelection ✓ CHECKPOINT
  → DataConsent (if GDPR) ✓ CHECKPOINT
  → TermsAcceptance ✓ CHECKPOINT
→ FeedScreen ✓ CHECKPOINT
→ Tap game ✓ CHECKPOINT
→ GameDetailScreen ✓ CHECKPOINT
```

**Flow 2: Guest Registration**
```
FeedScreen (as guest)
→ Tap Profile
→ ProfileScreen (guest)
→ Tap "Create Account"
→ RegistrationMethodScreen ✓ CHECKPOINT
→ EmailRegistrationScreen ✓ CHECKPOINT
→ EmailVerificationScreen ✓ CHECKPOINT
→ MergeGuestDataScreen ✓ CHECKPOINT
→ WelcomeScreen
→ FeedScreen (as user) ✓ CHECKPOINT
```

**Flow 3: Commenting**
```
FeedScreen
→ Tap comment icon on game card
→ CommentModal opens ✓ CHECKPOINT
→ Type comment (keyboard appears) ✓ CHECKPOINT
→ Submit comment ✓ CHECKPOINT
→ Modal closes ✓ CHECKPOINT
→ Comment appears in feed ✓ CHECKPOINT
```

---

## Automated Test Coverage Recommendations

### Unit Tests Needed

**For Utilities:**
- `responsive.ts` - Test all calculations on different screen sizes
- `useOrientation.ts` - Mock Dimensions, test hook behavior

**For Components:**
- `ResponsiveContainer.tsx` - Test scrollable, keyboardAware props
- `FormScreen.tsx` - Test keyboard behavior
- `ModalContainer.tsx` - Test portrait/landscape

### Integration Tests Needed

**For Flows:**
- Compliance flow (4 screens)
- Registration flow (4 screens)
- Auth flow (3 screens)

### E2E Tests Needed

**Critical Paths:**
- First-time user onboarding
- Guest to user conversion
- Game commenting
- Profile editing

---

## Rollback Dependencies

### What to Check After Rollback

**Level 1 (Single File):**
- ✓ App builds
- ✓ File's screen/component works
- ✓ Related screens work

**Level 2 (Day):**
- ✓ App builds
- ✓ All screens from that day work
- ✓ Related flows work

**Level 3 (Week):**
- ✓ App builds
- ✓ Full regression test
- ✓ All user flows work

**Level 4 (Complete):**
- ✓ Restore Sept 30 backup
- ✓ Full system test
- ✓ Verify production data compatible

---

## Change Isolation Strategy

### How to Minimize Blast Radius

**1. One File at a Time:**
- Change one component
- Test immediately
- Commit if successful
- Move to next

**2. Batching (if safe):**
- Group similar low-risk changes
- Example: 5 compliance screens together
- Test batch together
- Rollback batch if any fail

**3. Feature Branches:**
- Create branch per week
- Merge only after full week testing passes
- Keeps main branch stable

**4. Checkpoint Documentation:**
- Document what works at each checkpoint
- Note any issues found
- Track what was tested
- Create audit trail

---

## Pre-Flight Checklist (Before Starting Refactor)

### Environment Setup
- [ ] Create backup of Oct 1 code
- [ ] Create feature branch
- [ ] Have Sept 30 backup accessible
- [ ] Metro bundler running
- [ ] Device connected (iPhone SE + iPhone 14 Pro)
- [ ] Android device available (optional)

### Documentation Ready
- [ ] FRONTEND-REFACTOR-PLAN.md open
- [ ] DEPENDENCY-IMPACT-MATRIX.md open (this file)
- [ ] Checkpoint tracking sheet ready
- [ ] Screenshot folder created

### Verification
- [ ] App builds successfully (baseline)
- [ ] No TypeScript errors (942 baseline)
- [ ] No ESLint errors (1,587 baseline)
- [ ] Full app walkthrough (baseline behavior documented)
- [ ] All 3 user flows work (baseline)

---

**This dependency matrix should be referenced at EVERY checkpoint to understand the full impact of changes.**

*Last Updated: October 1, 2025*
