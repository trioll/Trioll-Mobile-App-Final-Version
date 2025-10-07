import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { getLogger } from '../../src/utils/logger';
import { safeAuthService } from '../../src/services/auth/safeAuthService';
import { cognitoConfig, getCognitoCredentials } from '../../src/services/auth/cognitoConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import triollAPI, { isGuestMode } from '../../src/services/api/TriollAPI';
import { runDiagnostics } from '../../src/diagnostics/awsDiagnostics';

const logger = getLogger('AuthStatusDiagnostic');

interface AuthDiagnosticInfo {
  // App Context Info
  isGuest: boolean;
  hasGuestProfile: boolean;
  guestId?: string;
  
  // Auth Context Info
  authUser: any;
  isAuthenticated: boolean;
  
  // Cognito Info
  cognitoUser?: string;
  cognitoSession?: boolean;
  idToken?: string;
  
  // Mock Credentials Status
  hasCredentials: boolean;
  credentialsType?: 'mock' | 'stored' | 'none';
  
  // Storage Info
  storedTokens?: any;
  
  // API Mode
  apiGuestMode?: boolean;
  
  // Config Status
  userPoolId?: string;
  identityPoolId?: string;
  configValid: boolean;
  
  // Errors
  errors: string[];
}

export const AuthStatusDiagnostic: React.FC = () => {
  const [info, setInfo] = useState<AuthDiagnosticInfo>({
    isGuest: true,
    hasGuestProfile: false,
    isAuthenticated: false,
    hasCredentials: false,
    configValid: false,
    errors: []
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { isGuest, guestProfile, currentUser } = useApp();
  const { user, isAuthenticated } = useAuth();
  
  const checkAuthStatus = async () => {
    setIsLoading(true);
    const diagnosticInfo: AuthDiagnosticInfo = {
      isGuest,
      hasGuestProfile: !!guestProfile,
      guestId: guestProfile?.id,
      authUser: user,
      isAuthenticated,
      hasCredentials: false,
      configValid: false,
      errors: []
    };
    
    try {
      // Check Cognito configuration
      diagnosticInfo.userPoolId = cognitoConfig.userPoolId;
      diagnosticInfo.identityPoolId = cognitoConfig.identityPoolId;
      diagnosticInfo.configValid = !!(cognitoConfig.userPoolId && cognitoConfig.identityPoolId);
      
      if (!diagnosticInfo.configValid) {
        diagnosticInfo.errors.push('Invalid Cognito configuration');
      }
      
      // Check Cognito session
      try {
        const cognitoUser = await safeAuthService.getCurrentUser();
        diagnosticInfo.cognitoUser = cognitoUser?.getUsername();
        
        const session = await safeAuthService.getSession();
        diagnosticInfo.cognitoSession = !!session;
        if (session) {
          try {
            diagnosticInfo.idToken = session.getIdToken()?.getJwtToken()?.substring(0, 20) + '...';
          } catch (e) {
            logger.info('Could not get ID token');
          }
        }
      } catch (e) {
        logger.info('No active Cognito session');
      }
      
      // Check credentials - prefer Amplify credentials over mock
      try {
        // First check if we have Amplify credentials
        const authService = await import('../../src/services/auth/amplifyAuthService');
        const amplifyState = authService.amplifyAuthService.getCurrentState();
        
        if (amplifyState.hasCredentials && amplifyState.identityId) {
          diagnosticInfo.hasCredentials = true;
          diagnosticInfo.credentialsType = 'amplify';
        } else {
          // Fallback to mock credentials
          const mockCredentials = await getCognitoCredentials();
          if (mockCredentials && mockCredentials.accessKeyId) {
            diagnosticInfo.hasCredentials = true;
            diagnosticInfo.credentialsType = 'mock';
          }
        }
      } catch {
        diagnosticInfo.errors.push(`Credentials check error: ${error.message}`);
      }
      
      // Check stored tokens
      try {
        const storedAuth = await AsyncStorage.getItem('@trioll/auth');
        if (storedAuth) {
          const parsed = JSON.parse(storedAuth);
          diagnosticInfo.storedTokens = {
            hasIdToken: !!parsed.idToken,
            hasAccessToken: !!parsed.accessToken,
            hasRefreshToken: !!parsed.refreshToken,
            username: parsed.username
          };
          if (parsed.idToken || parsed.accessToken) {
            diagnosticInfo.credentialsType = 'stored';
          }
        }
      } catch {
        logger.error('Error reading stored auth:', error);
      }
      
      // Check API mode
      diagnosticInfo.apiGuestMode = isGuestMode();
      
      // Check if we have any form of authentication
      if (!diagnosticInfo.hasCredentials && !diagnosticInfo.cognitoSession && !diagnosticInfo.storedTokens) {
        diagnosticInfo.credentialsType = 'none';
        if (isGuest) {
          diagnosticInfo.errors.push('Guest mode active but no credentials available');
        }
      }
      
    } catch {
      diagnosticInfo.errors.push(`General error: ${error.message}`);
    }
    
    setInfo(diagnosticInfo);
    setIsLoading(false);
  };
  
  useEffect(() => {
    checkAuthStatus();
  }, [isGuest, isAuthenticated]);
  
  const getStatusColor = () => {
    if (info.configValid && (info.hasCredentials || info.cognitoSession || info.storedTokens)) {
      return info.isGuest ? '#FFD700' : '#00FF88'; // Yellow for guest, green for auth
    }
    return '#FF6B6B'; // Red for no credentials
  };
  
  const getStatusText = () => {
    if (!info.configValid) {
      return '❌ Config Error';
    }
    if (info.cognitoSession && !info.isGuest) {
      return '✓ Authenticated User';
    }
    if (info.isGuest && (info.hasCredentials || info.storedTokens)) {
      return '⚡ Guest Mode';
    }
    if (info.credentialsType === 'none') {
      return '⚠️ Fallback Mode';
    }
    return '🔄 Checking...';
  };
  
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.header, { borderColor: getStatusColor() }]}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
        <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
      </TouchableOpacity>
      
      {isExpanded && (
        <ScrollView style={styles.details}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>App Context</Text>
            <Text style={styles.item}>Is Guest: {info.isGuest ? 'Yes' : 'No'}</Text>
            <Text style={styles.item}>Has Guest Profile: {info.hasGuestProfile ? 'Yes' : 'No'}</Text>
            {info.guestId && <Text style={styles.item}>Guest ID: {info.guestId}</Text>}
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cognito Configuration</Text>
            <Text style={styles.item}>Config Valid: {info.configValid ? 'Yes' : 'No'}</Text>
            <Text style={styles.item}>User Pool: {info.userPoolId ? '✓ Configured' : '✗ Missing'}</Text>
            <Text style={styles.item}>Identity Pool: {info.identityPoolId ? '✓ Configured' : '✗ Missing'}</Text>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Auth Status</Text>
            <Text style={styles.item}>Cognito User: {info.cognitoUser || 'None'}</Text>
            <Text style={styles.item}>Has Session: {info.cognitoSession ? 'Yes' : 'No'}</Text>
            {info.idToken && <Text style={styles.item}>ID Token: {info.idToken}</Text>}
            <Text style={styles.item}>Credentials Type: {info.credentialsType === 'amplify' ? 'AWS Amplify' : info.credentialsType || 'None'}</Text>
          </View>
          
          {info.storedTokens && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Stored Auth</Text>
              <Text style={styles.item}>Username: {info.storedTokens.username || 'None'}</Text>
              <Text style={styles.item}>Has Tokens: {info.storedTokens.hasIdToken ? 'Yes' : 'No'}</Text>
            </View>
          )}
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>API Mode</Text>
            <Text style={styles.item}>Guest Mode: {info.apiGuestMode ? 'Yes' : 'No'}</Text>
          </View>
          
          {info.errors.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Issues</Text>
              {info.errors.map((error, index) => (
                <Text key={index} style={styles.error}>{error}</Text>
              ))}
            </View>
          )}
          
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={checkAuthStatus}
            disabled={isLoading}
          >
            <Text style={styles.refreshText}>
              {isLoading ? 'Checking...' : 'Refresh Status'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.refreshButton, { backgroundColor: '#FF6B6B' }]}
            onPress={async () => {
              try {
                logger.info('Running full AWS diagnostics...');
                const results = await runDiagnostics();
                
                // Show summary in alert
                const summary = `AWS Diagnostic Results:
                
Environment: ${results.environment.current}
API URL: ${results.environment.apiUrl}

Network:
• API Reachable: ${results.networkTests.apiReachable ? '✅' : '❌'}
• Response Time: ${results.networkTests.responseTime}ms

Authentication:
• Mode: ${results.authTests.authMode}
• Has Credentials: ${results.authTests.hasGuestCredentials ? '✅' : '❌'}
• Identity ID: ${results.authTests.identityId || 'None'}

API Tests:
• Health Check: ${results.apiTests.healthCheck ? '✅' : '❌'}
• Games Endpoint: ${results.apiTests.gamesEndpoint ? '✅' : '❌'}

${results.recommendations.length > 0 ? '\nRecommendations:\n' + results.recommendations.join('\n') : ''}`;
                
                Alert.alert('AWS Diagnostics Complete', summary, [
                  { text: 'OK', style: 'default' }
                ]);
                
                logger.info('Diagnostic results:', results);
              } catch {
                logger.error('Diagnostic error:', error);
                Alert.alert('Diagnostic Error', error.message);
              }
            }}
          >
            <Text style={styles.refreshText}>Run Full AWS Diagnostics</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 8,
    minWidth: 200,
    maxWidth: 300,
    zIndex: 9999,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 2,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  expandIcon: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  details: {
    maxHeight: 400,
    padding: 12,
  },
  section: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 8,
  },
  sectionTitle: {
    color: '#6366f1',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  item: {
    color: '#FFFFFF',
    fontSize: 11,
    marginVertical: 2,
  },
  error: {
    color: '#FF6B6B',
    fontSize: 11,
    marginVertical: 2,
  },
  refreshButton: {
    backgroundColor: '#6366f1',
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 8,
  },
  refreshText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});