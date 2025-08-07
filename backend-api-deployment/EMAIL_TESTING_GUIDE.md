# Email Testing Guide for Trioll Registration

## Current Email Configuration Status

✅ **Cognito Configuration**: Set to use COGNITO_DEFAULT email service
✅ **Email Templates**: Configured with custom messages
✅ **Registration API**: Working correctly
❌ **Email Delivery**: Limited to verified addresses only

## Why Emails Aren't Being Delivered

AWS Cognito's default email service has these limitations:
1. **Sandbox Mode**: Only sends to verified email addresses
2. **Daily Limit**: 50 emails per day
3. **No example.com**: Cannot send to fake email addresses

## Quick Setup for Testing (5 minutes)

### Step 1: Verify Your Email Address

```bash
# Replace with your actual email address
aws ses verify-email-identity \
  --email-address your-email@gmail.com \
  --region us-east-1
```

You'll receive a verification email from AWS. Click the link to verify.

### Step 2: Test Registration with Your Email

```bash
# Use your verified email
printf '{"email":"your-email@gmail.com","username":"testuser123","password":"SecurePass@123","displayName":"Test User"}' | \
curl -X POST https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod/users/register \
-H 'Content-Type: application/json' -d @-
```

### Step 3: Check Your Email

You should receive an email with subject: "Verify your Trioll account" containing a 6-digit code.

## Alternative Testing Methods

### Method 1: Use Temporary Email Services

Some services that work with AWS:
- https://temp-mail.org
- https://10minutemail.com
- Your personal Gmail with "+" aliases (e.g., yourname+test1@gmail.com)

### Method 2: Manual Confirmation (Development Only)

```bash
# List unconfirmed users
aws cognito-idp list-users \
  --user-pool-id us-east-1_cLPH2acQd \
  --filter "cognito:user_status=\"UNCONFIRMED\"" \
  --region us-east-1

# Manually confirm a user
aws cognito-idp admin-confirm-sign-up \
  --user-pool-id us-east-1_cLPH2acQd \
  --username "email@example.com" \
  --region us-east-1
```

### Method 3: Get Verification Code from Lambda Logs

If you can't receive emails, you can extract the code from CloudWatch logs (not recommended for production):

```bash
# This would require modifying the Lambda to log the code (security risk)
# NOT RECOMMENDED for production
```

## Production Setup (When Ready)

### 1. Configure Amazon SES

```bash
# Verify your domain
aws ses verify-domain-identity --domain yourdomain.com --region us-east-1

# Add DNS records provided by AWS to your domain
# Wait for verification (usually 24-72 hours)
```

### 2. Request Production Access

1. Go to AWS SES Console
2. Click "Request production access"
3. Fill out the form with:
   - Use case: "Transactional emails for user registration"
   - Expected volume: Your estimate
   - How you handle bounces/complaints

### 3. Update Cognito to Use SES

```bash
aws cognito-idp update-user-pool \
  --user-pool-id us-east-1_cLPH2acQd \
  --email-configuration \
    EmailSendingAccount=DEVELOPER,\
    SourceArn=arn:aws:ses:us-east-1:561645284740:identity/yourdomain.com,\
    From=no-reply@yourdomain.com \
  --region us-east-1
```

## Current Email Template

Your verification emails will look like this:

```
Subject: Verify your Trioll account

Welcome to Trioll Gaming Platform!

Your verification code is: 123456

This code will expire in 24 hours.

If you did not create an account, please ignore this email.

Best regards,
The Trioll Team
```

## Troubleshooting

### "Failed to resend code" Error
- User might not exist
- Too many resend attempts (rate limited)
- Email service not configured

### No Email Received
1. Check spam folder
2. Verify email is in verified list
3. Check CloudWatch logs for errors
4. Ensure you're using a real email address

### Testing the Resend Endpoint

```bash
printf '{"email":"your-verified-email@gmail.com"}' | \
curl -X POST https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod/users/resend-verification \
-H 'Content-Type: application/json' -d @-
```

## Next Steps

1. **For Development**: Verify your personal email address for testing
2. **For Staging**: Set up a test domain in SES
3. **For Production**: Complete SES production access request

## Quick Commands Reference

```bash
# Verify an email
aws ses verify-email-identity --email-address test@gmail.com --region us-east-1

# List verified emails
aws ses list-identities --region us-east-1

# Check email sending quota
aws ses get-send-quota --region us-east-1

# Manually confirm a user (bypass email)
aws cognito-idp admin-confirm-sign-up \
  --user-pool-id us-east-1_cLPH2acQd \
  --username "user@example.com" \
  --region us-east-1
```