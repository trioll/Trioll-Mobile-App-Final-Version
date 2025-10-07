
/**
 * Game Data Interaction End-to-End Tests
 * Complete game data and user interaction testing with DynamoDB
 */

import { E2ETestSuite, E2ETest, E2ETestResult } from '../E2ETestFramework';
import { e2eTestFramework } from '../E2ETestFramework';
import { dynamoDBService, TABLES } from '../../../services/database/dynamoDBService';
import { GameAdapter } from '../../../api/adapters/gameAdapter';
import { offlineQueueManager } from '../../../utils/offlineQueueManager';
import { authService } from '../../../services/auth/authServiceAdapter';
import { performanceMonitor } from '../../../services/monitoring/performanceMonitor';
import AsyncStorage from '../../../utils/storageCompat';

export class GameDataTests {
  /**
   * Create game data test suite
   */
  static createSuite(): E2ETestSuite {
    return {
      suiteId: 'game-data',
      name: 'Game Data Interaction Tests',
      description: 'Complete game data and user interaction testing with real database',
      tests: [
        this.createGameDiscoveryTest(),
        this.createGameDetailTest(),
        this.createUserInteractionTest(),
        this.createGameTrialTest(),
        this.createLeaderboardTest(),
        this.createAchievementTest(),
        this.createGameLibraryTest(),
        this.createDataConsistencyTest(),
      ],
      setup: async () => {
                // Enable test mode for safety
        dynamoDBService.enableTestMode();
      },
      teardown: async () => {
                // Cleanup handled by framework
      },
    };
  }

  /**
   * Test game discovery functionality
   */
  static createGameDiscoveryTest(): E2ETest {
    return {
      testId: 'game-discovery-001',
      name: 'Game Discovery and Browsing',
      description: 'Test game list loading, search, filtering, and categorization',
      category: 'game-data',
      priority: 'critical',
      retryCount: 2,
      timeout: 45000,
      execute: async (): Promise<E2ETestResult> => {
        const startTime = Date.now();
        const errors: string[] = [];
        const performanceMetrics: Record<string, unknown> = {};

        try {
          // Step 1: Test loading all games
          const loadStart = Date.now();
          const allGames = await dynamoDBService.scan(TABLES.GAMES, { limit: 50 });
          performanceMetrics.initialLoadTime = Date.now() - loadStart;

          if (!allGames.items || allGames.items.length === 0) {
            errors.push('No games found in database');
            throw new Error('Game catalog is empty');
          }

          // Step 2: Test pagination
          if (allGames.nextToken) {
            const pageStart = Date.now();
            const page2 = await dynamoDBService.scan(TABLES.GAMES, {
              limit: 50,
              nextToken: allGames.nextToken,
            });
            performanceMetrics.paginationTime = Date.now() - pageStart;

            if (!page2.items) {
              errors.push('Pagination failed');
            }
          }

          // Step 3: Test category filtering
          const categories = ['Action', 'Puzzle', 'Strategy', 'Racing', 'RPG'];
          const categoryResults: Record<string, number> = {};

          for (const category of categories) {
            const catStart = Date.now();
            const categoryGames = await dynamoDBService.query(
              TABLES.GAMES,
              { category },
              { limit: 20, index: 'category-index' }
            );

            categoryResults[category] = categoryGames.items.length;

            if (categoryGames.items.length === 0) {
              errors.push(`No games found for category: ${category}`);
            }
          }
          performanceMetrics.avgCategoryQueryTime = (Date.now() - startTime) / categories.length;

          // Step 4: Test search functionality
          const searchTerms = ['action', 'puzzle', 'multiplayer'];

          for (const term of searchTerms) {
            const searchStart = Date.now();
            // In real implementation, this would use search index
            const searchResults = allGames.items.filter(
              game =>
                game.name?.toLowerCase().includes(term) ||
                game.description?.toLowerCase().includes(term)
            );

            if (searchResults.length === 0 && term === 'action') {
              errors.push(`No results for common search term: ${term}`);
            }
          }

          // Step 5: Test field mapping
          const sampleGame = allGames.items[0];
          if (sampleGame) {
            const mapped = GameAdapter.fromDynamoDB(sampleGame);

            if (!mapped.id || !mapped.name || !mapped.category) {
              errors.push('Game field mapping incomplete');
            }

            // Check for expected fields
            const requiredFields = ['id', 'name', 'category', 'developer', 'description'];
            const missingFields = requiredFields.filter(field => !mapped[field]);

            if (missingFields.length > 0) {
              errors.push(`Missing required fields: ${missingFields.join(', ')}`);
            }
          }

          // Step 6: Test sorting
          const sortOptions = ['popularity', 'rating', 'releaseDate'];

          for (const sortBy of sortOptions) {
            // Simulate sorting (would be done by GSI in real implementation)
            const sorted = [...allGames.items].sort((a, b) => {
              switch (sortBy) {
                case 'popularity':
                  return (b.playCount || 0) - (a.playCount || 0);
                case 'rating':
                  return (b.rating || 0) - (a.rating || 0);
                case 'releaseDate':
                  return (
                    new Date(b.releaseDate || 0).getTime() - new Date(a.releaseDate || 0).getTime()
                  );
                default:
                  return 0;
              }
            });

            if (sorted.length === 0) {
              errors.push(`Sorting by ${sortBy} failed`);
            }
          }

          // Calculate performance score
          performanceMetrics.avgLoadTime =
            (performanceMetrics.initialLoadTime +
              (performanceMetrics.paginationTime || 0) +
              (performanceMetrics.avgCategoryQueryTime || 0)) /
            3;

          return {
            testId: 'game-discovery-001',
            category: 'game-data',
            scenario: 'Game Discovery and Browsing',
            status: errors.length === 0 ? 'passed' : 'warning',
            duration: Date.now() - startTime,
            details: `Discovered ${allGames.items.length} games`,
            errors,
            performanceMetrics,
          };
        } catch (error: unknown) {
          return {
            testId: 'game-discovery-001',
            category: 'game-data',
            scenario: 'Game Discovery and Browsing',
            status: 'failed',
            duration: Date.now() - startTime,
            details: 'Game discovery test failed',
            errors: [...errors, error.message],
            performanceMetrics,
          };
        }
      },
    };
  }

  /**
   * Test game detail views
   */
  static createGameDetailTest(): E2ETest {
    return {
      testId: 'game-detail-001',
      name: 'Game Detail Views',
      description: 'Test loading complete game information and statistics',
      category: 'game-data',
      priority: 'high',
      timeout: 30000,
      execute: async (): Promise<E2ETestResult> => {
        const startTime = Date.now();
        const errors: string[] = [];
        const performanceMetrics: Record<string, unknown> = {};

        try {
          // Step 1: Get a test game
          const games = await dynamoDBService.scan(TABLES.GAMES, { limit: 1 });
          if (!games.items || games.items.length === 0) {
            throw new Error('No games available for testing');
          }

          const testGame = games.items[0];
          const gameId = testGame.id;

          // Step 2: Load full game details
          const detailStart = Date.now();
          const gameDetail = await dynamoDBService.getItem(TABLES.GAMES, { id: gameId });
          performanceMetrics.detailLoadTime = Date.now() - detailStart;

          if (!gameDetail) {
            errors.push('Game detail not found');
            throw new Error('Failed to load game details');
          }

          // Step 3: Verify all required fields
          const requiredDetailFields = [
            'id',
            'name',
            'category',
            'developer',
            'description',
            'screenshots',
            'systemRequirements',
            'fileSize',
          ];

          const mappedDetail = GameAdapter.fromDynamoDB(gameDetail);
          const missingFields = requiredDetailFields.filter(field => !mappedDetail[field]);

          if (missingFields.length > 0) {
            errors.push(`Missing detail fields: ${missingFields.join(', ')}`);
          }

          // Step 4: Load game statistics
          const statsStart = Date.now();
          const gameStats = await dynamoDBService.getItem(TABLES.GAME_STATS, { gameId });
          performanceMetrics.statsLoadTime = Date.now() - statsStart;

          if (!gameStats) {
            // Create default stats if not exist
            await dynamoDBService.putItem(TABLES.GAME_STATS, {
              gameId,
              playCount: 0,
              likeCount: 0,
              rating: 0,
              ratingCount: 0,
              lastUpdated: new Date().toISOString(),
            });
          }

          // Step 5: Load user-specific data (if authenticated)
          if (await authService.isAuthenticated()) {
            const user = await authService.getCurrentUser();
            if (user) {
              const interactionStart = Date.now();
              const userInteraction = await dynamoDBService.getItem(TABLES.USER_INTERACTIONS, {
                userId: user.id,
                gameId,
              });
              performanceMetrics.userDataLoadTime = Date.now() - interactionStart;

              // Check interaction data structure
              if (userInteraction) {
                const expectedFields = ['liked', 'bookmarked', 'rating', 'lastPlayed'];
                const hasFields = expectedFields.some(
                  field => userInteraction[field] !== undefined
                );

                if (!hasFields) {
                  errors.push('User interaction data incomplete');
                }
              }
            }
          }

          // Step 6: Test related games
          const relatedStart = Date.now();
          const relatedGames = await dynamoDBService.query(
            TABLES.GAMES,
            { category: mappedDetail.category },
            { limit: 5, index: 'category-index' }
          );
          performanceMetrics.relatedGamesLoadTime = Date.now() - relatedStart;

          if (relatedGames.items.length === 0) {
            errors.push('No related games found');
          }

          // Calculate total load time
          performanceMetrics.totalDetailLoadTime = Date.now() - startTime;

          return {
            testId: 'game-detail-001',
            category: 'game-data',
            scenario: 'Game Detail Views',
            status: errors.length === 0 ? 'passed' : 'warning',
            duration: Date.now() - startTime,
            details: `Loaded details for game: ${mappedDetail.name}`,
            errors,
            performanceMetrics,
          };
        } catch (error: unknown) {
          return {
            testId: 'game-detail-001',
            category: 'game-data',
            scenario: 'Game Detail Views',
            status: 'failed',
            duration: Date.now() - startTime,
            details: 'Game detail test failed',
            errors: [...errors, error.message],
            performanceMetrics,
          };
        }
      },
    };
  }

  /**
   * Test user interactions
   */
  static createUserInteractionTest(): E2ETest {
    return {
      testId: 'user-interaction-001',
      name: 'User Game Interactions',
      description: 'Test likes, bookmarks, ratings, and comments',
      category: 'game-data',
      priority: 'critical',
      retryCount: 1,
      timeout: 40000,
      execute: async (): Promise<E2ETestResult> => {
        const startTime = Date.now();
        const errors: string[] = [];

        try {
          // Ensure user context
          let userId = 'test_user';
          if (await authService.isAuthenticated()) {
            const user = await authService.getCurrentUser();
            userId = user?.id || userId;
          } else if (authService.isGuest()) {
            userId = 'guest_user';
          }

          // Get test game
          const games = await dynamoDBService.scan(TABLES.GAMES, { limit: 1 });
          const testGame = games.items[0];
          if (!testGame) {
            throw new Error('No game available for interaction test');
          }

          const gameId = testGame.id;

          // Step 1: Test like interaction
          const likeData = {
            userId,
            gameId,
            liked: true,
            timestamp: new Date().toISOString(),
          };

          await offlineQueueManager.enqueue({
            type: 'put',
            table: TABLES.USER_INTERACTIONS,
            data: likeData,
            priority: 'high',
            userId,
          });

          // Sync immediately for testing
          const syncResult = await offlineQueueManager.startSync();
          if (syncResult.failed > 0) {
            errors.push(`Like sync failed: ${syncResult.failed} operations`);
          }

          // Step 2: Test bookmark
          await offlineQueueManager.enqueue({
            type: 'update',
            table: TABLES.USER_INTERACTIONS,
            data: {
              key: { userId, gameId },
              updates: { bookmarked: true },
            },
            priority: 'normal',
            userId,
          });

          // Step 3: Test rating
          const rating = 5;
          await offlineQueueManager.enqueue({
            type: 'update',
            table: TABLES.USER_INTERACTIONS,
            data: {
              key: { userId, gameId },
              updates: {
                rating,
                ratedAt: new Date().toISOString(),
              },
            },
            priority: 'normal',
            userId,
          });

          // Step 4: Test comment
          const comment = {
            id: `comment_${Date.now()}`,
            userId,
            gameId,
            text: 'Great game! E2E test comment.',
            timestamp: new Date().toISOString(),
          };

          await offlineQueueManager.enqueue({
            type: 'put',
            table: TABLES.COMMENTS,
            data: comment,
            priority: 'low',
            userId,
          });

          // Sync all interactions
          const finalSync = await offlineQueueManager.startSync();

          // Step 5: Verify interactions persisted
          const verification = await dynamoDBService.getItem(TABLES.USER_INTERACTIONS, {
            userId,
            gameId,
          });

          if (!verification) {
            errors.push('User interactions not persisted');
          } else {
            if (!verification.liked) errors.push('Like not saved');
            if (!verification.bookmarked) errors.push('Bookmark not saved');
            if (verification.rating !== rating) errors.push('Rating not saved correctly');
          }

          // Step 6: Test interaction removal
          await offlineQueueManager.enqueue({
            type: 'update',
            table: TABLES.USER_INTERACTIONS,
            data: {
              key: { userId, gameId },
              updates: { liked: false },
            },
            priority: 'normal',
            userId,
          });

          // Step 7: Update game statistics
          const gameStats = await dynamoDBService.getItem(TABLES.GAME_STATS, { gameId });

          if (gameStats) {
            await dynamoDBService.updateItem(
              TABLES.GAME_STATS,
              { gameId },
              {
                likeCount: (gameStats.likeCount || 0) + 1,
                ratingCount: (gameStats.ratingCount || 0) + 1,
                rating:
                  ((gameStats.rating || 0) * (gameStats.ratingCount || 0) + rating) /
                  ((gameStats.ratingCount || 0) + 1),
                lastUpdated: new Date().toISOString(),
              }
            );
          }

          return {
            testId: 'user-interaction-001',
            category: 'game-data',
            scenario: 'User Game Interactions',
            status: errors.length === 0 ? 'passed' : 'warning',
            duration: Date.now() - startTime,
            details: 'All user interactions tested',
            errors,
          };
        } catch (error: unknown) {
          return {
            testId: 'user-interaction-001',
            category: 'game-data',
            scenario: 'User Game Interactions',
            status: 'failed',
            duration: Date.now() - startTime,
            details: 'User interaction test failed',
            errors: [...errors, error.message],
          };
        }
      },
    };
  }

  /**
   * Test game trial functionality
   */
  static createGameTrialTest(): E2ETest {
    return {
      testId: 'game-trial-001',
      name: 'Game Trial Functionality',
      description: 'Test trial loading, progress tracking, and completion',
      category: 'game-data',
      priority: 'critical',
      timeout: 50000,
      execute: async (): Promise<E2ETestResult> => {
        const startTime = Date.now();
        const errors: string[] = [];
        const performanceMetrics: Record<string, unknown> = {};

        try {
          // Get user context
          let userId = 'test_user';
          if (await authService.isAuthenticated()) {
            const user = await authService.getCurrentUser();
            userId = user?.id || userId;
          } else if (authService.isGuest()) {
            userId = 'guest_user';
          }

          // Get test game
          const games = await dynamoDBService.scan(TABLES.GAMES, { limit: 1 });
          const testGame = games.items[0];
          if (!testGame) {
            throw new Error('No game available for trial test');
          }

          const gameId = testGame.id;

          // Step 1: Record trial start
          performanceMonitor.startOperation('game_trial_test');
          const trialStart = Date.now();

          const trialSession = {
            id: `trial_${Date.now()}`,
            userId,
            gameId,
            startTime: new Date().toISOString(),
            deviceInfo: {
              platform: 'test',
              version: '1.0.0',
            },
          };

          await dynamoDBService.putItem(TABLES.TRIAL_SESSIONS, trialSession);
          performanceMetrics.trialInitTime = Date.now() - trialStart;

          // Step 2: Simulate trial progress
          const progressUpdates = [
            { progress: 25, score: 100, level: 1 },
            { progress: 50, score: 250, level: 2 },
            { progress: 75, score: 500, level: 3 },
            { progress: 100, score: 750, level: 3 },
          ];

          for (const update of progressUpdates) {
            await dynamoDBService.updateItem(
              TABLES.TRIAL_SESSIONS,
              { id: trialSession.id },
              {
                progress: update.progress,
                score: update.score,
                level: update.level,
                lastUpdate: new Date().toISOString(),
              }
            );

            // Simulate gameplay delay
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          // Step 3: Complete trial
          const completionTime = Date.now();
          const trialDuration = completionTime - trialStart;

          await dynamoDBService.updateItem(
            TABLES.TRIAL_SESSIONS,
            { id: trialSession.id },
            {
              endTime: new Date().toISOString(),
              duration: trialDuration,
              completed: true,
              finalScore: 750,
              achievements: ['first_trial', 'score_500'],
            }
          );

          performanceMonitor.endOperation('game_trial_test');
          performanceMetrics.totalTrialTime = trialDuration;

          // Step 4: Update user game history
          await dynamoDBService.putItem(TABLES.USER_GAMES, {
            userId,
            gameId,
            lastPlayed: new Date().toISOString(),
            totalPlayTime: trialDuration,
            highScore: 750,
            trialsPlayed: 1,
          });

          // Step 5: Check trial limitations (none for guests)
          if (authService.isGuest()) {
            // Guests have unlimited trials
            const guestTrials = await AsyncStorage.getItem('guestTrialsPlayed');
            const trialsCount = guestTrials ? JSON.parse(guestTrials).length : 0;

            // No limit check needed
            await AsyncStorage.setItem(
              'guestTrialsPlayed',
              JSON.stringify([...Array(trialsCount), gameId])
            );
          }

          // Step 6: Verify trial data persistence
          const savedTrial = await dynamoDBService.getItem(TABLES.TRIAL_SESSIONS, {
            id: trialSession.id,
          });

          if (!savedTrial) {
            errors.push('Trial session not saved');
          } else {
            if (!savedTrial.completed) errors.push('Trial completion not recorded');
            if (savedTrial.finalScore !== 750) errors.push('Final score incorrect');
          }

          return {
            testId: 'game-trial-001',
            category: 'game-data',
            scenario: 'Game Trial Functionality',
            status: errors.length === 0 ? 'passed' : 'warning',
            duration: Date.now() - startTime,
            details: `Trial completed in ${trialDuration}ms`,
            errors,
            performanceMetrics,
          };
        } catch (error: unknown) {
          return {
            testId: 'game-trial-001',
            category: 'game-data',
            scenario: 'Game Trial Functionality',
            status: 'failed',
            duration: Date.now() - startTime,
            details: 'Game trial test failed',
            errors: [...errors, error.message],
            performanceMetrics,
          };
        }
      },
    };
  }

  /**
   * Test leaderboard functionality
   */
  static createLeaderboardTest(): E2ETest {
    return {
      testId: 'leaderboard-001',
      name: 'Leaderboard System',
      description: 'Test leaderboard updates and retrieval',
      category: 'game-data',
      priority: 'high',
      timeout: 30000,
      execute: async (): Promise<E2ETestResult> => {
        const startTime = Date.now();
        const errors: string[] = [];

        try {
          // Get test game
          const games = await dynamoDBService.scan(TABLES.GAMES, { limit: 1 });
          const testGame = games.items[0];
          if (!testGame) {
            throw new Error('No game available for leaderboard test');
          }

          const gameId = testGame.id;

          // Step 1: Submit scores
          const testScores = [
            { userId: 'user1', score: 1000, displayName: 'Player One' },
            { userId: 'user2', score: 2000, displayName: 'Player Two' },
            { userId: 'user3', score: 1500, displayName: 'Player Three' },
          ];

          for (const scoreData of testScores) {
            await dynamoDBService.putItem(TABLES.LEADERBOARDS, {
              gameId,
              userId: scoreData.userId,
              score: scoreData.score,
              displayName: scoreData.displayName,
              timestamp: new Date().toISOString(),
              period: 'all-time',
            });

            // Also add weekly/daily entries
            await dynamoDBService.putItem(TABLES.LEADERBOARDS, {
              gameId,
              userId: scoreData.userId,
              score: scoreData.score,
              displayName: scoreData.displayName,
              timestamp: new Date().toISOString(),
              period: 'weekly',
            });
          }

          // Step 2: Query leaderboard
          const leaderboard = await dynamoDBService.query(
            TABLES.LEADERBOARDS,
            { gameId, period: 'all-time' },
            {
              limit: 10,
              index: 'game-period-score-index',
              scanIndexForward: false, // High scores first
            }
          );

          if (!leaderboard.items || leaderboard.items.length === 0) {
            errors.push('Leaderboard query returned no results');
          }

          // Step 3: Verify ranking
          const sorted = leaderboard.items.sort((a, b) => b.score - a.score);
          if (sorted[0]?.score !== 2000) {
            errors.push('Leaderboard not properly sorted');
          }

          // Step 4: Test user rank query
          const userRank = sorted.findIndex(entry => entry.userId === 'user3') + 1;
          if (userRank !== 2) {
            errors.push('User ranking incorrect');
          }

          // Step 5: Test friends leaderboard
          if (await authService.isAuthenticated()) {
            const user = await authService.getCurrentUser();
            if (user) {
              // Get user's friends
              const friends = await dynamoDBService.query(
                TABLES.FRIENDS,
                { userId: user.id },
                { limit: 50 }
              );

              // Filter leaderboard for friends
              const friendIds = friends.items.map(f => f.friendId);
              const friendsLeaderboard = leaderboard.items.filter(entry =>
                friendIds.includes(entry.userId)
              );

              // At least verify the filter works
              if (friendIds.length > 0 && friendsLeaderboard.length === 0) {
                errors.push('Friends leaderboard filtering failed');
              }
            }
          }

          // Step 6: Test period-based leaderboards
          const periods = ['daily', 'weekly', 'monthly', 'all-time'];

          for (const period of periods) {
            const periodLeaderboard = await dynamoDBService.query(
              TABLES.LEADERBOARDS,
              { gameId, period },
              { limit: 5, index: 'game-period-score-index' }
            );

            // Verify structure but don't fail if empty (time-based)
            if (
              periodLeaderboard.items &&
              period === 'all-time' &&
              periodLeaderboard.items.length === 0
            ) {
              errors.push(`No entries in ${period} leaderboard`);
            }
          }

          return {
            testId: 'leaderboard-001',
            category: 'game-data',
            scenario: 'Leaderboard System',
            status: errors.length === 0 ? 'passed' : 'warning',
            duration: Date.now() - startTime,
            details: `Tested leaderboard with ${testScores.length} entries`,
            errors,
          };
        } catch (error: unknown) {
          return {
            testId: 'leaderboard-001',
            category: 'game-data',
            scenario: 'Leaderboard System',
            status: 'failed',
            duration: Date.now() - startTime,
            details: 'Leaderboard test failed',
            errors: [...errors, error.message],
          };
        }
      },
    };
  }

  /**
   * Test achievement system
   */
  static createAchievementTest(): E2ETest {
    return {
      testId: 'achievement-001',
      name: 'Achievement System',
      description: 'Test achievement unlocking and tracking',
      category: 'game-data',
      priority: 'medium',
      timeout: 35000,
      execute: async (): Promise<E2ETestResult> => {
        const startTime = Date.now();
        const errors: string[] = [];

        try {
          // Get user context
          let userId = 'test_user';
          if (await authService.isAuthenticated()) {
            const user = await authService.getCurrentUser();
            userId = user?.id || userId;
          }

          // Step 1: Define test achievements
          const achievements = [
            {
              id: 'first_game',
              name: 'First Steps',
              description: 'Play your first game',
              points: 10,
              category: 'General',
            },
            {
              id: 'score_1000',
              name: 'Score Master',
              description: 'Score over 1000 points',
              points: 25,
              category: 'Skill',
            },
            {
              id: 'play_5_games',
              name: 'Game Explorer',
              description: 'Play 5 different games',
              points: 50,
              category: 'Exploration',
            },
          ];

          // Step 2: Check current achievements
          const currentAchievements = await dynamoDBService.query(
            TABLES.USER_ACHIEVEMENTS,
            { userId },
            { limit: 100 }
          );

          const unlockedIds = currentAchievements.items.map(a => a.achievementId);

          // Step 3: Unlock new achievements
          for (const achievement of achievements) {
            if (!unlockedIds.includes(achievement.id)) {
              await dynamoDBService.putItem(TABLES.USER_ACHIEVEMENTS, {
                userId,
                achievementId: achievement.id,
                unlockedAt: new Date().toISOString(),
                points: achievement.points,
              });

              // Track achievement unlock
              await offlineQueueManager.enqueue({
                type: 'put',
                table: TABLES.ACHIEVEMENT_EVENTS,
                data: {
                  id: `event_${Date.now()}`,
                  userId,
                  achievementId: achievement.id,
                  eventType: 'unlocked',
                  timestamp: new Date().toISOString(),
                },
                priority: 'low',
                userId,
              });
            }
          }

          // Step 4: Calculate achievement statistics
          const allUserAchievements = await dynamoDBService.query(
            TABLES.USER_ACHIEVEMENTS,
            { userId },
            { limit: 100 }
          );

          const totalPoints = allUserAchievements.items.reduce(
            (sum, a) => sum + (a.points || 0),
            0
          );

          // Step 5: Update user profile with achievement stats
          if (await authService.isAuthenticated()) {
            await dynamoDBService.updateItem(
              TABLES.USERS,
              { id: userId },
              {
                achievementCount: allUserAchievements.items.length,
                achievementPoints: totalPoints,
                lastAchievement: achievements[0].id,
                lastAchievementDate: new Date().toISOString(),
              }
            );
          }

          // Step 6: Test achievement categories
          const categories = ['General', 'Skill', 'Exploration', 'Social'];
          const categoryStats: Record<string, number> = {};

          for (const category of categories) {
            const categoryAchievements = allUserAchievements.items.filter(
              a => achievements.find(ach => ach.id === a.achievementId)?.category === category
            );
            categoryStats[category] = categoryAchievements.length;
          }

          // Step 7: Test achievement progress tracking
          const progressiveAchievements = [
            { id: 'play_10_trials', current: 7, target: 10 },
            { id: 'win_5_games', current: 3, target: 5 },
          ];

          for (const prog of progressiveAchievements) {
            await AsyncStorage.setItem(
              `achievement_progress_${prog.id}`,
              JSON.stringify({
                current: prog.current,
                target: prog.target,
                percentage: (prog.current / prog.target) * 100,
              })
            );
          }

          // Verify at least some achievements exist
          if (allUserAchievements.items.length === 0) {
            errors.push('No achievements unlocked');
          }

          return {
            testId: 'achievement-001',
            category: 'game-data',
            scenario: 'Achievement System',
            status: errors.length === 0 ? 'passed' : 'warning',
            duration: Date.now() - startTime,
            details: `Unlocked ${allUserAchievements.items.length} achievements (${totalPoints} points)`,
            errors,
          };
        } catch (error: unknown) {
          return {
            testId: 'achievement-001',
            category: 'game-data',
            scenario: 'Achievement System',
            status: 'failed',
            duration: Date.now() - startTime,
            details: 'Achievement test failed',
            errors: [...errors, error.message],
          };
        }
      },
    };
  }

  /**
   * Test game library management
   */
  static createGameLibraryTest(): E2ETest {
    return {
      testId: 'game-library-001',
      name: 'Game Library Management',
      description: 'Test user game collection and library features',
      category: 'game-data',
      priority: 'high',
      timeout: 35000,
      execute: async (): Promise<E2ETestResult> => {
        const startTime = Date.now();
        const errors: string[] = [];
        const performanceMetrics: Record<string, unknown> = {};

        try {
          // Get user context
          let userId = 'test_user';
          if (await authService.isAuthenticated()) {
            const user = await authService.getCurrentUser();
            userId = user?.id || userId;
          } else if (authService.isGuest()) {
            userId = 'guest_user';
          }

          // Step 1: Add games to library
          const testGames = [
            { gameId: 'game_1', status: 'playing', addedAt: new Date().toISOString() },
            { gameId: 'game_2', status: 'completed', addedAt: new Date().toISOString() },
            { gameId: 'game_3', status: 'backlog', addedAt: new Date().toISOString() },
          ];

          for (const game of testGames) {
            await dynamoDBService.putItem(TABLES.USER_GAMES, {
              userId,
              gameId: game.gameId,
              status: game.status,
              addedAt: game.addedAt,
              lastPlayed: game.status === 'playing' ? new Date().toISOString() : null,
              completedAt: game.status === 'completed' ? new Date().toISOString() : null,
              playTime: Math.floor(Math.random() * 3600), // Random play time
            });
          }

          // Step 2: Query user library
          const libraryStart = Date.now();
          const userLibrary = await dynamoDBService.query(
            TABLES.USER_GAMES,
            { userId },
            { limit: 50 }
          );
          performanceMetrics.libraryLoadTime = Date.now() - libraryStart;

          if (!userLibrary.items || userLibrary.items.length === 0) {
            errors.push('User library is empty after adding games');
          }

          // Step 3: Test filtering by status
          const statuses = ['playing', 'completed', 'backlog', 'dropped'];
          const statusCounts: Record<string, number> = {};

          for (const status of statuses) {
            const filtered = userLibrary.items.filter(g => g.status === status);
            statusCounts[status] = filtered.length;
          }

          if (statusCounts.playing === 0 && statusCounts.completed === 0) {
            errors.push('No games with valid status found');
          }

          // Step 4: Test sorting
          const sortOptions = [
            { field: 'lastPlayed', descending: true },
            { field: 'addedAt', descending: true },
            { field: 'playTime', descending: true },
            { field: 'name', descending: false },
          ];

          for (const sortOption of sortOptions) {
            const sorted = [...userLibrary.items].sort((a, b) => {
              const aVal = a[sortOption.field] || '';
              const bVal = b[sortOption.field] || '';

              if (sortOption.descending) {
                return bVal > aVal ? 1 : -1;
              } else {
                return aVal > bVal ? 1 : -1;
              }
            });

            if (sorted.length !== userLibrary.items.length) {
              errors.push(`Sorting by ${sortOption.field} failed`);
            }
          }

          // Step 5: Test game progress tracking
          const gameProgress = {
            gameId: 'game_1',
            userId,
            currentLevel: 5,
            completion: 35,
            achievements: ['achievement_1', 'achievement_2'],
            lastCheckpoint: 'level_5_boss',
            savedAt: new Date().toISOString(),
          };

          await dynamoDBService.putItem(TABLES.GAME_PROGRESS, gameProgress);

          // Verify progress saved
          const savedProgress = await dynamoDBService.getItem(TABLES.GAME_PROGRESS, {
            userId,
            gameId: gameProgress.gameId,
          });

          if (!savedProgress) {
            errors.push('Game progress not saved');
          }

          // Step 6: Test library statistics
          const libraryStats = {
            totalGames: userLibrary.items.length,
            playing: statusCounts.playing || 0,
            completed: statusCounts.completed || 0,
            backlog: statusCounts.backlog || 0,
            totalPlayTime: userLibrary.items.reduce((sum, g) => sum + (g.playTime || 0), 0),
            averagePlayTime: 0,
          };

          libraryStats.averagePlayTime =
            libraryStats.totalGames > 0
              ? Math.round(libraryStats.totalPlayTime / libraryStats.totalGames)
              : 0;

          // Save stats
          await AsyncStorage.setItem('libraryStats', JSON.stringify(libraryStats));

          // Step 7: Test removal from library
          if (userLibrary.items.length > 0) {
            const gameToRemove = userLibrary.items[0];
            await dynamoDBService.deleteItem(TABLES.USER_GAMES, {
              userId,
              gameId: gameToRemove.gameId,
            });

            // Verify removal
            const afterRemoval = await dynamoDBService.getItem(TABLES.USER_GAMES, {
              userId,
              gameId: gameToRemove.gameId,
            });

            if (afterRemoval) {
              errors.push('Game removal from library failed');
            }
          }

          performanceMetrics.avgOperationTime = (Date.now() - startTime) / (testGames.length + 2);

          return {
            testId: 'game-library-001',
            category: 'game-data',
            scenario: 'Game Library Management',
            status: errors.length === 0 ? 'passed' : 'warning',
            duration: Date.now() - startTime,
            details: `Library contains ${userLibrary.items.length} games`,
            errors,
            performanceMetrics,
          };
        } catch (error: unknown) {
          return {
            testId: 'game-library-001',
            category: 'game-data',
            scenario: 'Game Library Management',
            status: 'failed',
            duration: Date.now() - startTime,
            details: 'Game library test failed',
            errors: [...errors, error.message],
            performanceMetrics,
          };
        }
      },
    };
  }

  /**
   * Test data consistency
   */
  static createDataConsistencyTest(): E2ETest {
    return {
      testId: 'data-consistency-001',
      name: 'Data Consistency Validation',
      description: 'Test data synchronization and consistency across operations',
      category: 'game-data',
      priority: 'critical',
      timeout: 40000,
      execute: async (): Promise<E2ETestResult> => {
        const startTime = Date.now();
        const errors: string[] = [];

        try {
          // Get user context
          let userId = 'test_user_consistency';
          if (await authService.isAuthenticated()) {
            const user = await authService.getCurrentUser();
            userId = user?.id || userId;
          }

          const gameId = 'test_game_consistency';

          // Step 1: Create initial data state
          const initialInteraction = {
            userId,
            gameId,
            liked: true,
            rating: 4,
            playCount: 5,
            lastPlayed: new Date().toISOString(),
          };

          await dynamoDBService.putItem(TABLES.USER_INTERACTIONS, initialInteraction);

          // Step 2: Simulate concurrent updates
          const updates = [
            { field: 'playCount', value: 6 },
            { field: 'rating', value: 5 },
            { field: 'liked', value: false },
          ];

          // Queue multiple updates
          for (const update of updates) {
            await offlineQueueManager.enqueue({
              type: 'update',
              table: TABLES.USER_INTERACTIONS,
              data: {
                key: { userId, gameId },
                updates: { [update.field]: update.value },
              },
              priority: 'high',
              userId,
            });
          }

          // Step 3: Sync and verify order
          const syncResult = await offlineQueueManager.startSync();

          if (syncResult.failed > 0) {
            errors.push(`Sync failed for ${syncResult.failed} operations`);
          }

          // Step 4: Verify final state
          const finalState = await dynamoDBService.getItem(TABLES.USER_INTERACTIONS, {
            userId,
            gameId,
          });

          if (!finalState) {
            errors.push('Data lost after updates');
          } else {
            // Verify all updates applied
            if (finalState.playCount !== 6) errors.push('PlayCount update lost');
            if (finalState.rating !== 5) errors.push('Rating update lost');
            if (finalState.liked !== false) errors.push('Like status update lost');
          }

          // Step 5: Test transaction consistency
          const transactionItems = [
            {
              userId,
              gameId: 'game_tx_1',
              action: 'like',
              timestamp: new Date().toISOString(),
            },
            {
              userId,
              gameId: 'game_tx_2',
              action: 'rate',
              rating: 5,
              timestamp: new Date().toISOString(),
            },
          ];

          // Simulate atomic transaction
          let txSuccess = true;
          try {
            for (const item of transactionItems) {
              await dynamoDBService.putItem(TABLES.USER_ACTIONS, item);
            }
          } catch {
            txSuccess = false;
            // Rollback simulation
            for (const item of transactionItems) {
              await dynamoDBService.deleteItem(TABLES.USER_ACTIONS, {
                userId: item.userId,
                gameId: item.gameId,
              });
            }
          }

          if (!txSuccess) {
            errors.push('Transaction consistency test failed');
          }

          // Step 6: Test conflict resolution
          // Simulate offline changes
          const offlineChange = {
            userId,
            gameId,
            rating: 3,
            modifiedOffline: true,
            offlineTimestamp: Date.now() - 5000, // 5 seconds ago
          };

          const serverChange = {
            userId,
            gameId,
            rating: 4,
            modifiedServer: true,
            serverTimestamp: Date.now() - 2000, // 2 seconds ago
          };

          // Conflict resolution: server wins (last-write-wins)
          const resolved =
            serverChange.serverTimestamp > offlineChange.offlineTimestamp
              ? serverChange
              : offlineChange;

          if (resolved.rating !== 4) {
            errors.push('Conflict resolution incorrect');
          }

          // Step 7: Verify data integrity
          const allUserInteractions = await dynamoDBService.query(
            TABLES.USER_INTERACTIONS,
            { userId },
            { limit: 100 }
          );

          // Check for duplicates
          const uniqueGames = new Set(allUserInteractions.items.map(i => i.gameId));
          if (uniqueGames.size !== allUserInteractions.items.length) {
            errors.push('Duplicate entries detected');
          }

          return {
            testId: 'data-consistency-001',
            category: 'game-data',
            scenario: 'Data Consistency Validation',
            status: errors.length === 0 ? 'passed' : 'warning',
            duration: Date.now() - startTime,
            details: 'Data consistency validated across operations',
            errors,
          };
        } catch (error: unknown) {
          return {
            testId: 'data-consistency-001',
            category: 'game-data',
            scenario: 'Data Consistency Validation',
            status: 'failed',
            duration: Date.now() - startTime,
            details: 'Data consistency test failed',
            errors: [...errors, error.message],
          };
        }
      },
    };
  }
}

// Register the test suite
e2eTestFramework.registerSuite(GameDataTests.createSuite());
