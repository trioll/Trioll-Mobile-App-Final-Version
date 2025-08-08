# Sentry Configuration Guide

## Overview

Sentry is configured for crash reporting and performance monitoring in the Trioll Mobile app. The configuration has been updated to use environment variables and includes proper environment checks.

## Current Status ✅

- **Placeholder removed**: No more hardcoded `YOUR_PRODUCTION_SENTRY_DSN`
- **Environment variables**: Uses `REACT_APP_SENTRY_DSN` or `EXPO_PUBLIC_SENTRY_DSN`
- **Environment checking**: Only runs in staging/production, disabled in development
- **Graceful fallback**: If no DSN provided, Sentry is silently disabled

## Configuration Options

### Option 1: Enable Sentry (Recommended for Production)

1. Create a Sentry account at https://sentry.io
2. Create a new React Native project
3. Get your DSN from Project Settings → Client Keys (DSN)
4. Add to your `.env.local` or `.env` file:
   ```bash
   REACT_APP_SENTRY_DSN=https://YOUR_KEY@sentry.io/YOUR_PROJECT_ID
   # or for Expo
   EXPO_PUBLIC_SENTRY_DSN=https://YOUR_KEY@sentry.io/YOUR_PROJECT_ID
   ```

### Option 2: Disable Sentry Completely

Simply leave the DSN empty or don't set it:
```bash
REACT_APP_SENTRY_DSN=
# or just omit the variable entirely
```

Or disable crash reporting entirely:
```bash
ENABLE_CRASH_REPORTING=false
```

## Environment Behavior

| Environment | Sentry Behavior |
|------------|-----------------|
| development | Always disabled (even with DSN) |
| staging | Enabled if DSN provided |
| production | Enabled if DSN provided |

## Features When Enabled

- **Crash Reporting**: Automatic error capture with stack traces
- **Performance Monitoring**: Transaction tracking (10% sample rate in production)
- **Offline Support**: Crashes stored locally and reported when online
- **Context Enrichment**: User ID, app state, network status
- **Sensitive Data Filtering**: Passwords, tokens, etc. are redacted
- **Breadcrumbs**: User actions tracked for better debugging

## Code Changes Made

### crashReporter.ts
```typescript
// Before:
dsn: Config.ENV === 'production' ? 'YOUR_PRODUCTION_SENTRY_DSN' : 'YOUR_STAGING_SENTRY_DSN',

// After:
const sentryDsn = process.env.REACT_APP_SENTRY_DSN || process.env.EXPO_PUBLIC_SENTRY_DSN;

if (!sentryDsn) {
  logger.info('No Sentry DSN configured, crash reporting disabled');
  return;
}

if (Config.ENV === 'development') {
  logger.info('Sentry disabled in development environment');
  return;
}

dsn: sentryDsn,
```

## Testing

1. **Development**: Sentry should not initialize
   ```bash
   npm start
   # Check console for: "Sentry disabled in development environment"
   ```

2. **Without DSN**: Sentry should not initialize
   ```bash
   # Don't set REACT_APP_SENTRY_DSN
   npm start
   # Check console for: "No Sentry DSN configured, crash reporting disabled"
   ```

3. **With DSN in Production**:
   ```bash
   REACT_APP_SENTRY_DSN=your-dsn NODE_ENV=production npm start
   # Sentry should initialize successfully
   ```

## Next Steps

1. **If using Sentry**:
   - Sign up at https://sentry.io
   - Create a React Native project
   - Add your DSN to `.env.local`
   - Test with `crashReporter.testCrash()` in development

2. **If not using Sentry**:
   - No action needed - it's already disabled by default
   - Consider alternative crash reporting solutions like Bugsnag or Firebase Crashlytics

## Security Notes

- Never commit your Sentry DSN to public repositories
- Use environment variables or secrets management
- The DSN is safe to expose in client apps (it's designed for that)
- Sensitive data is automatically filtered before sending to Sentry