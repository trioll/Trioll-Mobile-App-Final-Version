
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Pressable, Dimensions, ScrollView, Image, Modal, Alert, AppState, AppStateStatus, ActivityIndicator, StatusBar, PanResponder } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { GameControlOverlay } from '../components/game';

import { Text } from '../components/base/Text';
import { useApp } from '../context/AppContext';
import { useSpringAnimation, useHaptics } from '../hooks';
import { useGuestMode } from '../hooks/useGuestMode';
import { SPRING_CONFIG, DURATIONS } from '../constants/animations';
import { gamePresignedUrlService } from '../src/services/api/GamePresignedUrlService';
import { GlassContainer, GlassButton, GlassCard } from '../src/components/core';
import { DS } from '../src/styles/TriollDesignSystem';

import { isOfflineUrl, getOfflineGameContent } from '../src/utils/offlineGameAssets';
import { getLogger } from '../src/utils/logger';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { WebViewMessageEvent } from 'react-native-webview';
import { detectGameAspectRatio, generateGameScalingCSS, generateGameScalingJS, wrapHTMLWithScaling } from '../utils/html5GameScaling';
import { generateOrientationAwareCSS, generateOrientationJS, calculateGameDimensions } from '../utils/orientationGameScaling';

const logger = getLogger('TrialPlayerScreen');

type RootStackParamList = {
  Feed: undefined;
  GameDetail: { gameId: string };
  TrialPlayer: { gameId: string; onClose?: () => void };
  RegistrationMethod: undefined;
};

type TrialPlayerScreenNavigationProp = StackNavigationProp<RootStackParamList, 'TrialPlayer'>;
type TrialPlayerScreenRouteProp = RouteProp<RootStackParamList, 'TrialPlayer'>;

interface TrialPlayerScreenProps {
  route: TrialPlayerScreenRouteProp;
  navigation: TrialPlayerScreenNavigationProp;
}

// Loading tips
const LOADING_TIPS = [
  'Tip: Swipe left to see more games like this one',
  'Tip: Save games to your library for easy access',
  'Tip: Rate games to improve recommendations',
  'Tip: Follow developers to get updates on new releases',
  'Tip: Share your high scores with friends',
];

// Analytics events
const ANALYTICS_EVENTS = {
  TRIAL_START: 'trial_start',
  TRIAL_PAUSE: 'trial_pause',
  TRIAL_RESUME: 'trial_resume',
  TRIAL_COMPLETE: 'trial_complete',
  TRIAL_EXIT_EARLY: 'trial_exit_early',
  TRIAL_ERROR: 'trial_error',
  ACHIEVEMENT_UNLOCK: 'achievement_unlock',
  SCORE_UPDATE: 'score_update',
  LEVEL_COMPLETE: 'level_complete',
};

export const TrialPlayerScreen: React.FC<TrialPlayerScreenProps> = ({ route, navigation }) => {
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const isPortrait = screenHeight > screenWidth;
  const { gameId, onClose } = route.params;
  const { games, toggleLike, toggleBookmark, likes, bookmarks } = useApp();
  const game = games.find(g => g.id === gameId);
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const { isGuest, recordTrialPlay } = useGuestMode();
  
  // Get game scaling configuration
  const gameScalingConfig = useMemo(() => 
    game ? detectGameAspectRatio(game) : { nativeWidth: 1920, nativeHeight: 1080 },
    [game]
  );
  
  // Get orientation-aware configuration
  const orientationConfig = useMemo(() => 
    calculateGameDimensions(
      gameScalingConfig.nativeWidth,
      gameScalingConfig.nativeHeight,
      screenWidth,
      screenHeight
    ),
    [gameScalingConfig, screenWidth, screenHeight]
  );
  const trialStartTime = useRef(Date.now());
  const webViewRef = useRef<WebView>(null);
  const appState = useRef(AppState.currentState);
  const analyticsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentTip, setCurrentTip] = useState(0);
  const [loadingStage, setLoadingStage] = useState<'preparing' | 'loading' | 'ready'>('preparing');

  // Trial states
  const [timeRemaining, setTimeRemaining] = useState(
    game?.trialDuration ? game.trialDuration * 60 : 300
  );
  const [isPaused, setIsPaused] = useState(false);
  const [showPauseMenu, setShowPauseMenu] = useState(false);
  const [showHUD, setShowHUD] = useState(true);
  const [showPostTrial, setShowPostTrial] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showReportIssue, setShowReportIssue] = useState(false);
  const [showEndingWarning, setShowEndingWarning] = useState(false);

  // Game states
  const [currentScore, setCurrentScore] = useState(0);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [levelProgress, setLevelProgress] = useState(1);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [gameUrl, setGameUrl] = useState<string | null>(null);
  const [webViewKey, setWebViewKey] = useState(0);

  // Performance tracking
  const [trialStats, setTrialStats] = useState({
    score: 0,
    timePlayed: 0,
    levelsCompleted: 0,
    achievementsUnlocked: 0,
  });

  // Settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  
  // Control overlay state
  const [showControlOverlay, setShowControlOverlay] = useState(true);
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const recordingOpacity = useRef(new Animated.Value(1)).current;

  // Track previous URL to avoid duplicate logging
  const previousUrlRef = useRef<string | null>(null);
  
  // Memoize WebView source to prevent repeated calculations
  const webViewSource = useMemo(() => {
    if (!gameUrl && !game.trialUrl) return { uri: 'https://example.com' };
    
    const isOffline = gameUrl?.startsWith('file://') ||
      gameUrl?.includes('file:///android_asset') ||
      game.trialUrl?.startsWith('file://') ||
      isOfflineUrl(gameUrl || '');
    
    // ALWAYS prioritize CloudFront (trialUrl) over S3 (gameUrl)
    const finalUri = game.trialUrl || gameUrl || 'https://example.com';
    const urlType = game.trialUrl ? 'CloudFront' : (gameUrl ? 'S3' : 'Fallback');
    const isCloudFront = finalUri.includes('cloudfront.net');
    const isS3 = finalUri.includes('.s3.amazonaws.com');
    
    // Only log if the URL has actually changed
    if (finalUri !== previousUrlRef.current) {
      logger.debug('🌐 WebView source changed:', {
        gameId: game.id,
        gameTitle: game.title,
        isOffline,
        gameUrl,
        trialUrl: game.trialUrl,
        finalUri,
        urlType,
        isCloudFront,
        isS3,
        willLoadHtml: isOffline,
        actualUrl: isOffline ? 'OFFLINE HTML' : finalUri,
        previousUrl: previousUrlRef.current
      });
      previousUrlRef.current = finalUri;
    }
    
    return isOffline
      ? { html: wrapHTMLWithScaling(getOfflineGameContent(game.id), gameScalingConfig) }
      : { uri: finalUri };
  }, [game.id, game.title, game.trialUrl, gameUrl, gameScalingConfig, webViewKey]);

  // Animations
  const hudOpacity = useRef(new Animated.Value(1)).current;
  const loadingOpacity = useRef(new Animated.Value(1)).current;
  const pauseMenuOpacity = useRef(new Animated.Value(0)).current;
  const pauseMenuScale = useRef(new Animated.Value(0.9)).current;
  const warningOpacity = useRef(new Animated.Value(0)).current;
  const exitButtonScale = useSpringAnimation(1);
  const pauseButtonScale = useSpringAnimation(1);
  const timerPulse = useRef(new Animated.Value(1)).current;
  const hudAutoHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check if game exists
  if (!game) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="alert-circle" size={64} color="#FF6B6B" />
        <Text size="xl" weight="bold" color="#FFFFFF" style={{ marginTop: 16 }}>
          Game not found
        </Text>
        <Text variant="body" color="#FFFFFF60" style={{ marginTop: 8 }}>
          The game you're looking for doesn't exist.
        </Text>
        <TouchableOpacity
          style={{ marginTop: 24, padding: 12 }}
          onPress={() => {
            if (onClose) {
              onClose();
            } else if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Feed' as never);
            }
          }}
        >
          <Text variant="body" color="#6366f1">
            Back to Feed
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Initialize loading and game URL
  useEffect(() => {
    if (game) {
      // Debug: Log game object to see trialType
      logger.info('🎮 Game object in TrialPlayerScreen:', {
        id: game.id,
        title: game.title,
        trialType: game.trialType,
        trialUrl: game.trialUrl,
        gameUrl: game.gameUrl,
      });
      
      // Set the game URL from the game object - ALWAYS prioritize CloudFront (trialUrl)
      const finalUrl = game.trialUrl || game.gameUrl || '';
      const urlType = game.trialUrl ? 'CloudFront' : (game.gameUrl ? 'S3' : 'Fallback');
      logger.debug('🎮 Initial game URL setup:', {
        gameId: game.id,
        gameTitle: game.title,
        trialUrl: game.trialUrl,
        gameUrl: game.gameUrl,
        finalUrl: finalUrl || 'EMPTY - Will fallback to example.com!',
        urlType: urlType
      });
      setGameUrl(finalUrl);
      simulateLoading();
      trackAnalytics(ANALYTICS_EVENTS.TRIAL_START, { gameId: game.id });
    }
  }, [game]);

  // App state handling
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isPaused]);

  // Timer effect - DISABLED: No time limits
  useEffect(() => {
    // Timer functionality removed - games have no time limit
    // Keeping the structure for potential future use
    return () => {};
  }, [isPaused, timeRemaining, isLoading]);

  // Auto-hide HUD
  useEffect(() => {
    if (showHUD && !isPaused && !isLoading) {
      hudAutoHideTimer.current = setTimeout(() => {
        hideHUD();
      }, 5000);
    }

    return () => {
      if (hudAutoHideTimer.current) {
        hudAutoHideTimer.current && clearTimeout(hudAutoHideTimer.current);
      }
    };
  }, [showHUD, isPaused, isLoading]);

  // Tip carousel
  useEffect(() => {
    if (isLoading) {
      const tipInterval = setInterval(() => {
        setCurrentTip(prev => (prev + 1) % LOADING_TIPS.length);
      }, 3000);
      return () => clearInterval(tipInterval);
    }
  }, [isLoading]);

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
      if (!isPaused) {
        handlePauseToggle();
      }
    }
    appState.current = nextAppState;
  };

  const simulateLoading = async () => {
    try {
      // Preparing stage
      setLoadingStage('preparing');
      for (let i = 0; i <= 30; i += 2) {
        await new Promise(resolve => setTimeout(resolve, 50));
        setLoadingProgress(i);
      }

      // Loading assets stage - fetch presigned URL
      setLoadingStage('loading');

      // Get presigned URL for the game
      let url = game.trialUrl || 'https://example.com';

      // Check if URL is already offline
      if (isOfflineUrl(url)) {
        // Using offline URL for game
        setGameUrl(url);
      } else {
        // Always try to fetch presigned URL for all games
        try {
          // Fetching presigned URL for game
          // Determine the correct game ID for S3
          let s3GameId = game.id;
          if (game.id === 'evolution-runner-001' || game.title === 'Evolution Runner') {
            s3GameId = 'Evolution-Runner';
          }

          url = await gamePresignedUrlService.getPresignedUrl(s3GameId, 'index.html');
          // Got presigned URL successfully
          setGameUrl(url);
        } catch (error) {
          // Failed to get presigned URL, using fallback
          // Fall back to original URL or offline mode
          if (game.id === 'evolution-runner-001' || game.title === 'Evolution Runner') {
            setGameUrl('offline://evolution-runner');
          } else {
            // Use the original URL as fallback
            setGameUrl(game.trialUrl || game.gameUrl || url);
          }
        }
      }

      for (let i = 30; i <= 80; i += 3) {
        await new Promise(resolve => setTimeout(resolve, 60));
        setLoadingProgress(i);
      }

      // Almost ready stage
      setLoadingStage('ready');
      for (let i = 80; i <= 100; i += 4) {
        await new Promise(resolve => setTimeout(resolve, 40));
        setLoadingProgress(i);
      }

      // Fade out loading screen
      Animated.timing(loadingOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setIsLoading(false);
      });
    } catch (error) {
      // Error during loading
      handleGameError('Failed to load game');
    }
  };

  const showTimeWarning = () => {
    // Timer warning disabled - no time limits
    return;
  };

  const pulseTimer = () => {
    // Timer pulse disabled - no time limits
    return;
  };

  const hideHUD = () => {
    Animated.timing(hudOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowHUD(false);
    });
  };

  const showHUDTemporarily = () => {
    setShowHUD(true);
    Animated.timing(hudOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  // Timer formatting function - no longer needed after timer removal
  // TODO: Remove in Phase 2 cleanup
  /*const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);*/

  const handlePauseToggle = useCallback(async () => {
    await haptics.buttonPress();

    if (!isPaused) {
      setIsPaused(true);
      setShowPauseMenu(true);
      trackAnalytics(ANALYTICS_EVENTS.TRIAL_PAUSE);

      // Animate pause menu in
      Animated.parallel([
        Animated.timing(pauseMenuOpacity, {
          toValue: 1,
          duration: DURATIONS.FAST,
          useNativeDriver: true,
        }),
        Animated.spring(pauseMenuScale, {
          toValue: 1,
          ...SPRING_CONFIG.BOUNCY,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate pause menu out
      Animated.parallel([
        Animated.timing(pauseMenuOpacity, {
          toValue: 0,
          duration: DURATIONS.FAST,
          useNativeDriver: true,
        }),
        Animated.spring(pauseMenuScale, {
          toValue: 0.9,
          ...SPRING_CONFIG.TIGHT,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsPaused(false);
        setShowPauseMenu(false);
        trackAnalytics(ANALYTICS_EVENTS.TRIAL_RESUME);
      });
    }
  }, [isPaused, pauseMenuOpacity, pauseMenuScale, haptics]);

  const handleResume = useCallback(() => {
    handlePauseToggle();
  }, [handlePauseToggle]);

  const handleExit = useCallback(async () => {
    Alert.alert('Exit Trial?', 'Are you sure you want to exit? Your progress will be lost.', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Exit',
        style: 'destructive',
        onPress: async () => {
          await haptics.selection();
          trackAnalytics(ANALYTICS_EVENTS.TRIAL_EXIT_EARLY, {
            timeRemaining,
            score: currentScore,
          });

          // Record trial play for guests
          if (isGuest && game) {
            const duration = Math.floor((Date.now() - trialStartTime.current) / 1000);
            await recordTrialPlay(game.id, duration, false);
          }

          if (onClose) {
            onClose();
          } else if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            // Fallback to Feed screen if no back navigation available
            navigation.navigate('Feed' as never);
          }
        },
      },
    ]);
  }, [onClose, navigation, haptics, isGuest, game, recordTrialPlay, timeRemaining, currentScore]);

  const handleTrialEnd = async () => {
    // Manual trial end (user chooses to stop playing)
    setIsPaused(true);
    haptics.success();

    // Timer removed - no time tracking needed
    // const timePlayed = Math.floor((Date.now() - trialStartTime.current) / 1000);

    setTrialStats({
      score: currentScore,
      timePlayed: 0,  // Kept for compatibility, but not displayed
      levelsCompleted: levelProgress - 1,
      achievementsUnlocked: achievements.length,
    });

    trackAnalytics(ANALYTICS_EVENTS.TRIAL_COMPLETE, {
      gameId: game?.id,
      score: currentScore,
      // timePlayed removed from analytics
      achievements: achievements.length,
    });

    // Record for guests - using 0 for time as it's not tracked
    if (isGuest && game) {
      await recordTrialPlay(game.id, 0, true);
    }

    // Show post-trial screen
    setShowPostTrial(true);
  };

  const handleWebViewMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse((event.nativeEvent as unknown).data);

      switch (data.type) {
        case 'score':
          setCurrentScore(data.value);
          trackAnalytics(ANALYTICS_EVENTS.SCORE_UPDATE, { score: data.value });
          break;
        case 'achievement':
          setAchievements(prev => [...prev, data.id]);
          haptics.achievement();
          trackAnalytics(ANALYTICS_EVENTS.ACHIEVEMENT_UNLOCK, { achievement: data.id });
          break;
        case 'level':
          setLevelProgress(data.level);
          trackAnalytics(ANALYTICS_EVENTS.LEVEL_COMPLETE, { level: data.level });
          break;
        case 'error':
          handleGameError(data.message);
          break;
      }
    } catch (error) {
      // Failed to parse WebView message
    }
  };

  // Handle screen tap to show control overlay
  const handleScreenTap = useCallback(() => {
    if (!isPaused && !showPostTrial) {
      setShowControlOverlay(true);
    }
  }, [isPaused, showPostTrial]);
  
  // Pan responder for swipe down gesture
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to downward swipes from top area
        return gestureState.dy > 20 && gestureState.y0 < 100;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 50) {
          // Swipe down detected
          setShowControlOverlay(true);
        }
      },
    })
  ).current;

  const handleGameError = (message: string) => {
    setHasError(true);
    setErrorMessage(message);
    setIsPaused(true);
    trackAnalytics(ANALYTICS_EVENTS.TRIAL_ERROR, { error: message });
  };

  const handleRetryTrial = () => {
    setHasError(false);
    setErrorMessage('');
    setCurrentScore(0);
    setAchievements([]);
    setLevelProgress(1);
    setTimeRemaining(game?.trialDuration ? game.trialDuration * 60 : 300);
    // Force WebView to reload by changing key
    setWebViewKey(prev => prev + 1);
  };

  const trackAnalytics = (_event: string, _params?: Record<string, unknown>) => {
    // Mock analytics tracking
    // Analytics event: event, params
  };

  const handleRateTrial = (_rating: number) => {
    haptics.selection();
    // Save value: rating
  };

  const handleContinuePlaying = () => {
    haptics.success();
    // Navigate to purchase or full game
    navigation.navigate('GameDetail' as keyof RootStackParamList, { gameId: game?.id } as any);
  };

  const handleShareScore = () => {
    haptics.selection();
    // Share functionality - score: currentScore
  };
  
  const handleRecordingToggle = () => {
    haptics.trigger('medium');
    
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      Animated.timing(recordingOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      Alert.alert(
        'Recording Stopped',
        'Your gameplay recording has been saved. You can upload it in the Watch tab!',
        [{ text: 'OK' }]
      );
    } else {
      // Start recording
      setIsRecording(true);
      
      // Pulsing animation for recording indicator
      Animated.loop(
        Animated.sequence([
          Animated.timing(recordingOpacity, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(recordingOpacity, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
      
      Alert.alert(
        'Recording Started',
        'Your gameplay is now being recorded with audio. Tap the record button again to stop.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleSaveToLibrary = async () => {
    if (game) {
      await toggleBookmark(game.id);
      haptics.success();
    }
  };

  if (!game) return null;

  const isLiked = likes.has(game.id);
  const isBookmarked = bookmarks.has(game.id);

  return (
    <View style={styles.container}>
      {/* Pre-trial Loading Screen */}
      {isLoading && (
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            styles.loadingContainer,
            { opacity: loadingOpacity, zIndex: 1000 },
          ]}
        >
          {/* Blurred game background */}
          <Image
            source={{ uri: game.coverUrl || game.thumbnailUrl }}
            style={StyleSheet.absoluteFillObject}
            blurRadius={20}
          />
          <LinearGradient
            colors={['rgba(15,20,25,0.7)', 'rgba(15,20,25,0.9)']}
            style={StyleSheet.absoluteFillObject}
          />

          <View style={styles.loadingContent}>
            <Image source={{ uri: game.thumbnailUrl }} style={styles.loadingGameImage} />

            <GlassContainer variant="surface" style={{ padding: isPortrait ? DS.spacing.xs : DS.spacing.sm, borderRadius: DS.effects.borderRadiusMedium, marginBottom: isPortrait ? DS.spacing.md : DS.spacing.lg }}>
              <Text size={isPortrait ? "lg" : "xl"} weight="bold" color={DS.colors.textPrimary} style={{ textAlign: 'center' }}>
                {game.title}
              </Text>
            </GlassContainer>

            <View style={styles.loadingProgressContainer}>
              <View style={styles.loadingProgressBar}>
                <LinearGradient
                  colors={['#6366f1', '#8b5cf6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.loadingProgressFill, { width: `${loadingProgress}%` }]}
                />
              </View>
              <Text variant="caption" color={DS.colors.textSecondary} style={styles.loadingStageText}>
                {loadingStage === 'preparing' && 'Preparing trial...'}
                {loadingStage === 'loading' && 'Loading assets...'}
                {loadingStage === 'ready' && 'Almost ready...'}
              </Text>
            </View>

            <View style={styles.loadingTips}>
              <Text variant="body" color={DS.colors.textMuted} style={styles.tipText}>
                {LOADING_TIPS[currentTip]}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.cancelLoadingButton}
              onPress={() => {
                Alert.alert('Cancel Loading?', 'Are you sure you want to cancel?', [
                  { text: 'No', style: 'cancel' },
                  {
                    text: 'Yes',
                    onPress: () =>
                      onClose
                        ? onClose()
                        : navigation.canGoBack()
                          ? navigation.goBack()
                          : navigation.navigate('Feed' as never),
                  },
                ]);
              }}
            >
              <Text variant="caption" color={DS.colors.textMuted}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Game Container - Modified to use full screen */}
      <Pressable 
        style={StyleSheet.absoluteFillObject}
        onPress={handleScreenTap}
        {...panResponder.panHandlers}
      >
        {/* WebView now fills entire screen, letting JavaScript handle scaling */}
        {game.trialType === 'webview' || true ? (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000' }]}>
            <WebView
            key={webViewKey}
            ref={webViewRef}
            source={webViewSource}
            style={[{ flex: 1, width: '100%', height: '100%' }, { backgroundColor: '#000' }]}
            pointerEvents="auto"
            onMessage={handleWebViewMessage}
            onError={syntheticEvent => {
              const { nativeEvent } = syntheticEvent;
              // WebView error: nativeEvent
              // Failed URL: nativeEvent.url

              // If DNS error, fall back to offline game
              if (
                nativeEvent.code === -2 ||
                nativeEvent.description?.includes('ERR_NAME_NOT_RESOLVED')
              ) {
                // DNS error detected, falling back to offline game
                // Set offline URL and reload
                setGameUrl('offline://evolution-runner');
                setWebViewKey(prev => prev + 1);
                // Show a brief message
                handleGameError(`Network unavailable. Loading offline version...`);
                // Clear error after 2 seconds
                setTimeout(() => {
                  setHasError(false);
                  setErrorMessage('');
                }, 2000);
              } else {
                handleGameError(
                  `Failed to load game: ${nativeEvent.description || 'Unknown error'}`
                );
              }
            }}
            onHttpError={async syntheticEvent => {
              const { nativeEvent } = syntheticEvent;
              // WebView HTTP error: nativeEvent

              // If we get a 403 error from CloudFront, retry with direct S3 URL
              if (nativeEvent.statusCode === 403 && nativeEvent.url?.includes('cloudfront')) {
                // CloudFront 403 error, retrying with direct S3 URL...
                try {
                  // Determine the correct game ID for S3
                  let s3GameId = game.id;
                  if (game.id === 'evolution-runner-001' || game.title === 'Evolution Runner') {
                    s3GameId = 'Evolution-Runner';
                  }

                  const presignedUrl = await gamePresignedUrlService.getPresignedUrl(
                    s3GameId,
                    'index.html'
                  );
                  // Got fallback presigned URL
                  setGameUrl(presignedUrl);
                  setWebViewKey(prev => prev + 1); // Force reload
                  return;
                } catch (error) {
                  // Failed to get fallback URL
                }
              }

              trackAnalytics(ANALYTICS_EVENTS.TRIAL_ERROR, {
                error: `HTTP ${nativeEvent.statusCode}: ${nativeEvent.description || 'Failed to load'}`,
              });
              handleGameError(
                `HTTP ${nativeEvent.statusCode}: ${nativeEvent.description || 'Failed to load'}`
              );
            }}
            onLoad={() => {
              // WebView loaded successfully
            }}
            onLoadStart={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              const actualLoadingUrl = nativeEvent.url;
              const expectedUrl = game.trialUrl || gameUrl || 'NO URL';
              const isUsingCloudFront = actualLoadingUrl.includes('cloudfront.net');
              const isUsingS3 = actualLoadingUrl.includes('.s3.amazonaws.com');
              
              // Only log once per actual navigation
              if (actualLoadingUrl !== 'about:blank') {
                logger.debug('🚀 WebView ACTUALLY loading:', {
                  gameId: game.id,
                  gameTitle: game.title,
                  actualLoadingUrl,
                  expectedUrl,
                  isUsingCloudFront,
                  isUsingS3,
                  urlType: isUsingCloudFront ? 'CloudFront ✅' : (isUsingS3 ? 'S3 ⚠️' : 'Other')
                });
              }
            }}
            onLoadEnd={() => {
              // WebView finished loading
            }}
            injectedJavaScript={`
              // Fix game positioning to be fully visible on screen
              (function() {
                function fixGameDisplay() {
                  // Set viewport meta tag first
                  let viewport = document.querySelector('meta[name="viewport"]');
                  if (!viewport) {
                    viewport = document.createElement('meta');
                    viewport.name = 'viewport';
                    document.head.appendChild(viewport);
                  }
                  viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
                  
                  // Reset body styles
                  document.body.style.cssText = 'margin: 0; padding: 0; overflow: hidden; background: #000; position: relative; width: 100vw; height: 100vh;';
                  document.documentElement.style.cssText = 'margin: 0; padding: 0; overflow: hidden; width: 100%; height: 100%;';
                  
                  // Find the canvas or game container
                  const canvas = document.querySelector('canvas');
                  const gameContainer = document.querySelector('#game, #game-container, .game-container, #phaser-game');
                  const targetElement = canvas || gameContainer;
                  
                  if (!targetElement) {
                    // Try again if element not found
                    setTimeout(fixGameDisplay, 100);
                    return;
                  }
                  
                  // Get actual viewport dimensions
                  const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
                  const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
                  
                  // Get game dimensions
                  let gameWidth = ${gameScalingConfig.nativeWidth};
                  let gameHeight = ${gameScalingConfig.nativeHeight};
                  
                  if (canvas) {
                    gameWidth = canvas.width || gameWidth;
                    gameHeight = canvas.height || gameHeight;
                  }
                  
                  // Calculate scale to fit entire game on screen
                  const scaleX = vw / gameWidth;
                  const scaleY = vh / gameHeight;
                  const scale = Math.min(scaleX, scaleY) * 0.95; // 95% to add small padding
                  
                  // Apply scaling
                  if (canvas) {
                    // Reset any existing transforms
                    canvas.style.transform = '';
                    canvas.style.transformOrigin = '0 0';
                    
                    // Scale the canvas
                    const scaledWidth = gameWidth * scale;
                    const scaledHeight = gameHeight * scale;
                    const offsetX = (vw - scaledWidth) / 2;
                    const offsetY = (vh - scaledHeight) / 2;
                    
                    canvas.style.cssText = \`
                      position: fixed !important;
                      left: \${offsetX}px !important;
                      top: \${offsetY}px !important;
                      width: \${scaledWidth}px !important;
                      height: \${scaledHeight}px !important;
                      transform: none !important;
                      transform-origin: 0 0 !important;
                    \`;
                    
                    // Also check if canvas has a parent wrapper that needs adjustment
                    if (canvas.parentElement && canvas.parentElement !== document.body) {
                      canvas.parentElement.style.cssText = 'position: static; width: auto; height: auto; transform: none;';
                    }
                  }
                  
                  // Log for debugging
                  logger.debug('Game display fixed:', {
                    viewport: { width: vw, height: vh },
                    game: { width: gameWidth, height: gameHeight },
                    scale: scale,
                    element: targetElement.tagName
                  });
                }
                
                // Run immediately and on various events
                fixGameDisplay();
                
                // Retry to catch dynamically created content
                setTimeout(fixGameDisplay, 100);
                setTimeout(fixGameDisplay, 300);
                setTimeout(fixGameDisplay, 500);
                setTimeout(fixGameDisplay, 1000);
                
                // Handle orientation changes
                window.addEventListener('resize', fixGameDisplay);
                window.addEventListener('orientationchange', fixGameDisplay);
              })();
              
              // Preserve game communication
              window.postMessage = function(data) {
                window.ReactNativeWebView.postMessage(JSON.stringify(data));
              };
              true;
            `}
            // Android specific props for better compatibility
            domStorageEnabled={true}
            javaScriptEnabled={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            startInLoadingState={true}
            mixedContentMode="always"
            allowsFullscreenVideo={true}
            originWhitelist={['*']}
            allowUniversalAccessFromFileURLs={true}
            allowFileAccessFromFileURLs={true}
            scalesPageToFit={false}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            scrollEnabled={false}
            bounces={false}
            overScrollMode="never"
            contentInsetAdjustmentBehavior="never"
            userAgent="Mozilla/5.0 (Linux; Android 10; Android SDK built for x86) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36 Trioll/1.0"
            renderLoading={() => (
              <View
                style={[
                  StyleSheet.absoluteFillObject,
                  { backgroundColor: DS.colors.background, justifyContent: 'center', alignItems: 'center' },
                ]}
              >
                <ActivityIndicator size="large" color={DS.colors.primary} />
                <Text style={{ color: DS.colors.textPrimary, marginTop: DS.spacing.md }}>
                  Loading game from CloudFront...
                </Text>
              </View>
            )}
          />
          </View>
        ) : (
          // Native SDK integration placeholder
          <View style={styles.gamePlaceholder}>
            <LinearGradient
              colors={['#1a1a2e', '#16213e', '#0f3460']}
              style={StyleSheet.absoluteFillObject}
            />
            <Ionicons name="game-controller" size={100} color="#ffffff10" />
            <Text size="2xl" weight="bold" color="#ffffff20" style={{ marginTop: 20 }}>
              {game.title} Trial
            </Text>
            <Text variant="body" color="#ffffff15" style={{ marginTop: 8 }}>
              Native SDK Integration
            </Text>
          </View>
        )}
      </Pressable>
      
      {/* Game Control Overlay */}
      <GameControlOverlay
        visible={showControlOverlay}
        onVisibilityChange={setShowControlOverlay}
        onBack={handleExit}
        onReportIssue={() => setShowReportIssue(true)}
        onFullscreenToggle={(fullscreen) => {
          // Handle fullscreen toggle
          if (fullscreen) {
            // Hide status bar for fullscreen
            StatusBar.setHidden(true, 'fade');
          } else {
            // Show status bar
            StatusBar.setHidden(false, 'fade');
          }
        }}
      />
      
      {/* Invisible touch area for showing HUD - positioned at top of screen */}
      <Pressable
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 100,
        }}
        onPress={showHUDTemporarily}
        disabled={showHUD || isPaused}
      />

      {/* Recording Indicator - Always visible when recording */}
      {isRecording && !showHUD && !isPaused && (
        <View style={styles.recordingIndicatorContainer}>
          <Animated.View style={[styles.recordingIndicator, { opacity: recordingOpacity }]}>
            <View style={styles.recordingDot} />
            <Text variant="caption" style={styles.recordingText}>REC</Text>
          </Animated.View>
        </View>
      )}
      
      {/* Trial HUD */}
      {showHUD && !isPaused && !isLoading && (
        <Animated.View
          style={[styles.hudContainer, { opacity: hudOpacity }]}
          pointerEvents="box-none"
        >
          {/* Top Bar */}
          <View style={[styles.hudTopBar, { paddingTop: insets.top + 16 }]}>
            {/* Pause Button */}
            <Pressable
              onPress={handlePauseToggle}
              onPressIn={() => pauseButtonScale.scaleDown()}
              onPressOut={() => pauseButtonScale.scaleUp()}
              style={[styles.hudButton, isPortrait && styles.hudButtonPortrait]}
            >
              <Animated.View style={{ transform: [{ scale: pauseButtonScale.animatedValue }] }}>
                <View style={[styles.hudButtonInner, isPortrait && styles.hudButtonInnerPortrait]}>
                  <Ionicons name="pause" size={isPortrait ? 18 : 20} color={DS.colors.textPrimary} />
                </View>
              </Animated.View>
            </Pressable>

            {/* Timer - Hidden but keeping space for UI consistency */}
            <View style={styles.timerContainer} />
            
            {/* Recording Button */}
            <TouchableOpacity onPress={handleRecordingToggle} style={styles.hudButton}>
              <Animated.View style={{ opacity: recordingOpacity }}>
                <View style={[
                  styles.hudButtonInner, 
                  isPortrait && styles.hudButtonInnerPortrait,
                  isRecording && styles.recordingButtonActive
                ]}>
                  <Ionicons 
                    name={isRecording ? "stop-circle" : "radio-button-on"} 
                    size={isPortrait ? 18 : 20} 
                    color={isRecording ? '#FF0000' : DS.colors.textPrimary} 
                  />
                </View>
              </Animated.View>
            </TouchableOpacity>

            {/* Settings Button */}
            <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.hudButton}>
              <View style={[styles.hudButtonInner, isPortrait && styles.hudButtonInnerPortrait]}>
                <Ionicons name="settings-outline" size={isPortrait ? 18 : 20} color={DS.colors.textPrimary} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Bottom Bar */}
          <View style={[styles.hudBottomBar, { paddingBottom: insets.bottom + 16 }]}>
            {/* Score */}
            {currentScore > 0 && (
              <View style={styles.scoreContainer}>
                <Text variant="caption" color={DS.colors.textSecondary}>
                  Score
                </Text>
                <Text size="lg" weight="bold" color={DS.colors.textPrimary}>
                  {currentScore.toLocaleString()}
                </Text>
              </View>
            )}

            {/* Level */}
            {levelProgress > 1 && (
              <View style={styles.levelContainer}>
                <Text variant="caption" color={DS.colors.textSecondary}>
                  Level
                </Text>
                <Text size="lg" weight="bold" color={DS.colors.textPrimary}>
                  {levelProgress}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      )}

      {/* 10 Second Warning - Removed as timer is disabled */}

      {/* Pause Menu */}
      {showPauseMenu && (
        <Pressable style={StyleSheet.absoluteFillObject} onPress={handleResume}>
          <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: pauseMenuOpacity }]}>
            <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFillObject} />
            <View style={styles.dimOverlay} />
          </Animated.View>

          <Animated.View
            style={[
              styles.pauseMenuContainer,
              {
                opacity: pauseMenuOpacity,
                transform: [{ scale: pauseMenuScale }],
              },
            ]}
            pointerEvents="box-none"
          >
            <Pressable style={styles.pauseMenu} onPress={e => e.stopPropagation()}>
              <Text size={isPortrait ? "lg" : "xl"} weight="bold" color={DS.colors.textPrimary} style={styles.pauseTitle}>
                Game Paused
              </Text>

              <GlassButton
                variant="primary"
                size="large"
                onPress={handleResume}
                style={{ marginBottom: DS.spacing.md }}
                glowEffect
              >
                <Ionicons name="play" size={isPortrait ? 20 : 24} color="#000000" style={{ marginRight: DS.spacing.xs }} />
                <Text variant="body" color="#000000" weight="bold">
                  Resume
                </Text>
              </GlassButton>

              <TouchableOpacity style={[styles.pauseMenuItem, isPortrait && styles.pauseMenuItemPortrait]} onPress={() => setShowHowToPlay(true)}>
                <Ionicons name="help-circle-outline" size={isPortrait ? 20 : 24} color={DS.colors.textPrimary} />
                <Text variant="body" color={DS.colors.textPrimary} weight="medium">
                  How to Play
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.pauseMenuItem, isPortrait && styles.pauseMenuItemPortrait]} onPress={() => setShowSettings(true)}>
                <Ionicons name="settings-outline" size={isPortrait ? 20 : 24} color={DS.colors.textPrimary} />
                <Text variant="body" color={DS.colors.textPrimary} weight="medium">
                  Settings
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pauseMenuItem, isPortrait && styles.pauseMenuItemPortrait]}
                onPress={() => setShowReportIssue(true)}
              >
                <Ionicons name="bug-outline" size={isPortrait ? 20 : 24} color={DS.colors.textPrimary} />
                <Text variant="body" color={DS.colors.textPrimary} weight="medium">
                  Report Issue
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pauseMenuItem, isPortrait && styles.pauseMenuItemPortrait, styles.quitButton]}
                onPress={handleExit}
              >
                <Ionicons name="exit-outline" size={isPortrait ? 20 : 24} color={DS.colors.warning} />
                <Text variant="body" color={DS.colors.warning} weight="medium">
                  Quit Trial
                </Text>
              </TouchableOpacity>
            </Pressable>
          </Animated.View>
        </Pressable>
      )}

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, isPortrait && styles.modalContentPortrait]}>
            <View style={styles.modalHeader}>
              <Text size={isPortrait ? "base" : "lg"} weight="bold" color={DS.colors.textPrimary}>
                Settings
              </Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Ionicons name="close" size={24} color={DS.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.settingsItem}>
              <View style={styles.settingsRow}>
                <Ionicons name="volume-high" size={isPortrait ? 20 : 24} color={DS.colors.textPrimary} />
                <Text variant="body" color={DS.colors.textPrimary}>
                  Sound
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.toggle, soundEnabled && styles.toggleActive]}
                onPress={() => setSoundEnabled(!soundEnabled)}
              >
                <View style={[styles.toggleThumb, soundEnabled && styles.toggleThumbActive]} />
              </TouchableOpacity>
            </View>

            <View style={styles.settingsItem}>
              <View style={styles.settingsRow}>
                <Ionicons name="phone-portrait-outline" size={isPortrait ? 20 : 24} color={DS.colors.textPrimary} />
                <Text variant="body" color={DS.colors.textPrimary}>
                  Vibration
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.toggle, vibrationEnabled && styles.toggleActive]}
                onPress={() => setVibrationEnabled(!vibrationEnabled)}
              >
                <View style={[styles.toggleThumb, vibrationEnabled && styles.toggleThumbActive]} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Post-Trial Screen */}
      {showPostTrial && (
        <View style={[StyleSheet.absoluteFillObject, styles.postTrialContainer, { zIndex: 2000 }]}>
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFillObject} />
          <LinearGradient
            colors={['rgba(15,20,25,0.8)', 'rgba(15,20,25,0.95)']}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Dismiss button in top-right corner */}
          <TouchableOpacity
            style={[
              styles.postTrialDismissButton,
              { top: insets.top + 16, right: 16 }
            ]}
            onPress={() => {
              haptics.impact('light');
              setShowPostTrial(false);
              if (onClose) {
                onClose();
              } else if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('Feed' as never);
              }
            }}
          >
            <View style={styles.postTrialDismissButtonInner}>
              <Ionicons name="close" size={24} color={DS.colors.textPrimary} />
            </View>
          </TouchableOpacity>

          <ScrollView
            contentContainerStyle={[styles.postTrialContent, { paddingTop: insets.top + 20 }]}
            showsVerticalScrollIndicator={false}
          >
            <Text size={isPortrait ? "xl" : "2xl"} weight="bold" color={DS.colors.textPrimary} style={styles.postTrialTitle}>
              Trial Complete!
            </Text>

            <Image source={{ uri: game.thumbnailUrl }} style={[styles.postTrialGameImage, isPortrait && styles.postTrialGameImagePortrait]} />

            {/* Performance Summary */}
            <View style={[styles.performanceCard, isPortrait && styles.performanceCardPortrait]}>
              <Text size={isPortrait ? "base" : "lg"} weight="bold" color={DS.colors.textPrimary} style={styles.performanceTitle}>
                Your Performance
              </Text>

              <View style={[styles.statsGrid, isPortrait && styles.statsGridPortrait]}>
                <View style={styles.statItem}>
                  <Ionicons name="trophy" size={isPortrait ? 20 : 24} color={DS.colors.success} />
                  <Text size="xl" weight="bold" color={DS.colors.textPrimary}>
                    {trialStats.score.toLocaleString()}
                  </Text>
                  <Text variant="caption" color={DS.colors.textMuted}>
                    Score
                  </Text>
                </View>

                {/* Replaced time stat with games played to maintain grid balance */}
                <View style={styles.statItem}>
                  <Ionicons name="game-controller" size={isPortrait ? 20 : 24} color={DS.colors.accent} />
                  <Text size="xl" weight="bold" color={DS.colors.textPrimary}>
                    1
                  </Text>
                  <Text variant="caption" color={DS.colors.textMuted}>
                    Games Played
                  </Text>
                </View>

                {trialStats.levelsCompleted > 0 && (
                  <View style={styles.statItem}>
                    <Ionicons name="flag" size={isPortrait ? 20 : 24} color={DS.colors.warning} />
                    <Text size="xl" weight="bold" color={DS.colors.textPrimary}>
                      {trialStats.levelsCompleted}
                    </Text>
                    <Text variant="caption" color={DS.colors.textMuted}>
                      Levels
                    </Text>
                  </View>
                )}

                {trialStats.achievementsUnlocked > 0 && (
                  <View style={styles.statItem}>
                    <Ionicons name="medal" size={isPortrait ? 20 : 24} color={DS.colors.primary} />
                    <Text size="xl" weight="bold" color={DS.colors.textPrimary}>
                      {trialStats.achievementsUnlocked}
                    </Text>
                    <Text variant="caption" color={DS.colors.textMuted}>
                      Achievements
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Continue Playing CTA */}
            <GlassButton
              variant="primary"
              size="large"
              onPress={handleContinuePlaying}
              style={{ width: '100%', marginBottom: DS.spacing.lg }}
              glowEffect
            >
              <Text size="lg" weight="bold" color="#000">
                Continue Playing
              </Text>
              <Ionicons name="arrow-forward" size={isPortrait ? 20 : 24} color="#000" style={{ marginLeft: DS.spacing.xs }} />
            </GlassButton>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  if (game) {
                    toggleLike(game.id);
                    haptics.impact();
                  }
                }}
              >
                <Ionicons
                  name={isLiked ? 'heart' : 'heart-outline' as any}
                  size={isPortrait ? 20 : 24}
                  color={isLiked ? DS.colors.warning : DS.colors.textPrimary}
                />
                <Text variant="caption" color={DS.colors.textMuted}>
                  Like
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} onPress={handleSaveToLibrary}>
                <Ionicons
                  name={isBookmarked ? 'bookmark' : 'bookmark-outline' as any}
                  size={isPortrait ? 20 : 24}
                  color={isBookmarked ? DS.colors.success : DS.colors.textPrimary}
                />
                <Text variant="caption" color={DS.colors.textMuted}>
                  Save
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} onPress={handleShareScore}>
                <Ionicons name="share-social-outline" size={isPortrait ? 20 : 24} color={DS.colors.textPrimary} />
                <Text variant="caption" color={DS.colors.textMuted}>
                  Share
                </Text>
              </TouchableOpacity>
            </View>

            {/* Rate Trial */}
            <View style={styles.ratingSection}>
              <Text variant="body" color={DS.colors.textPrimary} style={{ marginBottom: DS.spacing.sm }}>
                How was your trial experience?
              </Text>
              <View style={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map(star => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => handleRateTrial(star)}
                    style={styles.starButton}
                  >
                    <Ionicons name="star" size={isPortrait ? 28 : 32} color={DS.colors.success} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Similar Games */}
            <View style={styles.similarGamesSection}>
              <Text size="lg" weight="bold" color={DS.colors.textPrimary} style={styles.sectionTitle}>
                Similar Games
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {games.slice(0, 5).map(similarGame => (
                  <TouchableOpacity
                    key={similarGame.id}
                    style={[styles.similarGameCard, isPortrait && styles.similarGameCardPortrait]}
                    onPress={() => {
                      setShowPostTrial(false);
                      navigation.navigate('GameDetail' as keyof RootStackParamList, { gameId: similarGame.id } as any);
                    }}
                  >
                    <Image
                      source={{ uri: similarGame.thumbnailUrl }}
                      style={[styles.similarGameImage, isPortrait && styles.similarGameImagePortrait]}
                    />
                    <Text variant="caption" color={DS.colors.textPrimary} numberOfLines={1}>
                      {similarGame.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Guest Register Prompt */}
            {isGuest && (
              <TouchableOpacity
                style={styles.registerPrompt}
                onPress={() => navigation.navigate('RegistrationMethod' as never)}
              >
                <LinearGradient
                  colors={['rgba(99, 102, 241, 0.2)', 'rgba(139, 92, 246, 0.2)']}
                  style={styles.registerGradient}
                >
                  <Ionicons name="person-add" size={24} color={DS.colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text variant="body" weight="bold" color={DS.colors.textPrimary}>
                      Create an Account
                    </Text>
                    <Text variant="caption" color={DS.colors.textMuted}>
                      Save your progress and unlock unlimited trials
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={DS.colors.primary} />
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Close Button */}
            <TouchableOpacity
              style={styles.closePostTrialButton}
              onPress={() => {
                if (onClose) {
                  onClose();
                } else if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate('Feed' as never);
                }
              }}
            >
              <Text variant="body" color={DS.colors.textMuted}>
                Back to Feed
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Error State */}
      {hasError && (
        <View style={[StyleSheet.absoluteFillObject, styles.errorContainer]}>
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFillObject} />
          <View style={styles.errorContent}>
            <Ionicons name="alert-circle" size={isPortrait ? 48 : 64} color={DS.colors.warning} />
            <Text size="xl" weight="bold" color={DS.colors.textPrimary} style={styles.errorTitle}>
              Oops! Something went wrong
            </Text>
            <Text variant="body" color={DS.colors.textMuted} center style={styles.errorMessage}>
              {errorMessage || 'The game encountered an error. Please try again.'}
            </Text>

            <GlassButton
              variant="primary"
              size="medium"
              onPress={handleRetryTrial}
              style={{ marginBottom: DS.spacing.md }}
            >
              <Ionicons name="refresh" size={20} color="#000" style={{ marginRight: DS.spacing.xs }} />
              <Text variant="body" weight="bold" color="#000">
                Retry
              </Text>
            </GlassButton>

            <TouchableOpacity
              style={styles.exitErrorButton}
              onPress={() =>
                onClose
                  ? onClose()
                  : navigation.canGoBack()
                    ? navigation.goBack()
                    : navigation.navigate('Feed' as never)
              }
            >
              <Text variant="body" color={DS.colors.textMuted}>
                Exit to Feed
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
  // Loading Screen
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    paddingHorizontal: DS.spacing.xxl,
  },
  loadingGameImage: {
    width: 120,
    height: 120,
    borderRadius: DS.effects.borderRadiusLarge,
    marginBottom: DS.spacing.lg,
  },
  loadingTitle: {
    marginBottom: DS.spacing.xl,
  },
  loadingProgressContainer: {
    width: '100%',
    marginBottom: DS.spacing.lg,
  },
  loadingProgressBar: {
    height: 4,
    backgroundColor: DS.colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: DS.spacing.xs,
    ...DS.effects.glassSurface,
  },
  loadingProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  loadingStageText: {
    textAlign: 'center',
  },
  loadingTips: {
    marginTop: DS.spacing.xl,
    paddingHorizontal: DS.spacing.lg,
  },
  tipText: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
  cancelLoadingButton: {
    marginTop: DS.spacing.xxl,
    padding: DS.spacing.sm,
  },
  // Game Container
  gamePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // HUD
  hudContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  hudTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: DS.spacing.md,
  },
  hudBottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: DS.spacing.md,
  },
  hudButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hudButtonInner: {
    width: 36,
    height: 36,
    borderRadius: DS.effects.borderRadiusCircle,
    backgroundColor: DS.colors.surface,
    borderWidth: DS.layout.borderWidth,
    borderColor: DS.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    ...DS.effects.glassSurface,
    ...DS.effects.shadowMedium,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DS.spacing.md,
    paddingVertical: DS.spacing.xs,
    backgroundColor: DS.colors.surface,
    borderRadius: DS.effects.borderRadiusPill,
    borderWidth: DS.layout.borderWidth,
    borderColor: DS.colors.border,
    gap: DS.spacing.xs,
    ...DS.effects.glassSurface,
  },
  timerWarning: {
    backgroundColor: DS.colors.warningMuted,
    borderColor: DS.colors.warning,
  },
  timerText: {
    fontSize: DS.typography.small.fontSize,
    letterSpacing: 1,
  },
  scoreContainer: {
    backgroundColor: DS.colors.surface,
    paddingHorizontal: DS.spacing.md,
    paddingVertical: DS.spacing.xs,
    borderRadius: DS.effects.borderRadiusMedium,
    alignItems: 'center',
    borderWidth: DS.layout.borderWidth,
    borderColor: DS.colors.border,
    ...DS.effects.glassSurface,
  },
  levelContainer: {
    backgroundColor: DS.colors.surface,
    paddingHorizontal: DS.spacing.md,
    paddingVertical: DS.spacing.xs,
    borderRadius: DS.effects.borderRadiusMedium,
    alignItems: 'center',
    borderWidth: DS.layout.borderWidth,
    borderColor: DS.colors.border,
    ...DS.effects.glassSurface,
  },
  // Warning
  warningContainer: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
    zIndex: 100,
  },
  warningGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 24,
    gap: 12,
  },
  // Pause Menu
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pauseMenuContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseMenu: {
    backgroundColor: DS.colors.surface,
    borderRadius: DS.effects.borderRadiusLarge,
    padding: DS.spacing.lg,
    minWidth: 320,
    borderWidth: DS.layout.borderWidth,
    borderColor: DS.colors.borderLight,
    ...DS.effects.glassSurfaceElevated,
    ...DS.effects.shadowElevated,
  },
  pauseTitle: {
    textAlign: 'center',
    marginBottom: DS.spacing.lg,
  },
  pauseMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: DS.spacing.md,
    paddingHorizontal: DS.spacing.lg,
    gap: DS.spacing.md,
    borderRadius: DS.effects.borderRadiusMedium,
    marginBottom: DS.spacing.xs,
    backgroundColor: DS.colors.surface,
    borderWidth: DS.layout.borderWidth,
    borderColor: DS.colors.border,
  },
  resumeButton: {
    marginBottom: DS.spacing.md,
    overflow: 'hidden',
  },
  resumeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: DS.spacing.md,
    paddingHorizontal: DS.spacing.lg,
    gap: DS.spacing.sm,
  },
  quitButton: {
    marginTop: DS.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: DS.colors.border,
    paddingTop: DS.spacing.lg,
  },
  // Settings Modal
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(15,20,25,0.8)',
    justifyContent: 'center',
    paddingHorizontal: DS.spacing.lg,
  },
  modalContent: {
    backgroundColor: DS.colors.surface,
    borderRadius: DS.effects.borderRadiusLarge,
    padding: DS.spacing.lg,
    borderWidth: DS.layout.borderWidth,
    borderColor: DS.colors.borderLight,
    ...DS.effects.glassSurfaceElevated,
    ...DS.effects.shadowElevated,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: DS.spacing.lg,
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: DS.spacing.sm,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.sm,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: DS.colors.surface,
    padding: 2,
    borderWidth: DS.layout.borderWidth,
    borderColor: DS.colors.border,
  },
  toggleActive: {
    backgroundColor: DS.colors.primary,
    borderColor: DS.colors.primary,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: DS.colors.textPrimary,
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  // Post-Trial
  postTrialContainer: {
    backgroundColor: 'rgba(15,20,25,0.95)',
  },
  postTrialContent: {
    paddingHorizontal: DS.spacing.lg,
    paddingBottom: DS.spacing.xxl,
    alignItems: 'center',
  },
  postTrialTitle: {
    marginBottom: DS.spacing.lg,
  },
  postTrialGameImage: {
    width: 160,
    height: 160,
    borderRadius: DS.effects.borderRadiusLarge,
    marginBottom: DS.spacing.xl,
  },
  performanceCard: {
    width: '100%',
    backgroundColor: DS.colors.surface,
    borderRadius: DS.effects.borderRadiusLarge,
    padding: DS.spacing.lg,
    marginBottom: DS.spacing.lg,
    borderWidth: DS.layout.borderWidth,
    borderColor: DS.colors.borderLight,
    ...DS.effects.glassSurfaceElevated,
    ...DS.effects.shadowMedium,
  },
  performanceTitle: {
    textAlign: 'center',
    marginBottom: DS.spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: DS.spacing.md,
  },
  statItem: {
    alignItems: 'center',
    minWidth: 80,
  },
  continueCTA: {
    width: '100%',
    marginBottom: DS.spacing.lg,
    borderRadius: DS.effects.borderRadiusLarge,
    overflow: 'hidden',
  },
  continueGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: DS.spacing.md,
    gap: DS.spacing.xs,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: DS.spacing.xl,
    marginBottom: DS.spacing.xl,
  },
  actionButton: {
    alignItems: 'center',
    gap: DS.spacing.xxs,
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: DS.spacing.xl,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: DS.spacing.xs,
  },
  starButton: {
    padding: DS.spacing.xxs,
  },
  similarGamesSection: {
    width: '100%',
    marginBottom: DS.spacing.xl,
  },
  sectionTitle: {
    marginBottom: DS.spacing.md,
  },
  similarGameCard: {
    marginRight: DS.spacing.sm,
    alignItems: 'center',
  },
  similarGameImage: {
    width: 100,
    height: 100,
    borderRadius: DS.effects.borderRadiusMedium,
    marginBottom: DS.spacing.xs,
  },
  registerPrompt: {
    width: '100%',
    marginBottom: DS.spacing.lg,
    borderRadius: DS.effects.borderRadiusLarge,
    overflow: 'hidden',
  },
  registerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: DS.spacing.lg,
    gap: DS.spacing.md,
  },
  closePostTrialButton: {
    padding: DS.spacing.md,
  },
  postTrialDismissButton: {
    position: 'absolute',
    zIndex: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postTrialDismissButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    ...DS.effects.shadowMedium,
  },
  // Error State
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: DS.spacing.xxl,
  },
  errorContent: {
    alignItems: 'center',
    backgroundColor: DS.colors.surface,
    borderRadius: DS.effects.borderRadiusLarge,
    padding: DS.spacing.xl,
    borderWidth: DS.layout.borderWidth,
    borderColor: DS.colors.borderLight,
    ...DS.effects.glassSurfaceElevated,
    ...DS.effects.shadowElevated,
  },
  errorTitle: {
    marginTop: DS.spacing.md,
    marginBottom: DS.spacing.xs,
  },
  errorMessage: {
    marginBottom: DS.spacing.lg,
  },
  retryButton: {
    borderRadius: DS.effects.borderRadiusMedium,
    overflow: 'hidden',
    marginBottom: DS.spacing.md,
  },
  retryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: DS.spacing.sm,
    paddingHorizontal: DS.spacing.lg,
    gap: DS.spacing.xs,
  },
  exitErrorButton: {
    padding: DS.spacing.sm,
  },
  
  // Portrait mode optimizations
  loadingGameImagePortrait: {
    width: 100,
    height: 100,
  },
  hudButtonPortrait: {
    width: 36,
    height: 36,
  },
  hudButtonInnerPortrait: {
    width: 32,
    height: 32,
  },
  recordingButtonActive: {
    borderColor: '#FF0000',
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
  },
  recordingIndicatorContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1000,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  recordingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  timerContainerPortrait: {
    paddingHorizontal: DS.spacing.sm,
    paddingVertical: 4,
  },
  pauseMenuPortrait: {
    minWidth: 280,
    padding: DS.spacing.md,
  },
  pauseMenuItemPortrait: {
    paddingVertical: DS.spacing.sm,
    paddingHorizontal: DS.spacing.md,
    gap: DS.spacing.sm,
    marginBottom: 4,
  },
  postTrialGameImagePortrait: {
    width: 120,
    height: 120,
    marginBottom: DS.spacing.md,
  },
  performanceCardPortrait: {
    padding: DS.spacing.md,
    marginBottom: DS.spacing.md,
  },
  statsGridPortrait: {
    gap: DS.spacing.sm,
  },
  similarGameCardPortrait: {
    marginRight: DS.spacing.xs,
  },
  similarGameImagePortrait: {
    width: 80,
    height: 80,
    marginBottom: DS.spacing.xs,
  },
  modalContentPortrait: {
    padding: DS.spacing.md,
  },
});
