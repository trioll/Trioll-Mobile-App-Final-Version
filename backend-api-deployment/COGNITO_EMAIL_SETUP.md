# AWS Cognito Email Verification Setup

## Current Status

The registration and email verification endpoints are deployed and working, but AWS Cognito is not configured to send emails. This is why you're not receiving verification codes.

## Why Emails Aren't Being Sent

AWS Cognito requires configuration with Amazon SES (Simple Email Service) to send emails. By default, Cognito user pools don't have email sending capabilities.

## Setup Steps

### Option 1: Use Cognito's Default Email (Quick Setup)

1. Go to AWS Console → Cognito → User Pools
2. Select your user pool: `us-east-1_cLPH2acQd`
3. Go to "Messaging" tab
4. Under "Email", click "Edit"
5. Choose "Send email with Cognito" (limited to 50 emails/day)
6. Configure:
   - FROM email address: `no-reply@trioll.com` (or your domain)
   - FROM name: `Trioll`
   - Reply-to address: `support@trioll.com`
7. Save changes

**Limitations**: Only 50 emails per day in sandbox mode

### Option 2: Configure Amazon SES (Production Ready)

1. **Verify Email Domain in SES**:
   ```bash
   # Verify a domain
   aws ses verify-domain-identity --domain trioll.com --region us-east-1
   
   # Or verify a single email
   aws ses verify-email-identity --email-address your-email@example.com --region us-east-1
   ```

2. **Configure Cognito to use SES**:
   - Go to Cognito User Pool settings
   - Under "Messaging" → "Email"
   - Choose "Send email with Amazon SES"
   - Select your verified email/domain
   - Configure email templates

3. **Move SES out of Sandbox** (for production):
   - Request production access in SES console
   - Provide use case details
   - Wait for approval (usually 24-48 hours)

### Option 3: Development Testing (Immediate Solution)

For development, you can manually confirm users without email:

```bash
# Manually confirm a user
aws cognito-idp admin-confirm-sign-up \
  --user-pool-id us-east-1_cLPH2acQd \
  --username test@example.com \
  --region us-east-1
```

## Email Templates

Once email is configured, customize verification email in Cognito:

1. Go to User Pool → Messaging → Message templates
2. Edit "Verification message" template:

```
Subject: Verify your Trioll account

Message:
Welcome to Trioll! 

Your verification code is: {####}

This code expires in 24 hours.

If you didn't create an account, please ignore this email.

Best,
The Trioll Team
```

## Testing Email Configuration

After setup, test with:

```bash
# Register a new user
printf '{"email":"your-email@example.com","username":"testuser","password":"SecurePass@123","displayName":"Test User"}' | \
curl -X POST https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod/users/register \
-H 'Content-Type: application/json' -d @-

# Check if email was sent
# You should receive an email with a 6-digit code
```

## Resend Verification Code

The resend endpoint is now available:

```bash
printf '{"email":"your-email@example.com"}' | \
curl -X POST https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod/users/resend-verification \
-H 'Content-Type: application/json' -d @-
```

## Current Implementation

- ✅ Registration endpoint creates users in Cognito
- ✅ Verification endpoint confirms users with code
- ✅ Resend verification endpoint sends new codes
- ❌ Email delivery not configured in Cognito
- ✅ Frontend properly handles verification flow

## Next Steps

1. **For Development**: Use manual confirmation or Option 1
2. **For Production**: Set up SES (Option 2) with proper domain verification
3. **Consider**: Adding SMS verification as backup (requires SNS configuration)

## Troubleshooting

If emails still don't send after configuration:

1. Check CloudWatch logs for Lambda function
2. Verify SES is in the same region (us-east-1)
3. Check spam folders
4. Ensure FROM address is verified in SES
5. Check Cognito user pool email configuration

## Manual User Confirmation (Development Only)

To bypass email verification during development:

```bash
# List unconfirmed users
aws cognito-idp list-users \
  --user-pool-id us-east-1_cLPH2acQd \
  --filter "cognito:user_status=\"UNCONFIRMED\"" \
  --region us-east-1

# Confirm specific user
aws cognito-idp admin-confirm-sign-up \
  --user-pool-id us-east-1_cLPH2acQd \
  --username "email@example.com" \
  --region us-east-1
```

This allows testing the full flow without email configuration.