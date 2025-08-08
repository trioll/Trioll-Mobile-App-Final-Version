# AWS SES Production Access Request

## Instructions to Request Production Access

1. **Log into AWS Console**
   - Go to https://console.aws.amazon.com/ses/
   - Make sure you're in the `us-east-1` (N. Virginia) region

2. **Navigate to Account Dashboard**
   - In the left sidebar, click on "Account dashboard"
   - You'll see your current sending limits and sandbox status

3. **Request Production Access**
   - Click the "Request production access" button
   - Fill out the form with the following information:

### Form Details:

**Mail Type**: Transactional

**Website URL**: https://trioll.com

**Use Case Description**:
```
Trioll is a mobile gaming platform that requires transactional email capabilities for:

1. User registration verification codes
2. Password reset notifications
3. Account security alerts
4. Game achievement notifications
5. Friend requests and social features

All emails are triggered by user actions and are essential for account security and user experience. We implement proper unsubscribe mechanisms and follow AWS best practices for email sending.

Expected volume: 500-1000 emails per day initially, scaling to 5000-10000 as the platform grows.
```

**Additional Information**:
- We have implemented proper bounce and complaint handling
- All emails include unsubscribe links where applicable
- We maintain clean email lists and only send to verified users
- Domain (trioll.com) is verified with DKIM enabled
- SPF records are properly configured

**Expected sending volume**: 
- Daily: 1,000
- Peak: 100 per hour

**Describe how you handle bounces and complaints**:
```
We use AWS SNS to receive bounce and complaint notifications. Our system automatically:
1. Removes hard bounced emails from our database
2. Implements exponential backoff for soft bounces
3. Immediately processes unsubscribe requests
4. Maintains a suppression list to prevent sending to opted-out users
```

4. **Submit the request**
   - Review all information
   - Submit the form
   - AWS typically responds within 24-48 hours

## Current Configuration

- **Domain**: trioll.com (verified)
- **DKIM**: Enabled and verified
- **From Email**: support@trioll.com
- **Cognito**: Configured to use SES
- **Current Status**: Sandbox (limited to 200 emails/day to verified recipients only)

## DNS Records (Already Configured)

Your DNS should already have:
1. TXT record for domain verification
2. CNAME records for DKIM (3 records)
3. SPF record in your TXT: `v=spf1 include:amazonses.com ~all`

## After Approval

Once approved for production:
1. No changes needed in the application
2. Can send to any email address (not just verified ones)
3. Higher sending limits (starting at 50,000/day)
4. Better deliverability