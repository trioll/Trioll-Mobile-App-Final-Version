#!/bin/bash

# Trioll Mobile - Production Keystore Generator
# This script helps you create a production keystore for Android

echo "🔐 Trioll Mobile - Production Keystore Generator"
echo "================================================"
echo ""
echo "This will create a production keystore for signing your Android app."
echo "IMPORTANT: Keep this keystore and passwords safe - you cannot recover them!"
echo ""

# Navigate to Android app directory
cd "$(dirname "$0")/trioll-consumer-app/android/app" || exit 1

# Check if keystore already exists
if [ -f "trioll-release.keystore" ]; then
    echo "⚠️  WARNING: trioll-release.keystore already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Exiting without changes."
        exit 0
    fi
    # Backup existing keystore
    mv trioll-release.keystore "trioll-release.keystore.backup.$(date +%Y%m%d_%H%M%S)"
    echo "✅ Existing keystore backed up"
fi

echo ""
echo "📝 Please provide the following information:"
echo "(Press Enter to use defaults shown in brackets)"
echo ""

# Get user input
read -p "Your full name [Trioll Mobile Developer]: " developer_name
developer_name=${developer_name:-"Trioll Mobile Developer"}

read -p "Organization unit [Mobile Development]: " org_unit  
org_unit=${org_unit:-"Mobile Development"}

read -p "Organization [Trioll]: " organization
organization=${organization:-"Trioll"}

read -p "City/Locality [San Francisco]: " city
city=${city:-"San Francisco"}

read -p "State/Province [CA]: " state
state=${state:-"CA"}

read -p "Country code [US]: " country
country=${country:-"US"}

echo ""
echo "🔑 Generating keystore..."
echo ""

# Generate keystore
keytool -genkey -v \
    -keystore trioll-release.keystore \
    -alias trioll \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -dname "CN=$developer_name, OU=$org_unit, O=$organization, L=$city, ST=$state, C=$country"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Keystore created successfully!"
    echo ""
    echo "📁 Location: $(pwd)/trioll-release.keystore"
    echo ""
    echo "🔐 IMPORTANT NEXT STEPS:"
    echo "1. Save your keystore password in a password manager"
    echo "2. Back up trioll-release.keystore to multiple secure locations:"
    echo "   - Google Drive"
    echo "   - Dropbox" 
    echo "   - External drive"
    echo "   - Password manager attachment"
    echo ""
    echo "3. Create android/keystore.properties with:"
    echo "   storePassword=YOUR_KEYSTORE_PASSWORD"
    echo "   keyPassword=YOUR_KEY_PASSWORD"
    echo "   keyAlias=trioll"
    echo "   storeFile=trioll-release.keystore"
    echo ""
    echo "⚠️  WARNING: If you lose this keystore or password, you CANNOT update your app!"
    
    # Offer to create keystore.properties
    echo ""
    read -p "Would you like to create keystore.properties now? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cd ..
        read -sp "Enter your keystore password: " store_password
        echo
        read -sp "Enter your key password (press Enter to use same as keystore): " key_password
        echo
        key_password=${key_password:-$store_password}
        
        cat > keystore.properties << EOF
storePassword=$store_password
keyPassword=$key_password
keyAlias=trioll
storeFile=trioll-release.keystore
EOF
        
        # Add to .gitignore if not already there
        if ! grep -q "keystore.properties" ../../.gitignore 2>/dev/null; then
            echo "keystore.properties" >> ../../.gitignore
            echo "*.keystore" >> ../../.gitignore
            echo "✅ Added keystore files to .gitignore"
        fi
        
        echo "✅ keystore.properties created!"
        echo "✅ Added to .gitignore for security"
    fi
    
    echo ""
    echo "🎉 You're ready to build production releases!"
    echo ""
    echo "To build a release APK:"
    echo "cd android && ./gradlew assembleRelease"
    
else
    echo ""
    echo "❌ Failed to create keystore. Please try again."
    exit 1
fi