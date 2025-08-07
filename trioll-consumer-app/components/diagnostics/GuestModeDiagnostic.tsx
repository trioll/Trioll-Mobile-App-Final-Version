import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { fetchAuthSession } from 'aws-amplify/auth';

export const GuestModeDiagnostic = () => {
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>({});
  const [apiTestResult, setApiTestResult] = useState<string>('');

  useEffect(() => {
    checkGuestCredentials();
  }, []);

  const checkGuestCredentials = async () => {
    try {
      // Check Amplify session
      const session = await fetchAuthSession();
      
      setDiagnosticInfo({
        hasIdentityId: !!session.identityId,
        identityId: session.identityId?.substring(0, 30) + '...',
        hasCredentials: !!session.credentials,
        hasTokens: !!session.tokens,
        isGuest: !session.tokens,
      });

      console.log('=== GUEST MODE DIAGNOSTIC ===');
      console.log('Identity ID:', session.identityId);
      console.log('Has Credentials:', !!session.credentials);
      console.log('Is Guest:', !session.tokens);
      console.log('===========================');
      
    } catch (error) {
      console.error('Diagnostic error:', error);
      setDiagnosticInfo({ error: error.message });
    }
  };

  const testAPI = async () => {
    try {
      setApiTestResult('Testing...');
      
      // Test direct API call
      const response = await fetch('https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod/games', {
        headers: {
          'Content-Type': 'application/json',
          'X-Guest-Mode': 'true',
          'X-Identity-Id': diagnosticInfo.identityId || 'test-guest'
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        setApiTestResult(`✅ Success! Got ${data.games?.length || 0} games`);
      } else {
        setApiTestResult(`❌ Error: ${response.status} - ${JSON.stringify(data)}`);
      }
    } catch (error) {
      setApiTestResult(`❌ Failed: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Guest Mode Diagnostic</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Amplify Session:</Text>
        {Object.entries(diagnosticInfo).map(([key, value]) => (
          <Text key={key} style={styles.info}>
            {key}: {String(value)}
          </Text>
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={testAPI}>
        <Text style={styles.buttonText}>Test API Call</Text>
      </TouchableOpacity>

      {apiTestResult ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API Test Result:</Text>
          <Text style={styles.info}>{apiTestResult}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    margin: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  section: {
    marginVertical: 10,
  },
  sectionTitle: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  info: {
    color: '#fff',
    fontSize: 12,
    marginVertical: 2,
  },
  button: {
    backgroundColor: '#6366f1',
    padding: 10,
    borderRadius: 5,
    marginVertical: 10,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});