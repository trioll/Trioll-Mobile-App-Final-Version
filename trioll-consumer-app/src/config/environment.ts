export const config = {
  API_URL: process.env.API_URL || 'https://api.trioll.com',
  USE_MOCK_API: process.env.USE_MOCK_API === 'true',
  WS_URL: process.env.WS_URL || 'wss://ws.trioll.com',
  COGNITO_REGION: process.env.COGNITO_REGION || 'us-east-1',
  COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID || '',
  COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID || '',
  COGNITO_IDENTITY_POOL_ID: process.env.COGNITO_IDENTITY_POOL_ID || '',
};
