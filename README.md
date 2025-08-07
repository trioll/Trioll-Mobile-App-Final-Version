# Trioll Mobile App

A React Native mobile gaming platform that allows users to discover and play games through a TikTok-style swipeable interface.

## Overview

Trioll Mobile is a production-ready mobile app that connects to AWS backend infrastructure, providing users with:
- 🎮 Swipeable game discovery interface
- 👤 Guest mode with full functionality
- 🎯 Game trials and instant play
- ⭐ Like, rate, and bookmark games
- 💬 Comment on games
- 📊 User profiles and stats tracking

## Tech Stack

- **Frontend**: React Native 0.76.3, Expo SDK 53, TypeScript
- **Backend**: AWS (Lambda, API Gateway, DynamoDB, Cognito, S3)
- **Authentication**: AWS Cognito with guest mode support
- **Real-time**: WebSocket support for live updates

## Project Structure

```
├── trioll-consumer-app/      # React Native mobile app
├── backend-api-deployment/   # AWS Lambda functions and deployment scripts
├── CLAUDE.md                 # Development guide and project status
└── README.md                 # This file
```

## Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI
- iOS Simulator or Android Emulator

### Installation

```bash
# Navigate to the app directory
cd trioll-consumer-app

# Install dependencies
npm install

# Start the development server
npx expo start
```

### Running the App

- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on physical device

## Backend API

The app connects to production AWS infrastructure:
- **API Base URL**: `https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod`
- **WebSocket URL**: `wss://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod`

## Key Features

### Guest Mode
- Full app functionality without registration
- Data persists across sessions
- Can upgrade to registered account anytime

### Game Discovery
- Swipeable cards interface
- Categories and search
- Personalized recommendations

### User Interactions
- Like/unlike games
- 5-star rating system
- Bookmark favorites
- Comment on games
- Share games

### Profile System
- Track gameplay stats
- Upload profile pictures
- Edit bio and preferences
- View gameplay history

## Development

### Debug Menu
In development, access the debug menu in Settings to:
- Test API connectivity
- View debug logs
- Check authentication status

### Environment Variables
Create a `.env.local` file in `trioll-consumer-app/` with your AWS credentials.

## Support

For support, email: info@trioll.com

## License

Copyright © 2025 Trioll. All rights reserved.