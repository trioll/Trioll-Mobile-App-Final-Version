/**
 * AWS Connection Diagnostic Script for Browser Console
 * Copy and paste this entire script into your browser console to diagnose connection issues
 */

(async function runAWSDiagnostic() {
  console.clear();
  console.log('%c🔍 AWS CONNECTION DIAGNOSTIC TOOL', 'font-size: 20px; color: #FF6B6B; font-weight: bold;');
  console.log('%cStarting diagnostic tests...', 'font-size: 14px; color: #4ECDC4;\n\n');

  const results = {
    timestamp: new Date().toISOString(),
    environment: {},
    network: {},
    auth: {},
    api: {},
    errors: [],
    recommendations: []
  };

  // 1. Check Environment
  console.log('%c📋 ENVIRONMENT CHECK', 'font-size: 16px; color: #6366f1; font-weight: bold;');
  try {
    // Try to get config from window or React DevTools
    const config = window.__TRIOLL_CONFIG__ || window.Config || {};
    results.environment = {
      apiUrl: config.API_BASE_URL || 'Not found',
      region: config.AWS_REGION || 'Not found',
      userPoolId: config.USER_POOL_ID || 'Not found',
      identityPoolId: config.IDENTITY_POOL_ID || 'Not found',
      currentUrl: window.location.href,
      origin: window.location.origin
    };
    
    console.table(results.environment);
  } catch (e) {
    console.error('Failed to read environment config:', e);
    results.errors.push('Cannot read environment configuration');
  }

  // 2. Network Connectivity Test
  console.log('\n%c🌐 NETWORK CONNECTIVITY TEST', 'font-size: 16px; color: #6366f1; font-weight: bold;');
  const apiUrl = results.environment.apiUrl || 'https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod';
  
  try {
    const startTime = performance.now();
    const response = await fetch(apiUrl, {
      method: 'OPTIONS',
      headers: {
        'Origin': window.location.origin
      }
    });
    const endTime = performance.now();
    
    results.network = {
      reachable: true,
      responseTime: Math.round(endTime - startTime) + 'ms',
      status: response.status,
      corsHeaders: {}
    };
    
    // Extract CORS headers
    for (let [key, value] of response.headers) {
      if (key.toLowerCase().includes('access-control')) {
        results.network.corsHeaders[key] = value;
      }
    }
    
    console.log('✅ API is reachable');
    console.log('Response time:', results.network.responseTime);
    console.log('CORS Headers:', results.network.corsHeaders);
    
  } catch (error) {
    results.network = {
      reachable: false,
      error: error.message
    };
    console.error('❌ Cannot reach API:', error.message);
    results.recommendations.push('Check if API Gateway is deployed and accessible');
  }

  // 3. Authentication Test
  console.log('\n%c🔐 AUTHENTICATION TEST', 'font-size: 16px; color: #6366f1; font-weight: bold;');
  try {
    // Check for Amplify
    if (window.AWS && window.AWS.config) {
      results.auth.hasAWSSDK = true;
      results.auth.region = window.AWS.config.region;
      console.log('✅ AWS SDK detected');
    }
    
    // Check localStorage for auth tokens
    const authKeys = Object.keys(localStorage).filter(key => 
      key.includes('aws') || key.includes('cognito') || key.includes('amplify')
    );
    
    results.auth.authDataFound = authKeys.length > 0;
    results.auth.authKeys = authKeys;
    
    if (authKeys.length > 0) {
      console.log('✅ Auth data found in localStorage');
      console.log('Keys:', authKeys);
      
      // Try to parse identity ID
      authKeys.forEach(key => {
        try {
          const value = localStorage.getItem(key);
          if (value && value.includes('IdentityId')) {
            const parsed = JSON.parse(value);
            results.auth.identityId = parsed.IdentityId || 'Found but could not parse';
          }
        } catch (e) {}
      });
    } else {
      console.log('❌ No auth data found in localStorage');
      results.recommendations.push('User may not be authenticated or guest mode not initialized');
    }
    
  } catch (error) {
    console.error('Auth test error:', error);
    results.auth.error = error.message;
  }

  // 4. API Endpoint Tests
  console.log('\n%c🚀 API ENDPOINT TESTS', 'font-size: 16px; color: #6366f1; font-weight: bold;');
  
  const headers = {
    'Content-Type': 'application/json',
    'X-Guest-Mode': 'true'
  };
  
  if (results.auth.identityId) {
    headers['X-Identity-Id'] = results.auth.identityId;
  }
  
  // Test endpoints
  const endpoints = [
    { name: 'Health Check', path: '/health' },
    { name: 'Games List', path: '/games?limit=1' },
    { name: 'Categories', path: '/categories' }
  ];
  
  results.api.endpoints = {};
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint.name}...`);
      const response = await fetch(apiUrl + endpoint.path, { headers });
      const data = await response.text();
      
      results.api.endpoints[endpoint.name] = {
        status: response.status,
        ok: response.ok,
        response: data.substring(0, 100) + '...'
      };
      
      if (response.ok) {
        console.log(`✅ ${endpoint.name}: ${response.status}`);
      } else {
        console.log(`❌ ${endpoint.name}: ${response.status} - ${data}`);
        results.recommendations.push(`Fix ${endpoint.name} endpoint - returned ${response.status}`);
      }
      
    } catch (error) {
      console.error(`❌ ${endpoint.name}: ${error.message}`);
      results.api.endpoints[endpoint.name] = {
        error: error.message
      };
    }
  }

  // 5. Generate Report
  console.log('\n%c📊 DIAGNOSTIC REPORT', 'font-size: 18px; color: #FFD93D; font-weight: bold;');
  console.log('═'.repeat(50));
  
  // Summary
  const working = [];
  const failing = [];
  
  if (results.network.reachable) working.push('API is reachable');
  else failing.push('Cannot reach API');
  
  if (results.auth.authDataFound) working.push('Auth data found');
  else failing.push('No auth data');
  
  if (results.api.endpoints['Games List']?.ok) working.push('Games endpoint works');
  else failing.push('Games endpoint failing');
  
  console.log('\n%c✅ WORKING:', 'color: #4ECDC4; font-weight: bold;');
  working.forEach(item => console.log('  •', item));
  
  console.log('\n%c❌ FAILING:', 'color: #FF6B6B; font-weight: bold;');
  failing.forEach(item => console.log('  •', item));
  
  console.log('\n%c🔧 RECOMMENDATIONS:', 'color: #FFD93D; font-weight: bold;');
  if (results.recommendations.length === 0) {
    console.log('  • Everything looks good!');
  } else {
    results.recommendations.forEach(rec => console.log('  •', rec));
  }
  
  // Common fixes
  console.log('\n%c💡 COMMON FIXES:', 'color: #A8E6CF; font-weight: bold;');
  console.log('  1. Enable CORS on API Gateway');
  console.log('  2. Deploy all Lambda functions');
  console.log('  3. Check IAM roles for guest access');
  console.log('  4. Verify Cognito Identity Pool allows unauthenticated');
  console.log('  5. Check CloudWatch logs for Lambda errors');
  
  console.log('\n═'.repeat(50));
  console.log('Full results object available as window.__DIAGNOSTIC_RESULTS__');
  window.__DIAGNOSTIC_RESULTS__ = results;
  
  return results;
})();