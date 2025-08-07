import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { runComprehensiveAPITest, quickAPITest, logDebugInfo } from '../../utils/debugApiTest';
import { runAPIDebugTest } from '../../services/api/TriollAPIDebug';

export const DebugAPIPanel: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const runQuickTest = async () => {
    setIsRunning(true);
    setLogs(['Running quick API test...']);
    
    try {
      const result = await quickAPITest();
      setLogs(prev => [...prev, `Quick test result: ${result ? '✅ Connected' : '❌ Failed'}`]);
      Alert.alert(
        'Quick Test',
        result ? 'API is reachable!' : 'API connection failed',
        [{ text: 'OK' }]
      );
    } catch (error) {
      setLogs(prev => [...prev, `Error: ${error.message}`]);
    } finally {
      setIsRunning(false);
    }
  };

  const runFullTest = async () => {
    setIsRunning(true);
    setLogs(['Starting comprehensive API test...']);
    
    try {
      const result = await runComprehensiveAPITest();
      setResults(result);
      setLogs(result.logs);
      
      Alert.alert(
        'Test Complete',
        result.success ? 'API is working properly!' : 'API test failed - check logs',
        [{ text: 'OK' }]
      );
    } catch (error) {
      setLogs(prev => [...prev, `Error: ${error.message}`]);
    } finally {
      setIsRunning(false);
    }
  };

  const runDebugTest = async () => {
    setIsRunning(true);
    setLogs(['Running detailed debug test...']);
    
    // Capture console output
    const originalLog = console.log;
    const tempLogs: string[] = [];
    console.log = (...args) => {
      tempLogs.push(args.join(' '));
      originalLog(...args);
    };
    
    try {
      await runAPIDebugTest();
      setLogs(tempLogs);
    } catch (error) {
      setLogs(prev => [...prev, `Error: ${error.message}`]);
    } finally {
      console.log = originalLog;
      setIsRunning(false);
    }
  };

  const showDebugInfo = () => {
    logDebugInfo();
    Alert.alert('Debug Info', 'Check console for detailed debug information', [{ text: 'OK' }]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="bug-outline" size={24} color="#6366f1" />
        <Text style={styles.title}>API Debug Panel</Text>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.button, isRunning && styles.buttonDisabled]}
          onPress={runQuickTest}
          disabled={isRunning}
        >
          <Ionicons name="flash-outline" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Quick Test</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary, isRunning && styles.buttonDisabled]}
          onPress={runFullTest}
          disabled={isRunning}
        >
          <Ionicons name="search-outline" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Full Test</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, isRunning && styles.buttonDisabled]}
          onPress={runDebugTest}
          disabled={isRunning}
        >
          <Ionicons name="terminal-outline" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Debug Test</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, isRunning && styles.buttonDisabled]}
          onPress={showDebugInfo}
          disabled={isRunning}
        >
          <Ionicons name="information-circle-outline" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Info</Text>
        </TouchableOpacity>
      </View>

      {isRunning && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Running tests...</Text>
        </View>
      )}

      {results && (
        <View style={styles.results}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          
          <View style={styles.resultGroup}>
            <Text style={styles.resultLabel}>Connection Tests:</Text>
            <Text style={styles.resultItem}>
              Domain Resolves: {results.connectionTest.domainResolves ? '✅' : '❌'}
            </Text>
            <Text style={styles.resultItem}>
              Basic Fetch: {results.connectionTest.basicFetch ? '✅' : '❌'}
            </Text>
            <Text style={styles.resultItem}>
              Headers Fetch: {results.connectionTest.fetchWithHeaders ? '✅' : '❌'}
            </Text>
            <Text style={styles.resultItem}>
              Auth State: {results.connectionTest.authState ? '✅' : '❌'}
            </Text>
          </View>

          <View style={styles.resultGroup}>
            <Text style={styles.resultLabel}>API Tests:</Text>
            <Text style={styles.resultItem}>
              Games Endpoint: {results.apiTest.gamesEndpoint ? '✅' : '❌'}
            </Text>
            <Text style={styles.resultItem}>
              Response Valid: {results.apiTest.responseValid ? '✅' : '❌'}
            </Text>
            <Text style={styles.resultItem}>
              Game Count: {results.apiTest.gameCount}
            </Text>
          </View>

          {results.errors.length > 0 && (
            <View style={styles.resultGroup}>
              <Text style={[styles.resultLabel, styles.errorLabel]}>Errors:</Text>
              {results.errors.map((error, index) => (
                <Text key={index} style={styles.errorItem}>{error}</Text>
              ))}
            </View>
          )}
        </View>
      )}

      {logs.length > 0 && (
        <ScrollView style={styles.logs} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Logs</Text>
          {logs.map((log, index) => (
            <Text key={index} style={styles.logItem}>{log}</Text>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: 6,
  },
  buttonPrimary: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loading: {
    alignItems: 'center',
    marginVertical: 20,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 10,
  },
  results: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  resultGroup: {
    marginBottom: 16,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
    marginBottom: 8,
  },
  resultItem: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 16,
    marginBottom: 4,
  },
  errorLabel: {
    color: '#FF6B6B',
  },
  errorItem: {
    fontSize: 12,
    color: '#FF6B6B',
    marginLeft: 16,
    marginBottom: 4,
  },
  logs: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 16,
  },
  logItem: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
});