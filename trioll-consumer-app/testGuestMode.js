// Quick test script for guest mode
// Add this temporarily to your App.tsx or run in console

const testGuestAPI = async () => {
  console.log('=== TESTING GUEST MODE API ===');
  
  // Test 1: Direct API call with guest headers
  try {
    const response = await fetch('https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod/games', {
      headers: {
        'Content-Type': 'application/json',
        'X-Guest-Mode': 'true',
        'X-Identity-Id': 'test-guest-123'
      }
    });
    
    console.log('Direct API Test:');
    console.log('- Status:', response.status);
    console.log('- Headers:', response.headers);
    
    if (response.ok) {
      const data = await response.json();
      console.log('- Games returned:', data.games?.length || 0);
    } else {
      console.log('- Error:', await response.text());
    }
  } catch (error) {
    console.error('Direct API failed:', error);
  }
  
  // Test 2: Check Amplify configuration
  try {
    const { fetchAuthSession } = require('aws-amplify/auth');
    const session = await fetchAuthSession();
    console.log('\nAmplify Session:');
    console.log('- Identity ID:', session.identityId);
    console.log('- Has Credentials:', !!session.credentials);
    console.log('- Is Guest:', !session.tokens);
  } catch (error) {
    console.error('Amplify session failed:', error);
  }
  
  console.log('=== END TEST ===');
};

// Run the test
testGuestAPI();