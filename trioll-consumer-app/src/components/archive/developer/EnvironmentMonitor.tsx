import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import {
  environmentActivator,
  EnvironmentStatus,
} from '../../services/environment/environmentActivator';
import {
  healthCheckService,
  HealthCheckResult,
} from '../../services/environment/healthCheckService';
import { Config } from '../../config/environments';
import { COLORS as colors } from '../../../constants/colors';

const logger = getLogger('EnvironmentMonitor');

import { getLogger } from '../../utils/logger';
export const EnvironmentMonitor: React.FC = () => {
  const [envStatus, setEnvStatus] = useState<EnvironmentStatus | null>(null);
  const [healthResult, setHealthResult] = useState<HealthCheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Get initial status
    setEnvStatus(environmentActivator.getStatus());
    setHealthResult(healthCheckService.getLastResult());

    // Listen for status updates
    const handleStatusUpdate = (status: EnvironmentStatus) => {
      setEnvStatus(status);
    };

    environmentActivator.addStatusListener(handleStatusUpdate);

    return () => {
      environmentActivator.removeStatusListener(handleStatusUpdate);
    };
  }, []);

  const handleActivateStaging = async () => {
    setIsLoading(true);
    try {
      const result = await environmentActivator.activateStaging();
      if (!(result as any).success) {
        logger.error('Activation failed:', (result as any).errors);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRollback = async () => {
    setIsLoading(true);
    try {
      await environmentActivator.rollbackToDevelopment();
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const health = await healthCheckService.runHealthCheck();
      setHealthResult(health);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return colors.neonGreen;
      case 'degraded':
        return colors.neonYellow;
      case 'unavailable':
      case 'disconnected':
        return colors.neonRed;
      default:
        return colors.textSecondary;
    }
  };

  if (!envStatus) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Environment Monitor</Text>
        <Text style={styles.subtitle}>Developer Diagnostics</Text>
      </View>

      {/* Current Environment */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Environment</Text>
        <View style={styles.envCard}>
          <Text style={styles.envName}>{envStatus.current.toUpperCase()}</Text>
          <Text style={styles.envDetail}>API: {Config.API_BASE_URL}</Text>
          <Text style={styles.envDetail}>
            Mock API: {Config.USE_MOCK_API ? 'Enabled' : 'Disabled'}
          </Text>
          {envStatus.fallbackActive && (
            <Text style={[styles.warning, { color: colors.neonYellow }]}>
              ⚠️ Fallback Active - Using Mock APIs
            </Text>
          )}
        </View>
      </View>

      {/* Service Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Service Status</Text>
        <View style={styles.serviceGrid}>
          {Object.entries(envStatus.services).map(([service, status]) => (
            <View key={service} style={styles.serviceCard}>
              <Text style={styles.serviceName}>{service.toUpperCase()}</Text>
              <View
                style={[
                  styles.statusIndicator,
                  { backgroundColor: getStatusColor(status.available ? 'healthy' : 'unavailable') },
                ]}
              />
              <Text style={styles.serviceStatus}>
                {status.available ? 'Available' : 'Unavailable'}
              </Text>
              {'latency' in status && status.latency && (
                <Text style={styles.serviceLatency}>{status.latency}ms</Text>
              )}
            </View>
          ))}
        </View>
      </View>

      {/* Health Check Results */}
      {healthResult && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Health Check Results</Text>
          <Text style={styles.timestamp}>
            Last Check: {new Date(healthResult.timestamp).toLocaleTimeString()}
          </Text>

          {showDetails && (
            <View style={styles.healthDetails}>
              {healthResult.services.map(service => (
                <View key={service.name} style={styles.healthItem}>
                  <Text
                    style={[styles.healthServiceName, { color: getStatusColor(service.status) }]}
                  >
                    {service.name}
                  </Text>
                  <Text style={styles.healthServiceStatus}>{service.status}</Text>
                  {(service as any).error && (
                    <Text style={styles.healthServiceError}>{(service as any).error}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() => setShowDetails(!showDetails)}
          >
            <Text style={styles.detailsButtonText}>
              {showDetails ? 'Hide Details' : 'Show Details'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>

        {envStatus.current === 'development' ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={handleActivateStaging}
            disabled={isLoading || envStatus.isTransitioning}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.actionButtonText}>Activate Staging Environment</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={handleRollback}
            disabled={isLoading || envStatus.isTransitioning}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.actionButtonText}>Rollback to Development</Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={handleRefresh}
          disabled={isRefreshing}
        >
          <Text style={styles.actionButtonText}>Run Health Check</Text>
        </TouchableOpacity>
      </View>

      {/* Recommendations */}
      {healthResult && healthResult.recommendations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommendations</Text>
          {healthResult.recommendations.map((rec, index) => (
            <Text key={index} style={styles.recommendation}>
              • {rec}
            </Text>
          ))}
        </View>
      )}

      {/* Transition Status */}
      {envStatus.isTransitioning && (
        <View style={styles.transitionOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.transitionText}>Switching to {envStatus.target} environment...</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  section: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  envCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  envName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  envDetail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  warning: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  serviceCard: {
    width: '50%',
    padding: 8,
  },
  serviceName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  serviceStatus: {
    fontSize: 14,
    color: colors.text,
  },
  serviceLatency: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  timestamp: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  healthDetails: {
    marginTop: 12,
  },
  healthItem: {
    marginBottom: 12,
  },
  healthServiceName: {
    fontSize: 16,
    fontWeight: '600',
  },
  healthServiceStatus: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  healthServiceError: {
    fontSize: 12,
    color: colors.neonRed,
    marginTop: 4,
  },
  detailsButton: {
    marginTop: 12,
    padding: 8,
  },
  detailsButtonText: {
    fontSize: 14,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  actionButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  dangerButton: {
    backgroundColor: colors.neonRed,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  recommendation: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  transitionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  transitionText: {
    fontSize: 16,
    color: colors.text,
    marginTop: 16,
  },
});
