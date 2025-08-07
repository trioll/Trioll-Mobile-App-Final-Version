/**
 * HTML5 Game Scaling Utilities
 * Ensures HTML5 games respect container aspect ratios and display correctly
 */

export interface GameScalingConfig {
  nativeWidth: number;
  nativeHeight: number;
  backgroundColor?: string;
}

/**
 * Generates CSS to properly scale and center HTML5 games
 */
export const generateGameScalingCSS = (config: GameScalingConfig): string => {
  const { nativeWidth, nativeHeight, backgroundColor = '#000' } = config;
  const aspectRatio = nativeWidth / nativeHeight;

  return `
    /* Reset and base styles */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
    }
    
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background-color: ${backgroundColor};
      position: relative;
    }
    
    /* Center all game containers */
    body {
      display: flex;
      justify-content: center;
      align-items: center;
    }
    
    /* Game canvas responsive scaling */
    canvas,
    #canvas,
    .game-canvas,
    #game-container canvas,
    #game canvas {
      display: block !important;
      max-width: 100% !important;
      max-height: 100% !important;
      width: auto !important;
      height: auto !important;
      object-fit: contain !important;
      position: relative !important;
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
    }
    
    /* Game container wrappers */
    #game-container,
    #game,
    #phaser-game,
    #unity-container,
    #godot-canvas,
    #construct-canvas,
    #playcanvas-canvas,
    .game-wrapper {
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      position: relative;
    }
    
    /* Prevent iframe scrolling */
    iframe {
      border: none;
      width: 100%;
      height: 100%;
    }
    
    /* Responsive aspect ratio preservation */
    @supports (aspect-ratio: ${nativeWidth} / ${nativeHeight}) {
      canvas {
        aspect-ratio: ${nativeWidth} / ${nativeHeight} !important;
        width: 100% !important;
        height: auto !important;
        max-height: 100% !important;
      }
    }
    
    /* Fallback for older browsers */
    @supports not (aspect-ratio: ${nativeWidth} / ${nativeHeight}) {
      canvas {
        /* Use traditional max-width/height approach */
        width: ${nativeWidth}px !important;
        height: ${nativeHeight}px !important;
        max-width: 100% !important;
        max-height: 100% !important;
      }
    }
  `;
};

/**
 * Generates JavaScript to handle game scaling and events
 */
export const generateGameScalingJS = (config: GameScalingConfig): string => {
  const { nativeWidth, nativeHeight } = config;

  return `
    (function() {
      // Store game configuration
      window.TRIOLL_GAME_CONFIG = {
        nativeWidth: ${nativeWidth},
        nativeHeight: ${nativeHeight},
        aspectRatio: ${nativeWidth / nativeHeight}
      };
      
      // Ensure canvas has proper dimensions
      function setupCanvas() {
        const canvases = document.querySelectorAll('canvas');
        canvases.forEach(canvas => {
          // Set the internal resolution if not already set
          if (!canvas.width || !canvas.height) {
            canvas.width = ${nativeWidth};
            canvas.height = ${nativeHeight};
          }
          
          // Ensure CSS doesn't override our responsive sizing
          canvas.style.position = 'relative';
          canvas.style.display = 'block';
          
          // Trigger resize event for the game engine
          if (canvas.dispatchEvent) {
            canvas.dispatchEvent(new Event('resize'));
          }
        });
      }
      
      // Override canvas creation
      const originalCreateElement = document.createElement;
      document.createElement = function(tagName) {
        const element = originalCreateElement.call(document, tagName);
        
        if (tagName.toLowerCase() === 'canvas') {
          // Set native resolution
          element.width = ${nativeWidth};
          element.height = ${nativeHeight};
          
          // Schedule setup
          requestAnimationFrame(setupCanvas);
        }
        
        return element;
      };
      
      // Handle dynamic canvas additions
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeName === 'CANVAS') {
              setupCanvas();
            }
          });
        });
      });
      
      // Start observing
      if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          observer.observe(document.body, { childList: true, subtree: true });
        });
      }
      
      // Initial setup
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupCanvas);
      } else {
        setupCanvas();
      }
      
      // Prevent unwanted fullscreen
      ['requestFullscreen', 'webkitRequestFullscreen', 'mozRequestFullScreen', 'msRequestFullscreen'].forEach(method => {
        if (Element.prototype[method]) {
          Element.prototype[method] = function() {
            return Promise.resolve();
          };
        }
      });
      
      // Prevent unwanted scrolling
      document.addEventListener('touchmove', (e) => {
        if (e.target.tagName === 'CANVAS') {
          e.preventDefault();
        }
      }, { passive: false });
    })();
  `;
};

/**
 * Wraps HTML content with scaling styles and scripts
 */
export const wrapHTMLWithScaling = (
  htmlContent: string, 
  config: GameScalingConfig
): string => {
  const scalingCSS = generateGameScalingCSS(config);
  const scalingJS = generateGameScalingJS(config);
  
  // Check if HTML already has head/body tags
  if (htmlContent.includes('<html') || htmlContent.includes('<!DOCTYPE')) {
    // Inject into existing HTML structure
    return htmlContent
      .replace('</head>', `<style>${scalingCSS}</style></head>`)
      .replace('</body>', `<script>${scalingJS}</script></body>`);
  } else {
    // Wrap raw content
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>${scalingCSS}</style>
      </head>
      <body>
        ${htmlContent}
        <script>${scalingJS}</script>
      </body>
      </html>
    `;
  }
};

/**
 * Detects game aspect ratio from various sources
 */
export const detectGameAspectRatio = (game: any): GameScalingConfig => {
  // Check for explicit metadata
  if (game.aspectRatio) {
    const [width, height] = game.aspectRatio.split(':').map(Number);
    return {
      nativeWidth: width * 120, // Scale up to pixels
      nativeHeight: height * 120,
    };
  }
  
  // Check for resolution in metadata
  if (game.metadata?.resolution) {
    const match = game.metadata.resolution.match(/(\d+)x(\d+)/);
    if (match) {
      return {
        nativeWidth: parseInt(match[1], 10),
        nativeHeight: parseInt(match[2], 10),
      };
    }
  }
  
  // Genre-based defaults
  switch (game.genre?.toLowerCase()) {
    case 'mobile':
    case 'casual':
      return { nativeWidth: 1080, nativeHeight: 1920 }; // 9:16 portrait
    case 'arcade':
    case 'retro':
      return { nativeWidth: 1024, nativeHeight: 768 }; // 4:3
    case 'racing':
    case 'shooter':
      return { nativeWidth: 1920, nativeHeight: 1080 }; // 16:9
    default:
      return { nativeWidth: 1920, nativeHeight: 1080 }; // Default 16:9
  }
};