/**
 * Debug-Enhanced Trioll API Service
 * This version includes comprehensive logging for troubleshooting connection issues
 */

import { Config } from '../../config/environments';
import { safeAuthService } from '../auth/safeAuthService';
import { getLogger } from '../../utils/logger';
import { RequestOptions } from './types';

const logger = getLogger('TriollAPIDebug');

// Color codes for console
const COLORS = {
  REQUEST: '\x1b[36m%s\x1b[0m',    // Cyan
  SUCCESS: '\x1b[32m%s\x1b[0m',    // Green
  ERROR: '\x1b[31m%s\x1b[0m',      // Red
  WARNING: '\x1b[33m%s\x1b[0m',    // Yellow
  DEBUG: '\x1b[35m%s\x1b[0m',      // Magenta
};

class TriollAPIDebug {
  private apiBase: string;
  private requestCounter = 0;

  constructor() {
    this.apiBase = Config.API_BASE_URL;
    console.log(COLORS.DEBUG, `[TriollAPIDebug] Initialized with API base: ${this.apiBase}`);
    console.log(COLORS.DEBUG, `[TriollAPIDebug] Environment: ${Config.ENV}`);
    console.log(COLORS.DEBUG, `[TriollAPIDebug] Mock API: ${Config.USE_MOCK_API}`);
  }

  async debugRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const requestId = ++this.requestCounter;
    const startTime = Date.now();
    
    console.log(COLORS.REQUEST, `\n========== API REQUEST #${requestId} ==========`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Endpoint: ${endpoint}`);
    console.log(`Method: ${options.method || 'GET'}`);

    try {
      // Step 1: Auth token retrieval
      console.log(COLORS.DEBUG, '\n[Step 1] Getting auth credentials...');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Trioll-Mobile/1.0',
        ...options.headers,
      };

      let authMethod = 'none';
      let authDetails: any = {};

      try {
        // Check Amplify auth first
        const { amplifyAuthService } = await import('../auth/amplifyAuthService');
        const authState = amplifyAuthService.getCurrentState();
        console.log('Amplify auth state:', JSON.stringify(authState, null, 2));

        if (authState.isGuest && authState.identityId) {
          authMethod = 'amplify-guest';
          authDetails = { identityId: authState.identityId };
          headers['X-Guest-Mode'] = 'true';
          headers['X-Identity-Id'] = authState.identityId;
        } else if (authState.user) {
          authMethod = 'amplify-user';
          authDetails = { userId: authState.user.username };
        }
      } catch (amplifyError) {
        console.log(COLORS.WARNING, '[Auth] Amplify not available:', amplifyError.message);
      }

      // Try safe auth service
      if (authMethod === 'none') {
        try {
          const token = await safeAuthService.getIdToken();
          console.log(`SafeAuthService token:`, token ? `${token.substring(0, 20)}...` : 'null');
          
          if (token) {
            if (token.startsWith('guest-')) {
              authMethod = 'safe-guest';
              authDetails = { guestToken: token };
              headers['Authorization'] = `Bearer ${token}`;
              headers['X-Guest-Mode'] = 'true';
            } else {
              authMethod = 'safe-user';
              authDetails = { tokenPrefix: token.substring(0, 20) };
              headers['Authorization'] = `Bearer ${token}`;
            }
          }
        } catch (safeAuthError) {
          console.log(COLORS.WARNING, '[Auth] SafeAuthService error:', safeAuthError.message);
        }
      }

      // Fallback to guest
      if (authMethod === 'none') {
        authMethod = 'fallback-guest';
        const fallbackId = `fallback_${Date.now()}`;
        authDetails = { fallbackId };
        headers['X-Guest-Mode'] = 'true';
        headers['X-Identity-Id'] = fallbackId;
      }

      console.log(`Auth method: ${authMethod}`);
      console.log(`Auth details:`, authDetails);
      console.log(`Final headers:`, JSON.stringify(headers, null, 2));

      // Step 2: Build request
      console.log(COLORS.DEBUG, '\n[Step 2] Building request...');
      const url = `${this.apiBase}${endpoint}`;
      console.log(`Full URL: ${url}`);

      const requestOptions: RequestInit = {
        method: options.method || 'GET',
        headers,
        mode: 'cors',
        credentials: 'omit', // Important for CORS
      };

      if (options.body) {
        requestOptions.body = typeof options.body === 'string' 
          ? options.body 
          : JSON.stringify(options.body);
        console.log(`Request body:`, options.body);
      }

      console.log(`Request options:`, JSON.stringify(requestOptions, null, 2));

      // Step 3: Make request
      console.log(COLORS.DEBUG, '\n[Step 3] Sending request...');
      
      // First, let's try a simple fetch to test connectivity
      console.log('Testing with simple fetch first...');
      try {
        const testResponse = await fetch(url, { method: 'HEAD' });
        console.log(`Simple fetch test - Status: ${testResponse.status}`);
      } catch (testError) {
        console.log(COLORS.ERROR, 'Simple fetch failed:', testError);
      }

      // Now the actual request
      const response = await fetch(url, requestOptions);
      const duration = Date.now() - startTime;
      
      console.log(`Response status: ${response.status} ${response.statusText}`);
      console.log(`Response headers:`, JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
      console.log(`Request duration: ${duration}ms`);

      // Step 4: Handle response
      console.log(COLORS.DEBUG, '\n[Step 4] Processing response...');
      
      if (!response.ok) {
        console.log(COLORS.ERROR, `HTTP Error: ${response.status}`);
        
        const errorDetails: any = {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
        };

        try {
          const errorText = await response.text();
          console.log('Error response body:', errorText);
          
          try {
            errorDetails.body = JSON.parse(errorText);
          } catch {
            errorDetails.body = errorText;
          }
        } catch {
          console.log('Could not read error response body');
        }

        console.log(COLORS.ERROR, 'Full error details:', JSON.stringify(errorDetails, null, 2));
        
        const error = new Error(`HTTP ${response.status}: ${errorDetails.body?.message || response.statusText}`);
        (error as any).debugInfo = errorDetails;
        throw error;
      }

      // Success!
      const responseText = await response.text();
      console.log(`Response body length: ${responseText.length} characters`);
      console.log(`Response preview: ${responseText.substring(0, 200)}...`);

      let data: T;
      try {
        data = JSON.parse(responseText);
        console.log(COLORS.SUCCESS, `✅ Request #${requestId} successful!`);
      } catch {
        console.log(COLORS.ERROR, 'Failed to parse JSON response');
        throw new Error('Invalid JSON response');
      }

      return data;

    } catch {
      const duration = Date.now() - startTime;
      console.log(COLORS.ERROR, `\n❌ Request #${requestId} failed after ${duration}ms`);
      console.log(COLORS.ERROR, 'Error type:', error.constructor.name);
      console.log(COLORS.ERROR, 'Error message:', error.message);
      console.log(COLORS.ERROR, 'Error stack:', error.stack);
      
      if (error.debugInfo) {
        console.log(COLORS.ERROR, 'Debug info:', JSON.stringify(error.debugInfo, null, 2));
      }

      // Network-specific error details
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        console.log(COLORS.ERROR, '\nPossible causes:');
        console.log('1. Network connectivity issue');
        console.log('2. CORS blocking the request (check browser console)');
        console.log('3. SSL certificate issue');
        console.log('4. Request blocked by browser extension or firewall');
        console.log('5. API Gateway not responding');
      }

      throw error;
    } finally {
      console.log(COLORS.REQUEST, `========== END REQUEST #${requestId} ==========\n`);
    }
  }

  // Test method to check basic connectivity
  async testConnection(): Promise<void> {
    console.log(COLORS.DEBUG, '\n🧪 Running connection test...\n');
    
    // Test 1: DNS resolution
    console.log('Test 1: Checking if API domain resolves...');
    try {
      const url = new URL(this.apiBase);
      console.log(`✅ Domain: ${url.hostname}`);
    } catch {
      console.log('❌ Invalid API URL');
      return;
    }

    // Test 2: Basic fetch
    console.log('\nTest 2: Basic fetch test...');
    try {
      const response = await fetch(this.apiBase + '/games', {
        method: 'GET',
        mode: 'cors',
      });
      console.log(`✅ Fetch succeeded - Status: ${response.status}`);
    } catch {
      console.log(`❌ Fetch failed:`, error.message);
    }

    // Test 3: With headers
    console.log('\nTest 3: Fetch with headers...');
    try {
      const response = await fetch(this.apiBase + '/games', {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Trioll-Mobile/1.0',
        },
      });
      console.log(`✅ Fetch with headers succeeded - Status: ${response.status}`);
    } catch {
      console.log(`❌ Fetch with headers failed:`, error.message);
    }

    // Test 4: Check auth state
    console.log('\nTest 4: Checking auth state...');
    try {
      const token = await safeAuthService.getIdToken();
      console.log(`Auth token: ${token ? 'Present' : 'Missing'}`);
      if (token) {
        console.log(`Token type: ${token.startsWith('guest-') ? 'Guest' : 'User'}`);
        console.log(`Token preview: ${token.substring(0, 30)}...`);
      }
    } catch {
      console.log('❌ Could not get auth token:', error.message);
    }

    console.log('\n✅ Connection test complete!\n');
  }
}

// Export singleton instance
export const triollAPIDebug = new TriollAPIDebug();

// Also export a quick test function
export async function runAPIDebugTest() {
  console.log(COLORS.DEBUG, '🚀 Starting API Debug Test...\n');
  
  try {
    // Run connection test
    await triollAPIDebug.testConnection();
    
    // Try to fetch games
    console.log('\n📱 Attempting to fetch games...');
    const games = await triollAPIDebug.debugRequest('/games');
    console.log(COLORS.SUCCESS, '✅ Successfully fetched games!');
    console.log(`Got ${(games as any).games?.length || 0} games`);
    
  } catch {
    console.log(COLORS.ERROR, '❌ Debug test failed:', error.message);
  }
}

// Make it available globally for easy testing
if (typeof window !== 'undefined') {
  (window as any).runAPIDebugTest = runAPIDebugTest;
  (window as any).triollAPIDebug = triollAPIDebug;
  console.log(COLORS.DEBUG, '💡 Debug API available globally: window.runAPIDebugTest()');
}