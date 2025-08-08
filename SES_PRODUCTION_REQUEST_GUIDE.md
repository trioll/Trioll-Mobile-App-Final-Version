# AWS SES Production Access Request Guide

## Step-by-Step Instructions:

### 1. Navigate to SES Console
1. Go to [AWS Console](https://console.aws.amazon.com)
2. Search for "SES" and select "Simple Email Service"
3. Make sure you're in **us-east-1** region (top right)

### 2. Request Production Access
1. In the left sidebar, click **"Account dashboard"**
2. You'll see a yellow banner saying "Your account is in the sandbox"
3. Click **"Request production access"**

### 3. Fill Out the Form

**Mail Type**: Select "Transactional"

**Website URL**: 
```
https://trioll.com
```

**Use Case Description**:
```
Trioll is a mobile gaming platform that requires email verification for user registration. 
We send transactional emails only for:
- User registration verification codes (6-digit codes)
- Password reset requests
- Account security notifications

All emails are triggered by user actions and we never send marketing emails through this system.
```

**Additional Information**:
```
- Email volume: Approximately 500-1000 verification emails per day
- All recipients have explicitly requested emails by registering
- We use AWS Cognito for user management which handles bounce/complaint processing
- Domain trioll.com is already verified with DKIM enabled
- We have implemented rate limiting to prevent abuse
```

**AWS Region**: us-east-1

**Expected Daily Volume**: 1000

**Expected Daily Send Rate**: 50 emails/hour peak

### 4. Compliance Questions

**How do you handle bounces and complaints?**
```
AWS Cognito automatically handles bounces and complaints. Users with bounced emails are automatically suppressed from future sends.
```

**How do you maintain your recipient lists?**
```
We only send to users who explicitly register on our platform. No purchased lists or third-party data.
```

**What is your opt-out process?**
```
These are transactional emails required for account access. Users can delete their account to stop all emails.
```

### 5. Submit and Wait

- Click **"Submit"**
- AWS typically responds within 24-48 hours
- Check your email for updates

## After Approval:

Your sending limits will increase to:
- **Daily sending quota**: 50,000 emails/day (can be increased further)
- **Maximum send rate**: 14 emails/second
- **Can send to ANY email address** (no pre-verification needed)

## Important Notes:

1. **Keep monitoring bounces**: High bounce rates can suspend your account
2. **Maintain sender reputation**: AWS tracks your sending metrics
3. **Use the production access responsibly**: Only for your app's transactional emails

## Current Status:
- ✅ Domain verified (trioll.com)
- ✅ DKIM configured
- ✅ SPF records set
- ✅ Email templates configured
- ✅ Auto-verification enabled
- ⏳ Production access pending