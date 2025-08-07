/**
 * Orientation-aware game scaling utilities
 * Ensures HTML5 games properly adapt to device orientation
 */

import { Dimensions } from 'react-native';

export interface OrientationConfig {
  isPortrait: boolean;
  screenWidth: number;
  screenHeight: number;
  gameWidth: number;
  gameHeight: number;
  aspectRatio: number;
}

/**
 * Generate orientation-aware CSS for HTML5 games
 */
export const generateOrientationAwareCSS = (config: OrientationConfig): string => {
  const { isPortrait, screenWidth, screenHeight, gameWidth, gameHeight, aspectRatio } = config;
  
  // Calculate scale factors for current orientation
  const scaleX = screenWidth / gameWidth;
  const scaleY = screenHeight / gameHeight;
  const scale = Math.min(scaleX, scaleY);
  
  // Calculate centering offsets
  const scaledWidth = gameWidth * scale;
  const scaledHeight = gameHeight * scale;
  const offsetX = (screenWidth - scaledWidth) / 2;
  const offsetY = (screenHeight - scaledHeight) / 2;

  return `
    /* Orientation-aware game scaling */
    html, body {
      margin: 0;
      padding: 0;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      background: #000;
      position: fixed;
      touch-action: none;
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
    }
    
    /* Game wrapper with proper sizing */
    #game-wrapper {
      position: fixed;
      width: ${scaledWidth}px;
      height: ${scaledHeight}px;
      left: ${offsetX}px;
      top: ${offsetY}px;
      transform-origin: 0 0;
    }
    
    /* Canvas scaling for current orientation */
    canvas {
      display: block !important;
      width: ${gameWidth}px !important;
      height: ${gameHeight}px !important;
      transform: scale(${scale}) !important;
      transform-origin: 0 0 !important;
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
    }
    
    /* Specific orientation handling */
    @media screen and (orientation: ${isPortrait ? 'portrait' : 'landscape'}) {
      canvas {
        /* Current orientation - use calculated scale */
        max-width: none !important;
        max-height: none !important;
      }
    }
    
    @media screen and (orientation: ${isPortrait ? 'landscape' : 'portrait'}) {
      /* Opposite orientation - recalculate */
      canvas {
        width: ${gameHeight}px !important;
        height: ${gameWidth}px !important;
        transform: scale(${Math.min(screenHeight / gameWidth, screenWidth / gameHeight)}) !important;
      }
    }
    
    /* Prevent scrolling and bouncing */
    * {
      -webkit-overflow-scrolling: touch;
      -webkit-transform: translate3d(0,0,0);
    }
    
    /* Game container elements */
    #game-container,
    #game,
    #phaser-game,
    #unity-container,
    .game-canvas {
      width: 100% !important;
      height: 100% !important;
      position: relative;
    }
  `;
};

/**
 * Generate JavaScript for dynamic orientation handling
 */
export const generateOrientationJS = (config: OrientationConfig): string => {
  const { gameWidth, gameHeight } = config;
  
  return `
    (function() {
      // Orientation handling
      let currentOrientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
      
      function updateGameScale() {
        const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
        const newOrientation = vw > vh ? 'landscape' : 'portrait';
        
        if (newOrientation !== currentOrientation) {
          currentOrientation = newOrientation;
          
          // Find all canvases
          const canvases = document.querySelectorAll('canvas');
          canvases.forEach(canvas => {
            // Reset canvas size
            canvas.style.width = '${gameWidth}px';
            canvas.style.height = '${gameHeight}px';
            
            // Calculate new scale
            const scaleX = vw / ${gameWidth};
            const scaleY = vh / ${gameHeight};
            const scale = Math.min(scaleX, scaleY);
            
            // Apply scale
            canvas.style.transform = 'scale(' + scale + ')';
            
            // Center the game
            const scaledWidth = ${gameWidth} * scale;
            const scaledHeight = ${gameHeight} * scale;
            const offsetX = (vw - scaledWidth) / 2;
            const offsetY = (vh - scaledHeight) / 2;
            
            // Update wrapper if exists
            const wrapper = document.getElementById('game-wrapper') || canvas.parentElement;
            if (wrapper) {
              wrapper.style.position = 'fixed';
              wrapper.style.left = offsetX + 'px';
              wrapper.style.top = offsetY + 'px';
              wrapper.style.width = scaledWidth + 'px';
              wrapper.style.height = scaledHeight + 'px';
            }
            
            // Notify game of resize
            if (window.dispatchEvent) {
              window.dispatchEvent(new Event('resize'));
              window.dispatchEvent(new Event('orientationchange'));
            }
          });
          
          // Notify React Native
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'orientation_changed',
              orientation: currentOrientation,
              width: vw,
              height: vh
            }));
          }
        }
      }
      
      // Listen for orientation changes
      window.addEventListener('resize', updateGameScale);
      window.addEventListener('orientationchange', updateGameScale);
      
      // Initial scale
      setTimeout(updateGameScale, 100);
      
      // Prevent zoom
      document.addEventListener('gesturestart', function(e) {
        e.preventDefault();
      });
      
      // Lock touch events to canvas
      document.addEventListener('touchstart', function(e) {
        if (e.target.tagName !== 'CANVAS') {
          e.preventDefault();
        }
      }, { passive: false });
    })();
  `;
};

/**
 * Calculate optimal game dimensions for current orientation
 */
export const calculateGameDimensions = (
  nativeWidth: number,
  nativeHeight: number,
  screenWidth: number,
  screenHeight: number,
  forcePortrait?: boolean
): OrientationConfig => {
  const isPortrait = forcePortrait !== undefined ? forcePortrait : screenHeight > screenWidth;
  const aspectRatio = nativeWidth / nativeHeight;
  
  // For portrait games in landscape, we might want to rotate
  const isPortraitGame = aspectRatio < 1;
  const shouldRotate = isPortraitGame && !isPortrait;
  
  const gameWidth = shouldRotate ? nativeHeight : nativeWidth;
  const gameHeight = shouldRotate ? nativeWidth : nativeHeight;
  
  return {
    isPortrait,
    screenWidth,
    screenHeight,
    gameWidth,
    gameHeight,
    aspectRatio,
  };
};

/**
 * Get device orientation
 */
export const getDeviceOrientation = () => {
  const { width, height } = Dimensions.get('window');
  return {
    isPortrait: height > width,
    width,
    height,
  };
};