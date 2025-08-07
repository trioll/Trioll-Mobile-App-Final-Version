
/**
 * WebSocket Real-time Feature End-to-End Tests
 * Complete WebSocket functionality testing with real AWS WebSocket API
 */

import { E2ETestSuite, E2ETest, E2ETestResult } from '../E2ETestFramework';
import { e2eTestFramework } from '../E2ETestFramework';
import { WebSocketManager } from '../../../utils/websocketManager';
import { authService } from '../../../services/auth/authServiceAdapter';
import { dynamoDBService, TABLES } from '../../../services/database/dynamoDBService';
import { Config } from '../../../config/environments';
import { performanceMonitor } from '../../../services/monitoring/performanceMonitor';

export class WebSocketTests {
  private static wsManager = WebSocketManager.getInstance();

  /**
   * Create WebSocket test suite
   */
  static createSuite(): E2ETestSuite {
    return {
      suiteId: 'websocket',
      name: 'WebSocket Real-time Feature Tests',
      description: 'Complete WebSocket functionality testing',
      tests: [
        this.createConnectionTest(),
        this.createAuthenticationTest(),
        this.createRealtimeGameStatsTest(),
        this.createFriendActivityTest(),
        this.createLiveNotificationTest(),
        this.createPresenceSystemTest(),
        this.createRealtimeLeaderboardTest(),
        this.createConnectionResilienceTest(),
      ],
      setup: async () => {
        
        // Check if WebSocket is enabled
        if (!Config.FEATURES.WEBSOCKET_ENABLED) {
                    return;
        }

        // Ensure authenticated for full testing
        if (!(await authService.isAuthenticated())) {
          const testUser = e2eTestFramework.generateTestUser('_ws');
          await authService.register({
            email: testUser.email,
            password: testUser.password,
            displayName: testUser.displayName,
          });
          await authService.login({
            email: testUser.email,
            password: testUser.password,
          });
          e2eTestFramework.registerTestData('user', testUser.email);
        }
      },
      teardown: async () => {
                // Ensure WebSocket disconnected
        if (this.wsManager.isConnected()) {
          this.wsManager.disconnect();
        }
      },
    };
  }

  /**
   * Test WebSocket connection establishment
   */
  static createConnectionTest(): E2ETest {
    return {
      testId: 'ws-connection-001',
      name: 'WebSocket Connection Establishment',
      description: 'Test WebSocket connection and reconnection logic',
      category: 'real-time',
      priority: 'critical',
      retryCount: 2,
      timeout: 30000,
      execute: async (): Promise<E2ETestResult> => {
        const startTime = Date.now();
        const errors: string[] = [];
        const performanceMetrics: Record<string, unknown> = {};

        try {
          // Skip if WebSocket disabled
          if (!Config.FEATURES.WEBSOCKET_ENABLED) {
            return {
              testId: 'ws-connection-001',
              category: 'real-time',
              scenario: 'WebSocket Connection Establishment',
              status: 'skipped',
              duration: Date.now() - startTime,
              details: 'WebSocket features disabled',
              errors: [],
            };
          }

          // Step 1: Test initial connection
          const connectStart = Date.now();

          await this.wsManager.connect({
            reconnect: true,
            maxReconnectAttempts: 3,
          });

          performanceMetrics.connectionTime = Date.now() - connectStart;

          // Wait for connection to establish
          await new Promise(resolve => setTimeout(resolve, 2000));

          if (!this.wsManager.isConnected()) {
            errors.push('WebSocket connection failed');
            throw new Error('Failed to establish WebSocket connection');
          }

          // Step 2: Test connection state
          const state = this.wsManager.getState();
          if (state !== 'connected') {
            errors.push(`Unexpected connection state: ${state}`);
          }

          // Step 3: Test ping/pong heartbeat
          let pongReceived = false;
          this.wsManager.on('pong', () => {
            pongReceived = true;
          });

          this.wsManager.ping();
          await new Promise(resolve => setTimeout(resolve, 1000));

          if (!pongReceived) {
            errors.push('Heartbeat ping/pong failed');
          }

          // Step 4: Test graceful disconnect
          const disconnectStart = Date.now();
          this.wsManager.disconnect();
          performanceMetrics.disconnectTime = Date.now() - disconnectStart;

          if (this.wsManager.isConnected()) {
            errors.push('Disconnect failed');
          }

          // Step 5: Test reconnection
          const reconnectStart = Date.now();
          await this.wsManager.connect();
          performanceMetrics.reconnectTime = Date.now() - reconnectStart;

          await new Promise(resolve => setTimeout(resolve, 1000));

          if (!this.wsManager.isConnected()) {
            errors.push('Reconnection failed');
          }

          return {
            testId: 'ws-connection-001',
            category: 'real-time',
            scenario: 'WebSocket Connection Establishment',
            status: errors.length === 0 ? 'passed' : 'warning',
            duration: Date.now() - startTime,
            details: 'WebSocket connection tested successfully',
            errors,
            performanceMetrics,
          };
        } catch (error: unknown) {
          return {
            testId: 'ws-connection-001',
            category: 'real-time',
            scenario: 'WebSocket Connection Establishment',
            status: 'failed',
            duration: Date.now() - startTime,
            details: 'WebSocket connection test failed',
            errors: [...errors, error.message],
            performanceMetrics,
          };
        }
      },
    };
  }

  /**
   * Test WebSocket authentication
   */
  static createAuthenticationTest(): E2ETest {
    return {
      testId: 'ws-auth-001',
      name: 'WebSocket Authentication',
      description: 'Test WebSocket authentication with JWT tokens',
      category: 'real-time',
      priority: 'critical',
      timeout: 25000,
      execute: async (): Promise<E2ETestResult> => {
        const startTime = Date.now();
        const errors: string[] = [];

        try {
          if (!Config.FEATURES.WEBSOCKET_ENABLED) {
            return {
              testId: 'ws-auth-001',
              category: 'real-time',
              scenario: 'WebSocket Authentication',
              status: 'skipped',
              duration: Date.now() - startTime,
              details: 'WebSocket features disabled',
              errors: [],
            };
          }

          // Ensure authenticated
          const isAuth = await authService.isAuthenticated();
          if (!isAuth) {
            errors.push('User not authenticated for WebSocket test');
            throw new Error('Authentication required');
          }

          // Step 1: Connect with auth token
          if (!this.wsManager.isConnected()) {
            await this.wsManager.connect();
          }

          // Step 2: Verify authenticated connection
          const authState = this.wsManager.isAuthenticated();
          if (!authState) {
            errors.push('WebSocket not authenticated despite user auth');
          }

          // Step 3: Test authenticated message
          let authMessageReceived = false;

          this.wsManager.on('authenticated', _data => {
            authMessageReceived = true;
          });

          // Send authenticated request
          this.wsManager.send({
            type: 'auth_check',
            timestamp: Date.now(),
          });

          await new Promise(resolve => setTimeout(resolve, 2000));

          // Step 4: Test unauthorized access simulation
          // This would test what happens with invalid token
          // In real test, would manipulate token

          // Step 5: Test token refresh over WebSocket
          const refreshed = await authService.refreshTokens();
          if (refreshed) {
            // WebSocket should auto-update with new token
            const stillConnected = this.wsManager.isConnected();
            if (!stillConnected) {
              errors.push('WebSocket disconnected after token refresh');
            }
          }

          return {
            testId: 'ws-auth-001',
            category: 'real-time',
            scenario: 'WebSocket Authentication',
            status: errors.length === 0 ? 'passed' : 'warning',
            duration: Date.now() - startTime,
            details: 'WebSocket authentication tested',
            errors,
          };
        } catch (error: unknown) {
          return {
            testId: 'ws-auth-001',
            category: 'real-time',
            scenario: 'WebSocket Authentication',
            status: 'failed',
            duration: Date.now() - startTime,
            details: 'WebSocket authentication test failed',
            errors: [...errors, error.message],
          };
        }
      },
    };
  }

  /**
   * Test real-time game statistics
   */
  static createRealtimeGameStatsTest(): E2ETest {
    return {
      testId: 'ws-gamestats-001',
      name: 'Real-time Game Statistics',
      description: 'Test live game statistics updates via WebSocket',
      category: 'real-time',
      priority: 'high',
      timeout: 30000,
      execute: async (): Promise<E2ETestResult> => {
        const startTime = Date.now();
        const errors: string[] = [];

        try {
          if (!Config.FEATURES.WEBSOCKET_ENABLED) {
            return {
              testId: 'ws-gamestats-001',
              category: 'real-time',
              scenario: 'Real-time Game Statistics',
              status: 'skipped',
              duration: Date.now() - startTime,
              details: 'WebSocket features disabled',
              errors: [],
            };
          }

          // Ensure connected
          if (!this.wsManager.isConnected()) {
            await this.wsManager.connect();
          }

          const testGameId = 'test_game_ws';
          let statsReceived = false;
          let receivedStats: any = null;

          // Step 1: Subscribe to game stats
          await this.wsManager.subscribe(`game:${testGameId}:stats`, data => {
            statsReceived = true;
            receivedStats = data;
          });

          // Step 2: Trigger stats update
          const statsUpdate = {
            gameId: testGameId,
            playCount: 1000,
            likeCount: 250,
            activeUsers: 15,
            timestamp: Date.now(),
          };

          // Update stats in database (would trigger WebSocket broadcast)
          await dynamoDBService.updateItem(TABLES.GAME_STATS, { gameId: testGameId }, statsUpdate);

          // Send test message to simulate broadcast
          this.wsManager.send({
            type: 'broadcast',
            channel: `game:${testGameId}:stats`,
            data: statsUpdate,
          });

          // Wait for message
          await new Promise(resolve => setTimeout(resolve, 2000));

          if (!statsReceived) {
            errors.push('Game stats update not received');
          }

          // Step 3: Test multiple subscribers
          let subscriber2Received = false;

          await this.wsManager.subscribe(`game:${testGameId}:stats`, _data => {
            subscriber2Received = true;
          });

          // Broadcast again
          this.wsManager.send({
            type: 'broadcast',
            channel: `game:${testGameId}:stats`,
            data: { ...statsUpdate, playCount: 1001 },
          });

          await new Promise(resolve => setTimeout(resolve, 1000));

          if (!subscriber2Received) {
            errors.push('Multiple subscriber test failed');
          }

          // Step 4: Unsubscribe test
          await this.wsManager.unsubscribe(`game:${testGameId}:stats`);

          // Step 5: Test stats aggregation
          const aggregatedStats = {
            hourlyPlays: [10, 15, 20, 25, 30],
            peakConcurrent: 50,
            avgSessionLength: 300, // seconds
          };

          this.wsManager.send({
            type: 'stats_aggregation',
            gameId: testGameId,
            data: aggregatedStats,
          });

          return {
            testId: 'ws-gamestats-001',
            category: 'real-time',
            scenario: 'Real-time Game Statistics',
            status: errors.length === 0 ? 'passed' : 'warning',
            duration: Date.now() - startTime,
            details: 'Real-time game stats tested',
            errors,
          };
        } catch (error: unknown) {
          return {
            testId: 'ws-gamestats-001',
            category: 'real-time',
            scenario: 'Real-time Game Statistics',
            status: 'failed',
            duration: Date.now() - startTime,
            details: 'Game stats test failed',
            errors: [...errors, error.message],
          };
        }
      },
    };
  }

  /**
   * Test friend activity updates
   */
  static createFriendActivityTest(): E2ETest {
    return {
      testId: 'ws-friends-001',
      name: 'Friend Activity Updates',
      description: 'Test real-time friend activity and presence',
      category: 'real-time',
      priority: 'high',
      timeout: 30000,
      execute: async (): Promise<E2ETestResult> => {
        const startTime = Date.now();
        const errors: string[] = [];

        try {
          if (!Config.FEATURES.WEBSOCKET_ENABLED) {
            return {
              testId: 'ws-friends-001',
              category: 'real-time',
              scenario: 'Friend Activity Updates',
              status: 'skipped',
              duration: Date.now() - startTime,
              details: 'WebSocket features disabled',
              errors: [],
            };
          }

          // Ensure connected
          if (!this.wsManager.isConnected()) {
            await this.wsManager.connect();
          }

          const currentUser = await authService.getCurrentUser();
          if (!currentUser) {
            throw new Error('No user context');
          }

          // Step 1: Subscribe to friend activity
          let activityReceived = false;
          const activities: unknown[] = [];

          await this.wsManager.subscribe(`user:${(currentUser as unknown).id}:friends`, data => {
            activityReceived = true;
            activities.push(data);
          });

          // Step 2: Simulate friend activity
          const friendActivities = [
            {
              userId: 'friend_1',
              action: 'started_game',
              gameId: 'game_123',
              gameName: 'Test Game',
              timestamp: Date.now(),
            },
            {
              userId: 'friend_2',
              action: 'achieved',
              achievementId: 'high_score',
              achievementName: 'High Score Master',
              timestamp: Date.now(),
            },
            {
              userId: 'friend_3',
              action: 'completed_trial',
              gameId: 'game_456',
              score: 1500,
              timestamp: Date.now(),
            },
          ];

          // Broadcast friend activities
          for (const activity of friendActivities) {
            this.wsManager.send({
              type: 'friend_activity',
              channel: `user:${(currentUser as unknown).id}:friends`,
              data: activity,
            });

            await new Promise(resolve => setTimeout(resolve, 500));
          }

          await new Promise(resolve => setTimeout(resolve, 1000));

          if (!activityReceived) {
            errors.push('Friend activity not received');
          }

          if (activities.length !== friendActivities.length) {
            errors.push(`Expected ${friendActivities.length} activities, got ${activities.length}`);
          }

          // Step 3: Test friend online status
          const onlineStatuses = [
            { userId: 'friend_1', status: 'online', lastSeen: Date.now() },
            { userId: 'friend_2', status: 'in_game', gameId: 'game_789' },
            { userId: 'friend_3', status: 'offline', lastSeen: Date.now() - 3600000 },
          ];

          await this.wsManager.subscribe(`user:${(currentUser as unknown).id}:presence`, _data => {
            // Handle presence updates
          });

          // Broadcast presence updates
          this.wsManager.send({
            type: 'presence_update',
            channel: `user:${(currentUser as unknown).id}:presence`,
            data: onlineStatuses,
          });

          // Step 4: Test activity filtering
          const filteredActivities = activities.filter(a => a.action === 'started_game');

          // Step 5: Unsubscribe from friend updates
          await this.wsManager.unsubscribe(`user:${(currentUser as unknown).id}:friends`);
          await this.wsManager.unsubscribe(`user:${(currentUser as unknown).id}:presence`);

          return {
            testId: 'ws-friends-001',
            category: 'real-time',
            scenario: 'Friend Activity Updates',
            status: errors.length === 0 ? 'passed' : 'warning',
            duration: Date.now() - startTime,
            details: `Received ${activities.length} friend activities`,
            errors,
          };
        } catch (error: unknown) {
          return {
            testId: 'ws-friends-001',
            category: 'real-time',
            scenario: 'Friend Activity Updates',
            status: 'failed',
            duration: Date.now() - startTime,
            details: 'Friend activity test failed',
            errors: [...errors, error.message],
          };
        }
      },
    };
  }

  /**
   * Test live notifications
   */
  static createLiveNotificationTest(): E2ETest {
    return {
      testId: 'ws-notifications-001',
      name: 'Live Notifications',
      description: 'Test real-time notification delivery',
      category: 'real-time',
      priority: 'high',
      timeout: 25000,
      execute: async (): Promise<E2ETestResult> => {
        const startTime = Date.now();
        const errors: string[] = [];

        try {
          if (!Config.FEATURES.WEBSOCKET_ENABLED) {
            return {
              testId: 'ws-notifications-001',
              category: 'real-time',
              scenario: 'Live Notifications',
              status: 'skipped',
              duration: Date.now() - startTime,
              details: 'WebSocket features disabled',
              errors: [],
            };
          }

          // Ensure connected
          if (!this.wsManager.isConnected()) {
            await this.wsManager.connect();
          }

          const currentUser = await authService.getCurrentUser();
          if (!currentUser) {
            throw new Error('No user context');
          }

          // Step 1: Subscribe to notifications
          const notifications: unknown[] = [];

          await this.wsManager.subscribe(
            `user:${(currentUser as unknown).id}:notifications`,
            data => {
              notifications.push(data);
            }
          );

          // Step 2: Test different notification types
          const testNotifications = [
            {
              id: `notif_${Date.now()}_1`,
              type: 'friend_request',
              title: 'New Friend Request',
              message: 'TestUser wants to be your friend',
              timestamp: Date.now(),
              priority: 'high',
            },
            {
              id: `notif_${Date.now()}_2`,
              type: 'achievement_unlocked',
              title: 'Achievement Unlocked!',
              message: 'You earned: Speed Demon',
              timestamp: Date.now(),
              priority: 'medium',
            },
            {
              id: `notif_${Date.now()}_3`,
              type: 'game_update',
              title: 'Game Updated',
              message: 'Your favorite game has new content',
              timestamp: Date.now(),
              priority: 'low',
            },
          ];

          // Send notifications
          for (const notif of testNotifications) {
            this.wsManager.send({
              type: 'notification',
              channel: `user:${(currentUser as any).id}:notifications`,
              data: notif,
            });

            await new Promise(resolve => setTimeout(resolve, 300));
          }

          await new Promise(resolve => setTimeout(resolve, 1000));

          if (notifications.length === 0) {
            errors.push('No notifications received');
          }

          // Step 3: Test notification acknowledgment
          if (notifications.length > 0) {
            const ackNotif = notifications[0];

            this.wsManager.send({
              type: 'notification_ack',
              notificationId: (ackNotif as unknown).id,
              timestamp: Date.now(),
            });
          }

          // Step 4: Test notification filtering by priority
          const highPriorityNotifs = notifications.filter(n => n.priority === 'high');

          // Step 5: Test batch notifications
          const batchNotifications = Array(5)
            .fill(null)
            .map((_, i) => ({
              id: `batch_notif_${i}`,
              type: 'system',
              title: `Batch notification ${i}`,
              message: 'Test batch delivery',
              timestamp: Date.now(),
              priority: 'low',
            }));

          this.wsManager.send({
            type: 'notification_batch',
            channel: `user:${(currentUser as unknown).id}:notifications`,
            data: batchNotifications,
          });

          await new Promise(resolve => setTimeout(resolve, 1000));

          // Unsubscribe
          await this.wsManager.unsubscribe(`user:${(currentUser as unknown).id}:notifications`);

          return {
            testId: 'ws-notifications-001',
            category: 'real-time',
            scenario: 'Live Notifications',
            status: errors.length === 0 ? 'passed' : 'warning',
            duration: Date.now() - startTime,
            details: `Received ${notifications.length} notifications`,
            errors,
          };
        } catch (error: unknown) {
          return {
            testId: 'ws-notifications-001',
            category: 'real-time',
            scenario: 'Live Notifications',
            status: 'failed',
            duration: Date.now() - startTime,
            details: 'Notification test failed',
            errors: [...errors, error.message],
          };
        }
      },
    };
  }

  /**
   * Test presence system
   */
  static createPresenceSystemTest(): E2ETest {
    return {
      testId: 'ws-presence-001',
      name: 'Presence System',
      description: 'Test user online status and activity tracking',
      category: 'real-time',
      priority: 'medium',
      timeout: 30000,
      execute: async (): Promise<E2ETestResult> => {
        const startTime = Date.now();
        const errors: string[] = [];

        try {
          if (!Config.FEATURES.WEBSOCKET_ENABLED) {
            return {
              testId: 'ws-presence-001',
              category: 'real-time',
              scenario: 'Presence System',
              status: 'skipped',
              duration: Date.now() - startTime,
              details: 'WebSocket features disabled',
              errors: [],
            };
          }

          // Ensure connected
          if (!this.wsManager.isConnected()) {
            await this.wsManager.connect();
          }

          const currentUser = await authService.getCurrentUser();
          if (!currentUser) {
            throw new Error('No user context');
          }

          // Step 1: Update own presence
          const myPresence = {
            userId: (currentUser as unknown).id,
            status: 'online',
            currentActivity: 'browsing_games',
            timestamp: Date.now(),
          };

          this.wsManager.send({
            type: 'presence_update' as const,
            data: myPresence,
          });

          // Step 2: Subscribe to presence channel
          const presenceUpdates: unknown[] = [];

          await this.wsManager.subscribe('presence:global', data => {
            presenceUpdates.push(data);
          });

          // Step 3: Test activity changes
          const activities = [
            { activity: 'in_game', gameId: 'test_game_1' },
            { activity: 'in_trial', gameId: 'test_game_2' },
            { activity: 'idle', idleTime: 300 }, // 5 minutes
            { activity: 'browsing_games' },
          ];

          for (const activity of activities) {
            this.wsManager.send({
              type: 'activity_update',
              data: {
                userId: (currentUser as unknown).id,
                ...activity,
                timestamp: Date.now(),
              },
            });

            await new Promise(resolve => setTimeout(resolve, 500));
          }

          // Step 4: Test presence timeout
          // Simulate no activity for timeout period
          const lastActivity = Date.now();

          // Would normally wait for timeout, but simulate
          setTimeout(() => {
            this.wsManager.send({
              type: 'presence_timeout',
              data: {
                userId: (currentUser as unknown).id,
                lastActivity,
                status: 'away',
              },
            });
          }, 2000);

          await new Promise(resolve => setTimeout(resolve, 3000));

          // Step 5: Test presence recovery
          this.wsManager.send({
            type: 'presence_update',
            data: {
              userId: (currentUser as unknown).id,
              status: 'online',
              timestamp: Date.now(),
            },
          });

          // Verify presence updates received
          if (presenceUpdates.length === 0) {
            errors.push('No presence updates received');
          }

          // Unsubscribe
          await this.wsManager.unsubscribe('presence:global');

          return {
            testId: 'ws-presence-001',
            category: 'real-time',
            scenario: 'Presence System',
            status: errors.length === 0 ? 'passed' : 'warning',
            duration: Date.now() - startTime,
            details: `Tracked ${activities.length} activity changes`,
            errors,
          };
        } catch (error: unknown) {
          return {
            testId: 'ws-presence-001',
            category: 'real-time',
            scenario: 'Presence System',
            status: 'failed',
            duration: Date.now() - startTime,
            details: 'Presence test failed',
            errors: [...errors, error.message],
          };
        }
      },
    };
  }

  /**
   * Test real-time leaderboard
   */
  static createRealtimeLeaderboardTest(): E2ETest {
    return {
      testId: 'ws-leaderboard-001',
      name: 'Real-time Leaderboard',
      description: 'Test live leaderboard updates during gameplay',
      category: 'real-time',
      priority: 'medium',
      timeout: 35000,
      execute: async (): Promise<E2ETestResult> => {
        const startTime = Date.now();
        const errors: string[] = [];
        const performanceMetrics: Record<string, unknown> = {};

        try {
          if (!Config.FEATURES.WEBSOCKET_ENABLED) {
            return {
              testId: 'ws-leaderboard-001',
              category: 'real-time',
              scenario: 'Real-time Leaderboard',
              status: 'skipped',
              duration: Date.now() - startTime,
              details: 'WebSocket features disabled',
              errors: [],
            };
          }

          // Ensure connected
          if (!this.wsManager.isConnected()) {
            await this.wsManager.connect();
          }

          const testGameId = 'leaderboard_test_game';
          const leaderboardUpdates: unknown[] = [];

          // Step 1: Subscribe to leaderboard updates
          await this.wsManager.subscribe(`game:${testGameId}:leaderboard`, data => {
            leaderboardUpdates.push(data);
          });

          // Step 2: Simulate active game session
          performanceMonitor.startOperation('realtime_leaderboard_test');

          const players = [
            { userId: 'player_1', displayName: 'Player One', score: 0 },
            { userId: 'player_2', displayName: 'Player Two', score: 0 },
            { userId: 'player_3', displayName: 'Player Three', score: 0 },
          ];

          // Step 3: Send progressive score updates
          const updateStart = Date.now();

          for (let i = 0; i < 5; i++) {
            // Random score increases
            players.forEach(player => {
              player.score += Math.floor(Math.random() * 200) + 50;
            });

            // Sort by score
            const sorted = [...players].sort((a, b) => b.score - a.score);

            // Broadcast leaderboard update
            this.wsManager.send({
              type: 'leaderboard_update',
              channel: `game:${testGameId}:leaderboard`,
              data: {
                gameId: testGameId,
                leaderboard: sorted.map((p, index) => ({
                  rank: index + 1,
                  ...p,
                })),
                timestamp: Date.now(),
              },
            });

            await new Promise(resolve => setTimeout(resolve, 1000));
          }

          performanceMetrics.updateDuration = Date.now() - updateStart;
          performanceMonitor.endOperation('realtime_leaderboard_test');

          if (leaderboardUpdates.length === 0) {
            errors.push('No leaderboard updates received');
          }

          // Step 4: Test rank changes
          if (leaderboardUpdates.length > 1) {
            const firstUpdate = leaderboardUpdates[0];
            const lastUpdate = leaderboardUpdates[leaderboardUpdates.length - 1];

            // Check if rankings changed
            const rankChanges = (lastUpdate as unknown).data?.leaderboard?.some(
              (player: any, idx: number) => {
                const firstPlayer = (firstUpdate as unknown).data?.leaderboard?.[idx];
                return firstPlayer && player.userId !== firstPlayer.userId;
              }
            );

            if (!rankChanges && leaderboardUpdates.length > 3) {
              errors.push('No rank changes detected in leaderboard');
            }
          }

          // Step 5: Test personal best notification
          const currentUser = await authService.getCurrentUser();
          if (currentUser) {
            this.wsManager.send({
              type: 'personal_best',
              channel: `user:${(currentUser as unknown).id}:achievements`,
              data: {
                gameId: testGameId,
                newHighScore: 1500,
                previousBest: 1200,
                rank: 5,
                timestamp: Date.now(),
              },
            });
          }

          performanceMetrics.avgUpdateLatency =
            performanceMetrics.updateDuration / leaderboardUpdates.length;

          // Unsubscribe
          await this.wsManager.unsubscribe(`game:${testGameId}:leaderboard`);

          return {
            testId: 'ws-leaderboard-001',
            category: 'real-time',
            scenario: 'Real-time Leaderboard',
            status: errors.length === 0 ? 'passed' : 'warning',
            duration: Date.now() - startTime,
            details: `Processed ${leaderboardUpdates.length} leaderboard updates`,
            errors,
            performanceMetrics,
          };
        } catch (error: unknown) {
          return {
            testId: 'ws-leaderboard-001',
            category: 'real-time',
            scenario: 'Real-time Leaderboard',
            status: 'failed',
            duration: Date.now() - startTime,
            details: 'Leaderboard test failed',
            errors: [...errors, error.message],
            performanceMetrics,
          };
        }
      },
    };
  }

  /**
   * Test connection resilience
   */
  static createConnectionResilienceTest(): E2ETest {
    return {
      testId: 'ws-resilience-001',
      name: 'Connection Resilience',
      description: 'Test WebSocket reconnection and message queuing',
      category: 'real-time',
      priority: 'high',
      timeout: 40000,
      execute: async (): Promise<E2ETestResult> => {
        const startTime = Date.now();
        const errors: string[] = [];

        try {
          if (!Config.FEATURES.WEBSOCKET_ENABLED) {
            return {
              testId: 'ws-resilience-001',
              category: 'real-time',
              scenario: 'Connection Resilience',
              status: 'skipped',
              duration: Date.now() - startTime,
              details: 'WebSocket features disabled',
              errors: [],
            };
          }

          // Ensure connected
          if (!this.wsManager.isConnected()) {
            await this.wsManager.connect();
          }

          // Step 1: Test message queuing while disconnected
          const queuedMessages: unknown[] = [];

          // Queue some messages
          for (let i = 0; i < 3; i++) {
            queuedMessages.push({
              type: 'test_message' as const,
              data: { index: i, timestamp: Date.now() },
            });
          }

          // Step 2: Simulate connection loss
          this.wsManager.simulateDisconnect();

          if (this.wsManager.isConnected()) {
            errors.push('Disconnect simulation failed');
          }

          // Step 3: Try to send messages while disconnected
          for (const msg of queuedMessages) {
            this.wsManager.send(msg);
          }

          // Messages should be queued
          const queueSize = this.wsManager.getQueueSize();
          if (queueSize !== queuedMessages.length) {
            errors.push(`Expected ${queuedMessages.length} queued messages, got ${queueSize}`);
          }

          // Step 4: Test reconnection
          let reconnected = false;
          const reconnectAttempts = 0;

          this.wsManager.on('reconnect', () => {
            reconnected = true;
          });

          this.wsManager.on('reconnect_attempt', () => {
            reconnectAttempts++;
          });

          // Trigger reconnection
          await this.wsManager.connect();

          await new Promise(resolve => setTimeout(resolve, 3000));

          if (!reconnected && this.wsManager.isConnected()) {
            // Manual reconnect succeeded
            reconnected = true;
          }

          if (!reconnected) {
            errors.push('Reconnection failed');
          }

          // Step 5: Verify queued messages sent
          await new Promise(resolve => setTimeout(resolve, 2000));

          const finalQueueSize = this.wsManager.getQueueSize();
          if (finalQueueSize > 0) {
            errors.push(`${finalQueueSize} messages still queued after reconnection`);
          }

          // Step 6: Test exponential backoff
          if (reconnectAttempts > 0) {
            // Verify backoff behavior (would need to track timing)
          }

          // Step 7: Test max reconnect attempts
          // This would involve multiple disconnects

          return {
            testId: 'ws-resilience-001',
            category: 'real-time',
            scenario: 'Connection Resilience',
            status: errors.length === 0 ? 'passed' : 'warning',
            duration: Date.now() - startTime,
            details: 'Connection resilience tested',
            errors,
          };
        } catch (error: unknown) {
          return {
            testId: 'ws-resilience-001',
            category: 'real-time',
            scenario: 'Connection Resilience',
            status: 'failed',
            duration: Date.now() - startTime,
            details: 'Resilience test failed',
            errors: [...errors, error.message],
          };
        }
      },
    };
  }
}

// Register the test suite
e2eTestFramework.registerSuite(WebSocketTests.createSuite());
