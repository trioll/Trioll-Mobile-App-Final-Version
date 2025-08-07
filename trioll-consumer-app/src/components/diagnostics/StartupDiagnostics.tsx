import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Config } from '../../config/environments';
import * as SecureStore from 'expo-secure-store';

interface DiagnosticResult {
  name: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export const StartupDiagnostics: React.FC = () => {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    const diagnosticResults: DiagnosticResult[] = [];

    // Check 1: SecureStore availability
    try {
      await SecureStore.setItemAsync('test_key', 'test_value');
      await SecureStore.deleteItemAsync('test_key');
      diagnosticResults.push({
        name: 'SecureStore',
        status: 'success',
        message: 'SecureStore is available and working',
      });
    } catch (error: unknown) {
      diagnosticResults.push({
        name: 'SecureStore',
        status: 'error',
        message: 'SecureStore error - this could cause startup issues',
        details: error.message,
      });
    }

    // Check 2: Config/Environment
    try {
      const configCheck = {
        env: Config.ENV,
        apiUrl: Config.API_BASE_URL,
        useMockApi: Config.USE_MOCK_API,
        region: Config.AWS_REGION,
      };

      diagnosticResults.push({
        name: 'Configuration',
        status: 'success',
        message: `Environment: ${Config.ENV}`,
        details: configCheck,
      });
    } catch (error: unknown) {
      diagnosticResults.push({
        name: 'Configuration',
        status: 'error',
        message: 'Configuration error',
        details: error.message,
      });
    }

    // Check 3: Guest Profile Creation
    try {
      const { generateGuestId } = require('../../utils/guestStorage');
      const testId = await generateGuestId();
      diagnosticResults.push({
        name: 'Guest System',
        status: 'success',
        message: 'Guest system is working',
        details: { testGuestId: testId },
      });
    } catch (error: unknown) {
      diagnosticResults.push({
        name: 'Guest System',
        status: 'error',
        message: 'Guest system error - could prevent app startup',
        details: error.message,
      });
    }

    // Check 4: AWS Services - temporarily disabled
    diagnosticResults.push({
      name: 'AWS Services',
      status: 'warning',
      message: Config.USE_MOCK_API ? 'Using mock API mode' : 'AWS checks temporarily disabled',
      details: {
        USE_MOCK_API: Config.USE_MOCK_API,
        reason: 'Fixing bundling issues',
      },
    });

    setResults(diagnosticResults);
    setIsChecking(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return '#00FF88';
      case 'error':
        return '#FF6B6B';
      case 'warning':
        return '#FFAA00';
      default:
        return '#FFFFFF';
    }
  };

  if (isChecking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Running startup diagnostics...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Startup Diagnostics</Text>

      {results.map((result, index) => (
        <View key={index} style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Text style={[styles.statusIcon, { color: getStatusColor(result.status) }]}>
              {result.status === 'success' ? '✓' : result.status === 'error' ? '✗' : '!'}
            </Text>
            <Text style={styles.resultName}>{result.name}</Text>
          </View>
          <Text style={styles.resultMessage}>{result.message}</Text>
          {result.details && (
            <Text style={styles.resultDetails}>{JSON.stringify(result.details, null, 2)}</Text>
          )}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    padding: 20,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  resultCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIcon: {
    fontSize: 20,
    marginRight: 8,
    fontWeight: 'bold',
  },
  resultName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  resultMessage: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  resultDetails: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'monospace',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 8,
    borderRadius: 4,
  },
});
