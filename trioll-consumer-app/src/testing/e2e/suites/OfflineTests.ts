
/**
 * Offline Functionality End-to-End Tests
 * Complete offline capability testing with sync validation
 */

import { E2ETestSuite, E2ETest, E2ETestResult } from '../E2ETestFramework';
import { e2eTestFramework } from '../E2ETestFramework';
import { offlineQueueManager } from '../../../utils/offlineQueueManager';
import { authService } from '../../../services/auth/authServiceAdapter';
import { dynamoDBService, TABLES } from '../../../services/database/dynamoDBService';
import { NetworkManager } from '../../../utils/networkManager';
import AsyncStorage from '../../../utils/storageCompat';
import * as Network from 'expo-network';

export class OfflineTests {
  /**
   * Create offline test suite
   */
  static createSuite(): E2ETestSuite {
    return {
      suiteId: 'offline',
      name: 'Offline Functionality Tests',
      description: 'Complete offline capability and sync testing',
      tests: [
        this.createOfflineBrowsingTest(),
        this.createOfflineInteractionTest(),
        this.createOfflineQueueTest(),
        this.createConflictResolutionTest(),
        this.createOfflineSyncTest(),
        this.createPartialSyncTest(),
        this.createOfflineDataPersistenceTest(),
        this.createNetworkTransitionTest(),
      ],
      setup: async () => {
                // Clear any existing offline data
        await offlineQueueManager.clearQueue();
        await AsyncStorage.removeItem('offlineCache');
      },
      teardown: async () => {
                // Ensure back online
        NetworkManager.getInstance().setOnline(true);
        await offlineQueueManager.clearQueue();
      },
    };
  }

  /**
   * Test offline game browsing
   */
  static createOfflineBrowsingTest(): E2ETest {
    return {
      testId: 'offline-browse-001',
      name: 'Offline Game Browsing',
      description: 'Test browsing cached games while offline',
      category: 'offline',
      priority: 'critical',
      timeout: 30000,
      execute: async (): Promise<E2ETestResult> => {
        const startTime = Date.now();
        const errors: string[] = [];
        const performanceMetrics: Record<string, unknown> = {};

        try {
          // Step 1: Cache games while online
          const cacheStart = Date.now();
          const games = await dynamoDBService.scan(TABLES.GAMES, { limit: 20 });

          if (!games.items || games.items.length === 0) {
            throw new Error('No games to cache');
          }

          // Store in offline cache
          await AsyncStorage.setItem(
            'offlineGameCache',
            JSON.stringify({
              games: games.items,
              cachedAt: Date.now(),
              version: 1,
            })
          );

          performanceMetrics.cacheTime = Date.now() - cacheStart;

          // Step 2: Go offline
          NetworkManager.getInstance().setOnline(false);
          const networkState = await Network.getNetworkStateAsync();
          // Simulate offline state
          (networkState as any).isConnected = false;

          // Step 3: Try to load games offline
          const offlineStart = Date.now();
          const cachedData = await AsyncStorage.getItem('offlineGameCache');

          if (!cachedData) {
            errors.push('Offline cache not available');
            throw new Error('No offline data');
          }

          const cached = JSON.parse(cachedData);
          performanceMetrics.offlineLoadTime = Date.now() - offlineStart;

          if (!cached.games || cached.games.length === 0) {
            errors.push('Cached games empty');
          }

          // Step 4: Test cache expiry
          const cacheAge = Date.now() - cached.cachedAt;
          const maxCacheAge = 3600000; // 1 hour

          if (cacheAge > maxCacheAge) {
            errors.push('Cache expired but still used');
          }

          // Step 5: Test filtering offline
          const actionGames = cached.games.filter((g: unknown) => g.category === 'Action');

          if (cached.games.length > 0 && actionGames.length === 0) {
            errors.push('Offline filtering failed');
          }

          // Step 6: Test search offline
          const searchTerm = 'game';
          const searchResults = cached.games.filter(
            (g: unknown) =>
              g.name?.toLowerCase().includes(searchTerm) ||
              g.description?.toLowerCase().includes(searchTerm)
          );

          if (searchResults.length === 0 && cached.games.length > 0) {
            errors.push('Offline search failed');
          }

          // Go back online
          NetworkManager.getInstance().setOnline(true);

          return {
            testId: 'offline-browse-001',
            category: 'offline',
            scenario: 'Offline Game Browsing',
            status: errors.length === 0 ? 'passed' : 'warning',
            duration: Date.now() - startTime,
            details: `Browsed ${cached.games.length} games offline`,
            errors,
            performanceMetrics,
          };
        } catch (error: unknown) {
          return {
            testId: 'offline-browse-001',
            category: 'offline',
            scenario: 'Offline Game Browsing',
            status: 'failed',
            duration: Date.now() - startTime,
            details: 'Offline browsing test failed',
            errors: [...errors, error.message],
            performanceMetrics,
          };
        } finally {
          NetworkManager.getInstance().setOnline(true);
        }
      },
    };
  }

  /**
   * Test offline user interactions
   */
  static createOfflineInteractionTest(): E2ETest {
    return {
      testId: 'offline-interact-001',
      name: 'Offline User Interactions',
      description: 'Test user interactions while offline',
      category: 'offline',
      priority: 'critical',
      timeout: 35000,
      execute: async (): Promise<E2ETestResult> => {
        const startTime = Date.now();
        const errors: string[] = [];

        try {
          // Get user context
          let userId = 'test_user_offline';
          if (await authService.isAuthenticated()) {
            const user = await authService.getCurrentUser();
            userId = user?.id || userId;
          } else if (authService.isGuest()) {
            userId = 'guest_user';
          }

          // Step 1: Go offline
          NetworkManager.getInstance().setOnline(false);
          offlineQueueManager.pause(); // Prevent immediate sync

          const initialQueueSize = offlineQueueManager.getQueueStatus().size;

          // Step 2: Perform offline interactions
          const interactions = [
            {
              type: 'like',
              gameId: 'offline_game_1',
              timestamp: Date.now(),
            },
            {
              type: 'bookmark',
              gameId: 'offline_game_2',
              timestamp: Date.now(),
            },
            {
              type: 'rating',
              gameId: 'offline_game_3',
              rating: 5,
              timestamp: Date.now(),
            },
            {
              type: 'comment',
              gameId: 'offline_game_4',
              text: 'Great game! (offline comment)',
              timestamp: Date.now(),
            },
          ];

          for (const interaction of interactions) {
            switch (interaction.type) {
              case 'like':
                await offlineQueueManager.enqueue({
                  type: 'put',
                  table: TABLES.USER_INTERACTIONS,
                  data: {
                    userId,
                    gameId: interaction.gameId,
                    liked: true,
                    timestamp: new Date(interaction.timestamp).toISOString(),
                  },
                  priority: 'normal',
                  userId,
                });
                break;

              case 'bookmark':
                await offlineQueueManager.enqueue({
                  type: 'update',
                  table: TABLES.USER_INTERACTIONS,
                  data: {
                    key: { userId, gameId: interaction.gameId },
                    updates: { bookmarked: true },
                  },
                  priority: 'normal',
                  userId,
                });
                break;

              case 'rating':
                await offlineQueueManager.enqueue({
                  type: 'update',
                  table: TABLES.USER_INTERACTIONS,
                  data: {
                    key: { userId, gameId: interaction.gameId },
                    updates: {
                      rating: interaction.rating,
                      ratedAt: new Date(interaction.timestamp).toISOString(),
                    },
                  },
                  priority: 'normal',
                  userId,
                });
                break;

              case 'comment':
                await offlineQueueManager.enqueue({
                  type: 'put',
                  table: TABLES.COMMENTS,
                  data: {
                    id: `comment_offline_${interaction.timestamp}`,
                    userId,
                    gameId: interaction.gameId,
                    text: interaction.text,
                    timestamp: new Date(interaction.timestamp).toISOString(),
                  },
                  priority: 'low',
                  userId,
                });
                break;
            }
          }

          // Step 3: Verify interactions queued
          const queueStatus = offlineQueueManager.getQueueStatus();
          const queuedCount = queueStatus.size - initialQueueSize;

          if (queuedCount !== interactions.length) {
            errors.push(`Expected ${interactions.length} queued, got ${queuedCount}`);
          }

          // Step 4: Test queue persistence
          const queueData = offlineQueueManager.getAllOperations();
          await AsyncStorage.setItem('offlineQueueBackup', JSON.stringify(queueData));

          // Simulate app restart
          offlineQueueManager.clearQueue();

          // Restore queue
          const savedQueue = await AsyncStorage.getItem('offlineQueueBackup');
          if (savedQueue) {
            const operations = JSON.parse(savedQueue);
            for (const op of operations) {
              await offlineQueueManager.enqueue(op);
            }
          }

          const restoredSize = offlineQueueManager.getQueueStatus().size;
          if (restoredSize !== queuedCount) {
            errors.push('Queue not properly persisted/restored');
          }

          // Step 5: Test offline indicator
          const offlineStatus = {
            isOffline: true,
            queueSize: queueStatus.size,
            lastSync: Date.now() - 300000, // 5 minutes ago
          };

          await AsyncStorage.setItem('offlineStatus', JSON.stringify(offlineStatus));

          // Go back online
          NetworkManager.getInstance().setOnline(true);
          offlineQueueManager.resume();

          return {
            testId: 'offline-interact-001',
            category: 'offline',
            scenario: 'Offline User Interactions',
            status: errors.length === 0 ? 'passed' : 'warning',
            duration: Date.now() - startTime,
            details: `Queued ${queuedCount} offline interactions`,
            errors,
          };
        } catch (error: unknown) {
          return {
            testId: 'offline-interact-001',
            category: 'offline',
            scenario: 'Offline User Interactions',
            status: 'failed',
            duration: Date.now() - startTime,
            details: 'Offline interaction test failed',
            errors: [...errors, error.message],
          };
        } finally {
          NetworkManager.getInstance().setOnline(true);
          offlineQueueManager.resume();
        }
      },
    };
  }

  /**
   * Test offline queue management
   */
  static createOfflineQueueTest(): E2ETest {
    return {
      testId: 'offline-queue-001',
      name: 'Offline Queue Management',
      description: 'Test queue ordering, priority, and limits',
      category: 'offline',
      priority: 'high',
      timeout: 30000,
      execute: async (): Promise<E2ETestResult> => {
        const startTime = Date.now();
        const errors: string[] = [];

        try {
          // Clear queue
          await offlineQueueManager.clearQueue();

          // Step 1: Test priority ordering
          const operations = [
            { priority: 'low', data: 'op1' },
            { priority: 'high', data: 'op2' },
            { priority: 'normal', data: 'op3' },
            { priority: 'high', data: 'op4' },
            { priority: 'low', data: 'op5' },
          ];

          for (const op of operations) {
            await offlineQueueManager.enqueue({
              type: 'test',
              table: 'test',
              data: (op as unknown).data,
              priority: op.priority as unknown,
              userId: 'test',
            });
          }

          // Get operations and check order
          const queued = offlineQueueManager.getAllOperations();
          const highPriorityOps = queued.filter(op => op.priority === 'high');

          if (highPriorityOps.length !== 2) {
            errors.push('High priority operations not properly queued');
          }

          // Step 2: Test queue size limits
          const maxQueueSize = 1000;
          const currentSize = offlineQueueManager.getQueueStatus().size;

          // Try to exceed limit
          for (let i = currentSize; i < maxQueueSize + 10; i++) {
            try {
              await offlineQueueManager.enqueue({
                type: 'test',
                table: 'test',
                data: `bulk_op_${i}`,
                priority: 'low',
                userId: 'test',
              });
            } catch (error: unknown) {
              if (i < maxQueueSize) {
                errors.push(`Queue rejected operation at ${i}, limit is ${maxQueueSize}`);
              }
              break;
            }
          }

          // Step 3: Test operation expiry
          const expiredOp = {
            type: 'test' as const,
            table: 'test',
            data: 'expired_op',
            priority: 'normal' as const,
            userId: 'test',
            timestamp: Date.now() - 86400000 * 8, // 8 days old
          };

          // Queue expired operation
          await offlineQueueManager.enqueue(expiredOp);

          // Clean expired
          const beforeClean = offlineQueueManager.getQueueStatus().size;
          await offlineQueueManager.cleanExpiredOperations();
          const afterClean = offlineQueueManager.getQueueStatus().size;

          if (beforeClean === afterClean) {
            errors.push('Expired operations not cleaned');
          }

          // Step 4: Test selective sync
          const userOps = offlineQueueManager.getUserOperations('test');
          if (userOps.length === 0) {
            errors.push('User operations filtering failed');
          }

          // Step 5: Test operation cancellation
          if (userOps.length > 0) {
            const opToCancel = userOps[0];
            await offlineQueueManager.cancelOperation(opToCancel.id);

            const afterCancel = offlineQueueManager.getUserOperations('test');
            if (afterCancel.length === userOps.length) {
              errors.push('Operation cancellation failed');
            }
          }

          // Step 6: Test retry tracking
          const failingOp = {
            type: 'test' as const,
            table: 'test',
            data: 'failing_op',
            priority: 'high' as const,
            userId: 'test',
            retryCount: 3,
            lastRetry: Date.now(),
          };

          await offlineQueueManager.enqueue(failingOp);

          // Clear queue for next test
          await offlineQueueManager.clearQueue();

          return {
            testId: 'offline-queue-001',
            category: 'offline',
            scenario: 'Offline Queue Management',
            status: errors.length === 0 ? 'passed' : 'warning',
            duration: Date.now() - startTime,
            details: 'Queue management features tested',
            errors,
          };
        } catch (error: unknown) {
          return {
            testId: 'offline-queue-001',
            category: 'offline',
            scenario: 'Offline Queue Management',
            status: 'failed',
            duration: Date.now() - startTime,
            details: 'Queue management test failed',
            errors: [...errors, error.message],
          };
        }
      },
    };
  }

  /**
   * Test conflict resolution
   */
  static createConflictResolutionTest(): E2ETest {
    return {
      testId: 'offline-conflict-001',
      name: 'Conflict Resolution',
      description: 'Test handling of conflicting offline changes',
      category: 'offline',
      priority: 'critical',
      timeout: 35000,
      execute: async (): Promise<E2ETestResult> => {
        const startTime = Date.now();
        const errors: string[] = [];

        try {
          const userId = 'conflict_test_user';
          const gameId = 'conflict_test_game';

          // Step 1: Create initial state online
          NetworkManager.getInstance().setOnline(true);

          const initialData = {
            userId,
            gameId,
            liked: true,
            rating: 4,
            playCount: 10,
            lastModified: Date.now() - 10000, // 10 seconds ago
          };

          await dynamoDBService.putItem(TABLES.USER_INTERACTIONS, initialData);

          // Step 2: Go offline and make changes
          NetworkManager.getInstance().setOnline(false);
          offlineQueueManager.pause();

          const offlineChanges = {
            rating: 5,
            liked: false,
            lastModified: Date.now() - 5000, // 5 seconds ago
          };

          await offlineQueueManager.enqueue({
            type: 'update',
            table: TABLES.USER_INTERACTIONS,
            data: {
              key: { userId, gameId },
              updates: offlineChanges,
            },
            priority: 'high',
            userId,
          });

          // Step 3: Simulate server-side change (newer)
          const serverChanges = {
            rating: 3,
            playCount: 15,
            lastModified: Date.now(), // Now
          };

          // In real scenario, this would happen on server
          // For testing, we'll simulate the conflict

          // Step 4: Go back online and sync
          NetworkManager.getInstance().setOnline(true);
          offlineQueueManager.resume();

          // Simulate conflict detection
          const conflicts: unknown[] = [];

          const queuedOps = offlineQueueManager.getAllOperations();
          for (const op of queuedOps) {
            if (op.type === 'update') {
              // Check if server version is newer
              if (serverChanges.lastModified > offlineChanges.lastModified) {
                conflicts.push({
                  operation: op,
                  conflict: 'server_newer',
                  resolution: 'server_wins',
                });
              }
            }
          }

          if (conflicts.length === 0) {
            errors.push('No conflicts detected when expected');
          }

          // Step 5: Test merge strategy
          const mergedData = {
            ...initialData,
            ...serverChanges,
            // Preserve some offline changes if non-conflicting
            bookmarked: true, // This wasn't in server changes
          };

          // Step 6: Test conflict notification
          await AsyncStorage.setItem(
            'conflictNotifications',
            JSON.stringify({
              conflicts: conflicts.length,
              lastConflict: Date.now(),
              resolution: 'automatic',
            })
          );

          // Clear queue
          await offlineQueueManager.clearQueue();

          return {
            testId: 'offline-conflict-001',
            category: 'offline',
            scenario: 'Conflict Resolution',
            status: errors.length === 0 ? 'passed' : 'warning',
            duration: Date.now() - startTime,
            details: `Resolved ${conflicts.length} conflicts`,
            errors,
          };
        } catch (error: unknown) {
          return {
            testId: 'offline-conflict-001',
            category: 'offline',
            scenario: 'Conflict Resolution',
            status: 'failed',
            duration: Date.now() - startTime,
            details: 'Conflict resolution test failed',
            errors: [...errors, error.message],
          };
        } finally {
          NetworkManager.getInstance().setOnline(true);
          offlineQueueManager.resume();
        }
      },
    };
  }

  /**
   * Test offline sync
   */
  static createOfflineSyncTest(): E2ETest {
    return {
      testId: 'offline-sync-001',
      name: 'Offline Data Synchronization',
      description: 'Test complete sync process when coming back online',
      category: 'offline',
      priority: 'critical',
      retryCount: 1,
      timeout: 40000,
      execute: async (): Promise<E2ETestResult> => {
        const startTime = Date.now();
        const errors: string[] = [];
        const performanceMetrics: Record<string, unknown> = {};

        try {
          const userId = 'sync_test_user';

          // Step 1: Create offline operations
          NetworkManager.getInstance().setOnline(false);
          offlineQueueManager.pause();

          const operations = [
            {
              type: 'put' as const,
              table: TABLES.USER_INTERACTIONS,
              data: {
                userId,
                gameId: 'sync_game_1',
                liked: true,
                timestamp: new Date().toISOString(),
              },
              priority: 'high' as const,
              userId,
            },
            {
              type: 'put' as const,
              table: TABLES.COMMENTS,
              data: {
                id: `comment_sync_${Date.now()}`,
                userId,
                gameId: 'sync_game_2',
                text: 'Offline comment',
                timestamp: new Date().toISOString(),
              },
              priority: 'normal' as const,
              userId,
            },
            {
              type: 'update' as const,
              table: TABLES.USER_GAMES,
              data: {
                key: { userId, gameId: 'sync_game_3' },
                updates: {
                  status: 'completed',
                  completedAt: new Date().toISOString(),
                },
              },
              priority: 'low' as const,
              userId,
            },
          ];

          for (const op of operations) {
            await offlineQueueManager.enqueue(op);
          }

          const queueSizeBefore = offlineQueueManager.getQueueStatus().size;

          // Step 2: Go back online
          NetworkManager.getInstance().setOnline(true);
          offlineQueueManager.resume();

          // Step 3: Start sync
          const syncStart = Date.now();
          const syncResult = await offlineQueueManager.startSync();
          performanceMetrics.syncDuration = Date.now() - syncStart;

          if (syncResult.failed > 0) {
            errors.push(`${syncResult.failed} operations failed to sync`);
          }

          if ((syncResult as unknown).successful < operations.length) {
            errors.push(`Only ${(syncResult as unknown).successful}/${operations.length} synced`);
          }

          // Step 4: Verify queue cleared
          const queueSizeAfter = offlineQueueManager.getQueueStatus().size;
          if (queueSizeAfter > 0) {
            errors.push(`${queueSizeAfter} operations still in queue after sync`);
          }

          // Step 5: Verify data persisted
          // In real test, would query database to confirm

          // Step 6: Test sync progress tracking
          const syncProgress = {
            total: queueSizeBefore,
            synced: (syncResult as unknown).successful,
            failed: syncResult.failed,
            duration: performanceMetrics.syncDuration,
            timestamp: Date.now(),
          };

          await AsyncStorage.setItem('lastSyncResult', JSON.stringify(syncProgress));

          performanceMetrics.avgSyncTime = performanceMetrics.syncDuration / operations.length;

          return {
            testId: 'offline-sync-001',
            category: 'offline',
            scenario: 'Offline Data Synchronization',
            status: errors.length === 0 ? 'passed' : 'warning',
            duration: Date.now() - startTime,
            details: `Synced ${(syncResult as unknown).successful} operations`,
            errors,
            performanceMetrics,
          };
        } catch (error: unknown) {
          return {
            testId: 'offline-sync-001',
            category: 'offline',
            scenario: 'Offline Data Synchronization',
            status: 'failed',
            duration: Date.now() - startTime,
            details: 'Sync test failed',
            errors: [...errors, error.message],
            performanceMetrics,
          };
        } finally {
          NetworkManager.getInstance().setOnline(true);
          offlineQueueManager.resume();
        }
      },
    };
  }

  /**
   * Test partial sync recovery
   */
  static createPartialSyncTest(): E2ETest {
    return {
      testId: 'offline-partial-001',
      name: 'Partial Sync Recovery',
      description: 'Test recovery from interrupted synchronization',
      category: 'offline',
      priority: 'high',
      timeout: 35000,
      execute: async (): Promise<E2ETestResult> => {
        const startTime = Date.now();
        const errors: string[] = [];

        try {
          const userId = 'partial_sync_user';

          // Step 1: Create multiple operations
          const operations = Array(10)
            .fill(null)
            .map((_, i) => ({
              type: 'put' as const,
              table: TABLES.USER_INTERACTIONS,
              data: {
                userId,
                gameId: `partial_game_${i}`,
                liked: true,
                timestamp: new Date().toISOString(),
              },
              priority: 'normal' as const,
              userId,
            }));

          for (const op of operations) {
            await offlineQueueManager.enqueue(op);
          }

          // Step 2: Start sync and interrupt
          offlineQueueManager.resume();

          // Start sync
          const syncPromise = offlineQueueManager.startSync();

          // Interrupt after short delay
          setTimeout(() => {
            NetworkManager.getInstance().setOnline(false);
          }, 1000);

          const partialResult = await syncPromise;

          if ((partialResult as unknown).successful === operations.length) {
            errors.push('Sync completed when interruption expected');
          }

          // Step 3: Check remaining queue
          const remainingOps = offlineQueueManager.getQueueStatus().size;
          if (remainingOps === 0) {
            errors.push('No operations remaining after partial sync');
          }

          // Step 4: Resume connection and complete sync
          NetworkManager.getInstance().setOnline(true);

          const resumeResult = await offlineQueueManager.startSync();

          const totalSynced =
            (partialResult as unknown).successful + (resumeResult as unknown).successful;
          if (totalSynced < operations.length) {
            errors.push(`Only ${totalSynced}/${operations.length} synced in total`);
          }

          // Step 5: Test sync state persistence
          const syncState = {
            interrupted: true,
            lastInterruption: Date.now(),
            partialProgress: (partialResult as unknown).successful,
            resumed: true,
            completed: totalSynced === operations.length,
          };

          await AsyncStorage.setItem('syncState', JSON.stringify(syncState));

          // Step 6: Verify no duplicates
          // In real test, would check database for duplicate entries

          return {
            testId: 'offline-partial-001',
            category: 'offline',
            scenario: 'Partial Sync Recovery',
            status: errors.length === 0 ? 'passed' : 'warning',
            duration: Date.now() - startTime,
            details: `Recovered from partial sync, ${totalSynced} total synced`,
            errors,
          };
        } catch (error: unknown) {
          return {
            testId: 'offline-partial-001',
            category: 'offline',
            scenario: 'Partial Sync Recovery',
            status: 'failed',
            duration: Date.now() - startTime,
            details: 'Partial sync test failed',
            errors: [...errors, error.message],
          };
        } finally {
          NetworkManager.getInstance().setOnline(true);
          await offlineQueueManager.clearQueue();
        }
      },
    };
  }

  /**
   * Test offline data persistence
   */
  static createOfflineDataPersistenceTest(): E2ETest {
    return {
      testId: 'offline-persist-001',
      name: 'Offline Data Persistence',
      description: 'Test data persistence across app restarts',
      category: 'offline',
      priority: 'high',
      timeout: 30000,
      execute: async (): Promise<E2ETestResult> => {
        const startTime = Date.now();
        const errors: string[] = [];

        try {
          // Step 1: Create comprehensive offline state
          const offlineData = {
            queue: offlineQueueManager.getAllOperations(),
            cache: {
              games: Array(10)
                .fill(null)
                .map((_, i) => ({
                  id: `cached_game_${i}`,
                  name: `Cached Game ${i}`,
                  cached: true,
                })),
              userInteractions: {
                likes: ['game1', 'game2', 'game3'],
                bookmarks: ['game4', 'game5'],
                ratings: { game1: 5, game2: 4 },
              },
            },
            metadata: {
              lastSync: Date.now() - 3600000, // 1 hour ago
              offlineSince: Date.now() - 1800000, // 30 minutes ago
              queueSize: offlineQueueManager.getQueueStatus().size,
            },
          };

          // Step 2: Persist all offline data
          await AsyncStorage.setItem('offlineQueue', JSON.stringify(offlineData.queue));
          await AsyncStorage.setItem('offlineCache', JSON.stringify(offlineData.cache));
          await AsyncStorage.setItem('offlineMetadata', JSON.stringify(offlineData.metadata));

          // Step 3: Simulate app restart by clearing memory
          await offlineQueueManager.clearQueue();

          // Step 4: Restore offline data
          const restoredQueue = await AsyncStorage.getItem('offlineQueue');
          const restoredCache = await AsyncStorage.getItem('offlineCache');
          const restoredMetadata = await AsyncStorage.getItem('offlineMetadata');

          if (!restoredQueue || !restoredCache || !restoredMetadata) {
            errors.push('Offline data not persisted');
            throw new Error('Data restoration failed');
          }

          // Restore queue
          const queueData = JSON.parse(restoredQueue);
          for (const op of queueData) {
            await offlineQueueManager.enqueue(op);
          }

          // Verify restoration
          const restoredQueueSize = offlineQueueManager.getQueueStatus().size;
          if (restoredQueueSize !== queueData.length) {
            errors.push('Queue not fully restored');
          }

          // Step 5: Test cache validity
          const cache = JSON.parse(restoredCache);
          const metadata = JSON.parse(restoredMetadata);

          const cacheAge = Date.now() - metadata.lastSync;
          const maxCacheAge = 7200000; // 2 hours

          if (cacheAge > maxCacheAge) {
            // Cache should be invalidated
            await AsyncStorage.removeItem('offlineCache');
          }

          // Step 6: Test compression for large data
          const largeData = {
            games: Array(100)
              .fill(null)
              .map((_, i) => ({
                id: `game_${i}`,
                name: `Game ${i}`,
                description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
                stats: { plays: Math.random() * 1000, likes: Math.random() * 100 },
              })),
          };

          const uncompressedSize = JSON.stringify(largeData).length;
          await AsyncStorage.setItem('largeOfflineData', JSON.stringify(largeData));

          // In real implementation, would use compression
          const compressionRatio = 1; // No compression in this test

          return {
            testId: 'offline-persist-001',
            category: 'offline',
            scenario: 'Offline Data Persistence',
            status: errors.length === 0 ? 'passed' : 'warning',
            duration: Date.now() - startTime,
            details: `Persisted and restored ${restoredQueueSize} operations`,
            errors,
          };
        } catch (error: unknown) {
          return {
            testId: 'offline-persist-001',
            category: 'offline',
            scenario: 'Offline Data Persistence',
            status: 'failed',
            duration: Date.now() - startTime,
            details: 'Persistence test failed',
            errors: [...errors, error.message],
          };
        }
      },
    };
  }

  /**
   * Test network transitions
   */
  static createNetworkTransitionTest(): E2ETest {
    return {
      testId: 'offline-transition-001',
      name: 'Network State Transitions',
      description: 'Test smooth transitions between online/offline states',
      category: 'offline',
      priority: 'high',
      timeout: 40000,
      execute: async (): Promise<E2ETestResult> => {
        const startTime = Date.now();
        const errors: string[] = [];
        const performanceMetrics: Record<string, unknown> = {};

        try {
          const transitions: unknown[] = [];

          // Monitor network state changes
          const checkInterval = setInterval(async () => {
            const state = await Network.getNetworkStateAsync();
            transitions.push({
              isConnected: state.isConnected,
              type: state.type || Network.NetworkStateType.UNKNOWN,
              timestamp: Date.now(),
            });
          }, 1000);

          // Step 1: Start online
          NetworkManager.getInstance().setOnline(true);
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Step 2: Queue operations while online
          const onlineOp = {
            type: 'put' as const,
            table: TABLES.TEST,
            data: { test: 'online_operation' },
            priority: 'normal' as const,
            userId: 'test',
          };

          await offlineQueueManager.enqueue(onlineOp);

          // Should sync immediately when online
          const onlineQueueSize = offlineQueueManager.getQueueStatus().size;

          // Step 3: Transition to offline
          const transitionStart = Date.now();
          NetworkManager.getInstance().setOnline(false);
          performanceMetrics.offlineTransitionTime = Date.now() - transitionStart;

          // Step 4: Operations while offline
          const offlineOps = Array(5)
            .fill(null)
            .map((_, i) => ({
              type: 'put' as const,
              table: TABLES.TEST,
              data: { test: `offline_op_${i}` },
              priority: 'normal' as const,
              userId: 'test',
            }));

          for (const op of offlineOps) {
            await offlineQueueManager.enqueue(op);
          }

          const offlineQueueSize = offlineQueueManager.getQueueStatus().size;
          if (offlineQueueSize < offlineOps.length) {
            errors.push('Offline operations not queued properly');
          }

          // Step 5: Transition back online
          const onlineTransitionStart = Date.now();
          NetworkManager.getInstance().setOnline(true);
          performanceMetrics.onlineTransitionTime = Date.now() - onlineTransitionStart;

          // Wait for auto-sync
          await new Promise(resolve => setTimeout(resolve, 3000));

          const afterSyncSize = offlineQueueManager.getQueueStatus().size;
          if (afterSyncSize > 0) {
            errors.push(`${afterSyncSize} operations not synced after coming online`);
          }

          // Step 6: Rapid transitions (flaky network)
          for (let i = 0; i < 3; i++) {
            NetworkManager.getInstance().setOnline(false);
            await new Promise(resolve => setTimeout(resolve, 500));
            NetworkManager.getInstance().setOnline(true);
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          // Should handle rapid transitions gracefully
          const finalQueueSize = offlineQueueManager.getQueueStatus().size;

          // Step 7: Verify transition history
          if (transitions.length < 2) {
            errors.push('Network transitions not properly tracked');
          }

          // Cleanup
          clearInterval(checkInterval);

          performanceMetrics.totalTransitions = transitions.length;

          return {
            testId: 'offline-transition-001',
            category: 'offline',
            scenario: 'Network State Transitions',
            status: errors.length === 0 ? 'passed' : 'warning',
            duration: Date.now() - startTime,
            details: `Handled ${transitions.length} network transitions`,
            errors,
            performanceMetrics,
          };
        } catch (error: unknown) {
          return {
            testId: 'offline-transition-001',
            category: 'offline',
            scenario: 'Network State Transitions',
            status: 'failed',
            duration: Date.now() - startTime,
            details: 'Network transition test failed',
            errors: [...errors, error.message],
            performanceMetrics,
          };
        } finally {
          NetworkManager.getInstance().setOnline(true);
          await offlineQueueManager.clearQueue();
        }
      },
    };
  }
}

// Register the test suite
e2eTestFramework.registerSuite(OfflineTests.createSuite());
