#!/bin/bash

echo "🧪 Testing SES email sending directly..."

# Send test email
aws ses send-email \
  --from "Trioll <noreply@trioll.com>" \
  --to "freddiecaplin@gmail.com" \
  --subject "Test Email from Trioll" \
  --text "This is a test email to verify SES is working correctly. If you receive this, SES can send emails." \
  --region us-east-1

if [ $? -eq 0 ]; then
  echo "✅ Test email sent successfully!"
  echo "Check your inbox for the test email."
else
  echo "❌ Failed to send test email"
fi