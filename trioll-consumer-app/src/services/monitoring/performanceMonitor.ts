import { InteractionManager, NativeModules } from 'react-native';
import AsyncStorage from '../../utils/storageCompat';
import { Config } from '../../config/environments';
import { getLogger } from '../../utils/logger';
// Removed analyticsService import to avoid circular dependency

const logger = getLogger('PerformanceMonitor');

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  usedNativeHeapSize?: number;
  totalNativeHeapSize?: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private frameDropThreshold = 2; // frames
  private slowRenderThreshold = 16; // ms (60fps = 16ms per frame)
  private memoryWarningThreshold = 0.8; // 80% memory usage
  private batchSize = 50;
  private metricsQueue: PerformanceMetric[] = [];
  private flushInterval: number | null = null;

  constructor() {
    if (Config.FEATURES.PERFORMANCE_MONITORING) {
      this.initialize();
    }
  }

  private initialize() {
    // Start periodic metric flushing
    this.flushInterval = setInterval(() => {
      this.flushMetrics();
    }, 30000) as unknown as number; // Every 30 seconds

    // Monitor app state changes
    this.monitorMemoryUsage();
    this.monitorFrameRate();
  }

  // Screen render performance
  measureScreenRender(screenName: string): () => void {
    const startTime = Date.now();
    const metric: PerformanceMetric = {
      name: `screen_render_${screenName}`,
      startTime,
    };

    this.metrics.set(metric.name, metric);

    return () => {
      InteractionManager.runAfterInteractions(() => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        metric.endTime = endTime;
        metric.duration = duration;
        metric.metadata = { screenName };

        this.reportMetric(metric);
        this.metrics.delete(metric.name);

        // Track slow renders
        if (duration > 1000) {
          this.trackSlowRender(screenName, duration);
        }
      });
    };
  }

  // API call performance
  measureApiCall(endpoint: string, method: string): () => void {
    const startTime = Date.now();
    const metricName = `api_${method}_${endpoint.replace(/\//g, '_')}`;
    const metric: PerformanceMetric = {
      name: metricName,
      startTime,
      metadata: { endpoint, method },
    };

    this.metrics.set(metricName, metric);

    return () => {
      const endTime = Date.now();
      const duration = endTime - startTime;

      metric.endTime = endTime;
      metric.duration = duration;

      this.reportMetric(metric);
      this.metrics.delete(metricName);
    };
  }

  // Component mount performance
  measureComponentMount(componentName: string): () => void {
    const startTime = Date.now();
    const metric: PerformanceMetric = {
      name: `component_mount_${componentName}`,
      startTime,
      metadata: { componentName },
    };

    this.metrics.set(metric.name, metric);

    return () => {
      const endTime = Date.now();
      const duration = endTime - startTime;

      metric.endTime = endTime;
      metric.duration = duration;

      this.reportMetric(metric);
      this.metrics.delete(metric.name);
    };
  }

  // Image loading performance
  measureImageLoad(imageUrl: string): () => void {
    const startTime = Date.now();
    const metric: PerformanceMetric = {
      name: `image_load_${Date.now()}`,
      startTime,
      metadata: { imageUrl },
    };

    this.metrics.set(metric.name, metric);

    return () => {
      const endTime = Date.now();
      const duration = endTime - startTime;

      metric.endTime = endTime;
      metric.duration = duration;

      this.reportMetric(metric);
      this.metrics.delete(metric.name);
    };
  }

  // WebSocket connection performance
  measureWebSocketConnection(): () => void {
    const startTime = Date.now();
    const metric: PerformanceMetric = {
      name: 'websocket_connection',
      startTime,
    };

    this.metrics.set(metric.name, metric);

    return () => {
      const endTime = Date.now();
      const duration = endTime - startTime;

      metric.endTime = endTime;
      metric.duration = duration;

      this.reportMetric(metric);
      this.metrics.delete(metric.name);
    };
  }

  // Start a performance operation
  startOperation(name: string): string {
    const operationId = `${name}_${Date.now()}_${Math.random()}`;
    const metric: PerformanceMetric = {
      name,
      startTime: Date.now(),
    };
    this.metrics.set(operationId, metric);
    return operationId;
  }

  // End a performance operation
  endOperation(operationId: string, success: boolean = true) {
    const metric = this.metrics.get(operationId);
    if (!metric) return;

    metric.endTime = Date.now();
    metric.duration = metric.endTime - metric.startTime;
    metric.metadata = { ...metric.metadata, success };

    this.reportMetric(metric);
    this.metrics.delete(operationId);
  }

  // Record a single metric value
  recordMetric(name: string, value: number, metadata?: Record<string, any>) {
    const metric: PerformanceMetric = {
      name,
      startTime: Date.now(),
      metadata: { ...metadata, value },
    };
    this.reportMetric(metric);
  }

  // Custom performance marks
  mark(name: string, metadata?: Record<string, any>) {
    const metric: PerformanceMetric = {
      name: `mark_${name}`,
      startTime: Date.now(),
      metadata,
    };

    this.metrics.set(name, metric);
  }

  measure(name: string, startMark: string, endMark?: string) {
    const startMetric = this.metrics.get(startMark);
    if (!startMetric) return;

    const endTime = endMark ? this.metrics.get(endMark)?.startTime : Date.now();
    if (!endTime) return;

    const duration = endTime - startMetric.startTime;
    const metric: PerformanceMetric = {
      name: `measure_${name}`,
      startTime: startMetric.startTime,
      endTime,
      duration,
      metadata: { startMark, endMark },
    };

    this.reportMetric(metric);
  }

  // Memory monitoring
  private async monitorMemoryUsage() : Promise<void> {
    if (!Config.FEATURES.PERFORMANCE_MONITORING) return;

    setInterval(async () => {
      const memoryInfo = await this.getMemoryInfo();

      if (memoryInfo) {
        const usageRatio = memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize;

        if (usageRatio > this.memoryWarningThreshold) {
          this.handleMemoryWarning(memoryInfo);
        }

        // Report memory metrics periodically
        this.reportMetric({
          name: 'memory_usage',
          startTime: Date.now(),
          metadata: memoryInfo,
        });
      }
    }, 60000); // Check every minute
  }

  private async getMemoryInfo(): Promise<MemoryInfo | null> {
    try {
      // Try to get native memory info if available
      if (NativeModules.MemoryModule) {
        return await NativeModules.MemoryModule.getMemoryInfo();
      }

      // Fallback to JS heap info
      // @ts-expect-error - performance.memory might not be available
      if (global.performance && global.performance.memory) {
        // @ts-expect-error - performance.memory is not in types
        return {
          usedJSHeapSize: global.performance.memory.usedJSHeapSize,
          totalJSHeapSize: global.performance.memory.totalJSHeapSize,
        };
      }

      return null;
    } catch (error) {
      logger.warn('Failed to get memory info:', error);
      return null;
    }
  }

  private handleMemoryWarning(memoryInfo: MemoryInfo) {
    // Clear caches to free memory
    this.clearPerformanceCaches();

    // Report memory warning
    // Analytics tracking moved to avoid circular dependency
    logger.warn('Memory warning:', memoryInfo);

    // Notify app to take action
    if (global.dispatchEvent) {
      global.dispatchEvent(new Event('memorywarning'));
    }
  }

  // Frame rate monitoring
  private monitorFrameRate() {
    if (!Config.FEATURES.PERFORMANCE_MONITORING) return;

    let frameCount = 0;
    let lastTime = Date.now();
    let droppedFrames = 0;

    const measureFrame = () => {
      const currentTime = Date.now();
      const delta = currentTime - lastTime;

      if (delta > this.slowRenderThreshold) {
        droppedFrames++;
      }

      frameCount++;

      // Report frame rate every 5 seconds
      if (frameCount >= 300) {
        // ~5 seconds at 60fps
        const fps = Math.round((frameCount * 1000) / (currentTime - (lastTime - delta)));

        this.reportMetric({
          name: 'frame_rate',
          startTime: currentTime,
          metadata: {
            fps,
            droppedFrames,
            frameCount,
          },
        });

        // Reset counters
        frameCount = 0;
        droppedFrames = 0;
      }

      lastTime = currentTime;
      requestAnimationFrame(measureFrame);
    };

    requestAnimationFrame(measureFrame);
  }

  // Report individual metric
  private reportMetric(metric: PerformanceMetric) {
    if (!Config.FEATURES.PERFORMANCE_MONITORING) return;

    this.metricsQueue.push(metric);

    // Flush if batch is full
    if (this.metricsQueue.length >= this.batchSize) {
      this.flushMetrics();
    }
  }

  // Batch report metrics
  private async flushMetrics() : Promise<void> {
    if (this.metricsQueue.length === 0) return;

    const metrics = [...this.metricsQueue];
    this.metricsQueue = [];

    try {
      // Send to analytics
      // Analytics tracking moved to avoid circular dependency
      // Reduced logging to avoid spam
      if (Config.DEBUG?.ENABLE_LOGGING && metrics.length > 100) {
        logger.debug('Performance metrics batch:', { count: metrics.length });
      }

      // Store locally for debugging
      if (Config.DEBUG.ENABLE_LOGGING) {
        await this.storeMetricsLocally(metrics);
      }
    } catch (error) {
      logger.error('Failed to flush performance metrics:', error);
      // Re-queue metrics on failure
      this.metricsQueue.unshift(...metrics);
    }
  }

  private async storeMetricsLocally(metrics: PerformanceMetric[]) {
    try {
      const existingMetrics = await AsyncStorage.getItem('performance_metrics');
      let allMetrics: PerformanceMetric[] = [];

      if (existingMetrics) {
        try {
          // Validate JSON string before parsing
          if (typeof existingMetrics !== 'string' || !existingMetrics.trim().startsWith('[')) {
            // Clear corrupted data
            await AsyncStorage.removeItem('performance_metrics');
            allMetrics = [];
          } else {
            allMetrics = JSON.parse(existingMetrics);
            // Validate that it's an array
            if (!Array.isArray(allMetrics)) {
              allMetrics = [];
            }
          }
        } catch {
          // If parsing fails, clear corrupted data silently
          await AsyncStorage.removeItem('performance_metrics');
          allMetrics = [];
          // Only log in debug mode to avoid noise
          if (Config.DEBUG?.ENABLE_LOGGING) {
            logger.info('Cleared corrupted performance metrics');
          }
        }
      }

      // Keep only last 1000 metrics
      const updatedMetrics = [...allMetrics, ...metrics].slice(-1000);

      await AsyncStorage.setItem('performance_metrics', JSON.stringify(updatedMetrics));
    } catch (error) {
      if (Config.DEBUG?.ENABLE_LOGGING) {
        logger.warn('Failed to store metrics locally:', error);
      }
    }
  }

  private trackSlowRender(screenName: string, duration: number) {
    // Analytics tracking moved to avoid circular dependency
    if (Config.DEBUG?.ENABLE_LOGGING) {
      logger.warn('Slow render detected', { screenName, duration });
    }
  }

  private async clearPerformanceCaches() : Promise<void> {
    try {
      // Clear AsyncStorage performance data
      const keys = await AsyncStorage.getAllKeys();
      const performanceKeys = keys.filter(
        key => key.includes('performance') || key.includes('metrics')
      );

      if (performanceKeys.length > 0) {
        await AsyncStorage.multiRemove(performanceKeys);
      }

      // Clear in-memory caches
      this.metrics.clear();
      this.metricsQueue = [];
    } catch (error) {
      logger.warn('Failed to clear performance caches:', error);
    }
  }

  // Get performance summary
  async getPerformanceSummary(): Promise<unknown> {
    try {
      const metricsJson = await AsyncStorage.getItem('performance_metrics');
      if (!metricsJson) return null;

      let metrics: PerformanceMetric[];
      try {
        // Validate JSON string before parsing
        if (typeof metricsJson !== 'string' || !metricsJson.trim().startsWith('[')) {
          // Clear corrupted data
          await AsyncStorage.removeItem('performance_metrics');
          return null;
        }

        metrics = JSON.parse(metricsJson);
        if (!Array.isArray(metrics)) {
          return null;
        }
      } catch {
        // Clear corrupted data silently
        await AsyncStorage.removeItem('performance_metrics');
        return null;
      }

      // Calculate summaries
      const summary = {
        screenRenders: this.calculateAverages(
          metrics.filter((m: PerformanceMetric) => m.name.startsWith('screen_render'))
        ),
        apiCalls: this.calculateAverages(
          metrics.filter((m: PerformanceMetric) => m.name.startsWith('api_'))
        ),
        componentMounts: this.calculateAverages(
          metrics.filter((m: PerformanceMetric) => m.name.startsWith('component_mount'))
        ),
        imageLoads: this.calculateAverages(
          metrics.filter((m: PerformanceMetric) => m.name.startsWith('image_load'))
        ),
        memoryUsage: metrics.filter((m: PerformanceMetric) => m.name === 'memory_usage').slice(-10), // Last 10 memory readings
        frameRate: metrics.filter((m: PerformanceMetric) => m.name === 'frame_rate').slice(-10), // Last 10 frame rate readings
      };

      return summary;
    } catch (error) {
      logger.error('Failed to get performance summary:', error);
      return null;
    }
  }

  private calculateAverages(metrics: PerformanceMetric[]) {
    if (metrics.length === 0) return null;

    const durations = metrics.filter(m => m.duration !== undefined).map(m => m.duration!);

    if (durations.length === 0) return null;

    return {
      count: durations.length,
      average: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      min: Math.min(...durations),
      max: Math.max(...durations),
      p50: this.percentile(durations, 0.5),
      p95: this.percentile(durations, 0.95),
      p99: this.percentile(durations, 0.99),
    };
  }

  private percentile(values: number[], p: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * p);
    return sorted[index] || 0;
  }

  // Cleanup
  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    // Flush remaining metrics
    this.flushMetrics();
  }
}

export const performanceMonitor = new PerformanceMonitor();
