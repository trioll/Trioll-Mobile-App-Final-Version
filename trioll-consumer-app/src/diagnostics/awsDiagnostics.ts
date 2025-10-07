/**
 * AWS Backend Connection Diagnostic Script
 * Run this to diagnose connection issues between your frontend and AWS backend
 */

import { Config } from '../config/environments';
import { safeAuthService } from '../services/auth/safeAuthService';
import { getLogger } from '../utils/logger';

const logger = getLogger('AWSConnectionDiagnostics');

export interface DiagnosticResult {
  timestamp: string;
  environment: {
    current: string;
    apiUrl: string;
    websocketUrl: string;
    region: string;
    cognitoPoolId: string;
    identityPoolId: string;
  };
  networkTests: {
    apiReachable: boolean;
    corsHeaders: Record<string, string>;
    responseTime: number;
    error?: string;
  };
  authTests: {
    hasAmplifyAuth: boolean;
    hasGuestCredentials: boolean;
    identityId?: string;
    authMode: 'guest' | 'authenticated' | 'none';
    error?: string;
  };
  apiTests: {
    healthCheck: boolean;
    gamesEndpoint: boolean;
    errors: string[];
  };
  recommendations: string[];
}

export class AWSConnectionDiagnostics {
  private results: DiagnosticResult = {
    timestamp: new Date().toISOString(),
    environment: {
      current: Config.ENV,
      apiUrl: Config.API_BASE_URL,
      websocketUrl: Config.WEBSOCKET_URL,
      region: Config.AWS_REGION,
      cognitoPoolId: Config.USER_POOL_ID,
      identityPoolId: Config.IDENTITY_POOL_ID,
    },
    networkTests: {
      apiReachable: false,
      corsHeaders: {},
      responseTime: 0,
    },
    authTests: {
      hasAmplifyAuth: false,
      hasGuestCredentials: false,
      authMode: 'none',
    },
    apiTests: {
      healthCheck: false,
      gamesEndpoint: false,
      errors: [],
    },
    recommendations: [],
  };

  /**
   * Run complete diagnostic suite
   */
  async runFullDiagnostics(): Promise<DiagnosticResult> {
    console.log('🔍 Starting AWS Connection Diagnostics...\n');
    
    // 1. Environment Check
    await this.checkEnvironment();
    
    // 2. Network Connectivity
    await this.testNetworkConnectivity();
    
    // 3. Authentication
    await this.testAuthentication();
    
    // 4. API Endpoints
    await this.testAPIEndpoints();
    
    // 5. Generate Recommendations
    this.generateRecommendations();
    
    // 6. Print Report
    this.printReport();
    
    return this.results;
  }

  /**
   * Check environment configuration
   */
  private async checkEnvironment() {
    console.log('📋 Environment Configuration:');
    console.log(`  • Environment: ${this.results.environment.current}`);
    console.log(`  • API URL: ${this.results.environment.apiUrl}`);
    console.log(`  • Region: ${this.results.environment.region}`);
    console.log(`  • Cognito Pool: ${this.results.environment.cognitoPoolId}`);
    console.log(`  • Identity Pool: ${this.results.environment.identityPoolId}\n`);
    
    // Check for missing values
    if (!this.results.environment.apiUrl) {
      this.results.recommendations.push('❌ API_BASE_URL is not configured');
    }
    if (!this.results.environment.cognitoPoolId) {
      this.results.recommendations.push('❌ USER_POOL_ID is not configured');
    }
    if (!this.results.environment.identityPoolId) {
      this.results.recommendations.push('❌ IDENTITY_POOL_ID is not configured');
    }
  }

  /**
   * Test basic network connectivity to API
   */
  private async testNetworkConnectivity() {
    console.log('🌐 Testing Network Connectivity...');
    
    try {
      const startTime = Date.now();
      
      // Use a simple GET request to health endpoint instead of OPTIONS
      const response = await fetch(`${this.results.environment.apiUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      this.results.networkTests.responseTime = Date.now() - startTime;
      this.results.networkTests.apiReachable = response.ok;
      
      // Collect CORS headers
      const corsHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        if (key.toLowerCase().includes('cors') || 
            key.toLowerCase().includes('access-control')) {
          corsHeaders[key] = value;
        }
      });
      this.results.networkTests.corsHeaders = corsHeaders;
      
      if (response.ok) {
        console.log(`  ✅ API is reachable (${this.results.networkTests.responseTime}ms)`);
      } else {
        console.log(`  ⚠️  API returned status ${response.status} (${this.results.networkTests.responseTime}ms)`);
      }
      
      if (Object.keys(corsHeaders).length > 0) {
        console.log(`  • CORS Headers:`, corsHeaders);
      }
      
    } catch {
      this.results.networkTests.error = error.message;
      console.log(`  ❌ Cannot reach API: ${error.message}`);
      this.results.recommendations.push(
        '❌ API is not reachable. Check if the API Gateway is deployed and the URL is correct.'
      );
    }
    console.log('');
  }

  /**
   * Test authentication setup
   */
  private async testAuthentication() {
    console.log('🔐 Testing Authentication...');
    
    try {
      // Import amplifyAuthService dynamically to avoid circular dependencies
      const { amplifyAuthService } = await import('../services/auth/amplifyAuthService');
      
      // Check Amplify Auth
      const amplifyState = amplifyAuthService.getCurrentState();
      this.results.authTests.hasAmplifyAuth = amplifyState.hasCredentials;
      this.results.authTests.identityId = amplifyState.identityId;
      this.results.authTests.authMode = amplifyState.isGuest ? 'guest' : 
                                       amplifyState.isAuthenticated ? 'authenticated' : 'none';
      
      console.log(`  • Amplify Auth: ${amplifyState.hasCredentials ? '✅' : '❌'}`);
      console.log(`  • Auth Mode: ${this.results.authTests.authMode}`);
      console.log(`  • Identity ID: ${amplifyState.identityId || 'None'}`);
      
      // Try to get credentials
      if (amplifyState.isGuest) {
        try {
          // Check if the method exists before calling
          if (typeof amplifyAuthService.getGuestCredentials === 'function') {
            const credentials = await amplifyAuthService.getGuestCredentials();
            this.results.authTests.hasGuestCredentials = !!credentials;
            console.log(`  • Guest Credentials: ${credentials ? '✅' : '❌'}`);
          } else {
            // If method doesn't exist but we have identity ID, credentials are still available
            if (amplifyState.identityId) {
              this.results.authTests.hasGuestCredentials = true;
              console.log(`  • Guest Credentials: ✅ (via Identity ID)`);
            } else {
              console.log(`  • Guest Credentials: ❌ (method not available)`);
            }
          }
        } catch {
          console.log(`  • Guest Credentials: ❌ ${error.message}`);
        }
      }
      
    } catch {
      this.results.authTests.error = error.message;
      console.log(`  ❌ Auth Error: ${error.message}`);
      this.results.recommendations.push(
        '❌ Authentication is not properly configured. Check Amplify setup.'
      );
    }
    console.log('');
  }

  /**
   * Test actual API endpoints
   */
  private async testAPIEndpoints() {
    console.log('🚀 Testing API Endpoints...');
    
    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.results.authTests.identityId) {
      headers['X-Guest-Mode'] = 'true';
      headers['X-Identity-Id'] = this.results.authTests.identityId;
    }
    
    // Test health endpoint
    try {
      const healthResponse = await fetch(`${this.results.environment.apiUrl}/health`, {
        headers,
      });
      this.results.apiTests.healthCheck = healthResponse.ok;
      console.log(`  • Health Check: ${healthResponse.ok ? '✅' : '❌'} (${healthResponse.status})`);
    } catch {
      console.log(`  • Health Check: ❌ ${error.message}`);
      this.results.apiTests.errors.push(`Health check failed: ${error.message}`);
    }
    
    // Test games endpoint
    try {
      const gamesResponse = await fetch(`${this.results.environment.apiUrl}/games?limit=1`, {
        headers,
      });
      this.results.apiTests.gamesEndpoint = gamesResponse.ok;
      console.log(`  • Games Endpoint: ${gamesResponse.ok ? '✅' : '❌'} (${gamesResponse.status})`);
      
      if (!gamesResponse.ok) {
        const errorText = await gamesResponse.text();
        console.log(`    Error: ${errorText}`);
        this.results.apiTests.errors.push(`Games endpoint: ${errorText}`);
      }
    } catch {
      console.log(`  • Games Endpoint: ❌ ${error.message}`);
      this.results.apiTests.errors.push(`Games endpoint failed: ${error.message}`);
    }
    console.log('');
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations() {
    const { networkTests, authTests, apiTests } = this.results;
    
    // Network issues - only if API endpoints also fail
    if (!networkTests.apiReachable && !apiTests.healthCheck && !apiTests.gamesEndpoint) {
      this.results.recommendations.push(
        '🔧 Check if your API Gateway is deployed and accessible',
        '🔧 Verify the API URL is correct in your environment config',
        '🔧 Check if you\'re behind a firewall or proxy'
      );
    }
    
    // CORS issues
    if (!networkTests.corsHeaders['access-control-allow-origin'] && networkTests.apiReachable) {
      this.results.recommendations.push(
        '🔧 Enable CORS on your API Gateway',
        '🔧 Add your frontend URL to allowed origins'
      );
    }
    
    // Auth issues - only if no identity ID is present
    if (!authTests.hasAmplifyAuth && !authTests.identityId) {
      this.results.recommendations.push(
        '🔧 Configure AWS Amplify properly',
        '🔧 Check if Cognito pools are set up correctly'
      );
    }
    
    if (authTests.authMode === 'none' && !authTests.identityId) {
      this.results.recommendations.push(
        '🔧 Enable guest access in your Identity Pool',
        '🔧 Check IAM roles for unauthenticated access'
      );
    }
    
    // API issues
    if (!apiTests.gamesEndpoint && apiTests.healthCheck) {
      this.results.recommendations.push(
        '🔧 Check if Lambda functions are deployed',
        '🔧 Verify API Gateway routes are configured',
        '🔧 Check CloudWatch logs for Lambda errors'
      );
    }
    
    // If everything works but we have false negatives
    if (apiTests.healthCheck && apiTests.gamesEndpoint && authTests.identityId) {
      if (!networkTests.apiReachable) {
        this.results.recommendations.push(
          '✅ API is working despite network test failure (React Native environment)'
        );
      }
    }
  }

  /**
   * Print diagnostic report
   */
  private printReport() {
    console.log('\n📊 DIAGNOSTIC REPORT\n');
    console.log('════════════════════════════════════════');
    
    // What's working
    console.log('\n✅ WORKING:');
    if (this.results.networkTests.apiReachable) {
      console.log('  • API is reachable');
    }
    if (this.results.authTests.hasAmplifyAuth || this.results.authTests.identityId) {
      console.log('  • AWS Amplify is configured');
    }
    if (this.results.authTests.hasGuestCredentials || this.results.authTests.identityId) {
      console.log('  • Guest credentials available');
    }
    if (this.results.apiTests.healthCheck) {
      console.log('  • Health endpoint working');
    }
    if (this.results.apiTests.gamesEndpoint) {
      console.log('  • Games endpoint working');
    }
    
    // What's failing
    console.log('\n❌ FAILING:');
    if (!this.results.networkTests.apiReachable && !this.results.apiTests.healthCheck) {
      console.log('  • Cannot reach API');
    }
    if (!this.results.authTests.hasAmplifyAuth && !this.results.authTests.identityId) {
      console.log('  • AWS Amplify not configured');
    }
    if (this.results.authTests.authMode === 'none' && !this.results.authTests.identityId) {
      console.log('  • No authentication available');
    }
    if (!this.results.apiTests.healthCheck && this.results.networkTests.apiReachable) {
      console.log('  • Health endpoint not responding');
    }
    if (!this.results.apiTests.gamesEndpoint && this.results.networkTests.apiReachable) {
      console.log('  • Games endpoint not responding');
    }
    
    // Recommendations
    if (this.results.recommendations.length > 0) {
      console.log('\n🔧 RECOMMENDATIONS:');
      this.results.recommendations.forEach(rec => console.log(`  ${rec}`));
    }
    
    console.log('\n════════════════════════════════════════');
  }
}

/**
 * Browser console helper function (only for web)
 */
if (typeof window !== 'undefined') {
  (window as any).runAWSDiagnostics = async () => {
    const diagnostics = new AWSConnectionDiagnostics();
    return await diagnostics.runFullDiagnostics();
  };
}

// Export for use in components
export const runDiagnostics = async () => {
  const diagnostics = new AWSConnectionDiagnostics();
  return await diagnostics.runFullDiagnostics();
};