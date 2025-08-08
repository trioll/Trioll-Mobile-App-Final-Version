#!/bin/bash

echo "🔄 Switching to Cognito Default Email Service..."
echo "This will allow ANY email address to receive verification codes immediately!"
echo ""

# Update Cognito to use default email service
aws cognito-idp update-user-pool \
  --user-pool-id us-east-1_cLPH2acQd \
  --email-configuration EmailSendingAccount=COGNITO_DEFAULT \
  --auto-verified-attributes email \
  --region us-east-1

if [ $? -eq 0 ]; then
  echo "✅ Success! Email verification will now work for ANY email address"
  echo ""
  echo "⚠️  Note: Emails will come from 'no-reply@verificationemail.com'"
  echo "📧 Daily limit: 50 emails"
  echo ""
  echo "To switch back to custom domain later:"
  echo "aws cognito-idp update-user-pool --user-pool-id us-east-1_cLPH2acQd --email-configuration EmailSendingAccount=DEVELOPER,From='Trioll <noreply@trioll.com>',SourceArn='arn:aws:ses:us-east-1:561645284740:identity/trioll.com'"
else
  echo "❌ Failed to update email configuration"
fi