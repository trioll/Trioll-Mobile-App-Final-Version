#!/bin/bash

# Fix Android Emulator DNS Resolution for S3
# This script helps resolve DNS issues in Android emulator

echo "Fixing Android Emulator DNS Resolution..."

# Method 1: Using ADB to add hosts entry
adb shell "su -c 'echo \"52.217.164.120 trioll-prod-games-us-east-1.s3.amazonaws.com\" >> /system/etc/hosts'"
adb shell "su -c 'echo \"52.217.164.120 s3.amazonaws.com\" >> /system/etc/hosts'"

# Method 2: Set DNS servers
adb shell "setprop net.dns1 8.8.8.8"
adb shell "setprop net.dns2 8.8.4.4"

# Method 3: Restart network
adb shell "svc wifi disable"
adb shell "svc wifi enable"

echo "DNS fix applied. Please restart your app."

# Alternative: Use IP address directly in the app
echo ""
echo "Alternative solution:"
echo "You can also update your app to use the S3 IP address directly:"
echo "52.217.164.120 for trioll-prod-games-us-east-1.s3.amazonaws.com"