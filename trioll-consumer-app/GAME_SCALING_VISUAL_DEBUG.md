# Game Scaling Visual Debug Simulation

## Current Behavior vs Expected Behavior

### Portrait Mode (1080x2340 screen example)

#### Current Behavior:
```
┌─────────────────────────────┐ ← Device Screen (1080x2340)
│                             │
│  ┌───────────────────────┐  │ ← GameContainer (letterboxed)
│  │                       │  │    Calculated: 1080x607.5
│  │  ┌─────────────────┐  │  │    (maintains 16:9 ratio)
│  │  │                 │  │  │
│  │  │   GAME CONTENT  │  │  │ ← WebView fills GameContainer
│  │  │   (small box)   │  │  │    Not full screen!
│  │  │                 │  │  │
│  │  └─────────────────┘  │  │
│  │                       │  │
│  └───────────────────────┘  │
│                             │
│        (black bars)         │
│                             │
└─────────────────────────────┘
```

#### Expected Behavior:
```
┌─────────────────────────────┐ ← Device Screen (1080x2340)
│ ┌─────────────────────────┐ │
│ │                         │ │
│ │                         │ │
│ │                         │ │
│ │     GAME CONTENT        │ │ ← Game fills entire screen
│ │    (full screen)        │ │    with proper scaling
│ │                         │ │
│ │                         │ │
│ │                         │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

### Landscape Mode (2340x1080 screen example)

#### Current Behavior:
```
┌────────────────────────────────────────────────────────┐ ← Device Screen (2340x1080)
│                                                        │
│    ┌────────────────────────────────────────────┐     │ ← GameContainer 
│    │  ┌──────────────────────────────────────┐  │     │    Creates letterbox
│    │  │          GAME CONTENT                │  │     │
│    │  │         (constrained)                │  │     │
│    │  └──────────────────────────────────────┘  │     │
│    └────────────────────────────────────────────┘     │
│                                                        │
└────────────────────────────────────────────────────────┘
```

## Dimension Calculations Trace

### Step 1: Screen Detection (TrialPlayerScreen)
```javascript
screenWidth = 1080
screenHeight = 2340
isPortrait = true
```

### Step 2: Game Aspect Ratio Detection
```javascript
// detectGameAspectRatio returns:
{
  nativeWidth: 1920,   // Default 16:9 game
  nativeHeight: 1080
}
```

### Step 3: GameContainer Layout Event
```javascript
// GameContainer onLayout receives:
containerLayout = {
  width: 1080,   // Full screen width
  height: 2340   // Full screen height
}

// Calculates letterbox:
containerAspectRatio = 1080/2340 = 0.46
gameAspectRatio = 1920/1080 = 1.78

// Since container is taller (0.46 < 1.78):
gameWidth = 1080  // Full width
gameHeight = 1080 / 1.78 = 607.5  // Reduced height!
y = (2340 - 607.5) / 2 = 866.25  // Centered vertically
```

### Step 4: WebView Rendering
```javascript
// WebView gets constrained to GameContainer size:
WebView dimensions = {
  width: 1080,
  height: 607.5  // Only 26% of screen height!
}
```

### Step 5: Injected JavaScript
```javascript
// Tries to scale within already small WebView:
viewportWidth = 1080   // WebView width, not screen
viewportHeight = 607.5 // WebView height, not screen
// Game is already constrained!
```

## The Problem Visualized

```
SCALING CASCADE:
Screen (2340px tall)
  ↓
GameContainer (letterboxes to 607.5px tall)
  ↓
WebView (fills GameContainer: 607.5px)
  ↓
Game Content (scales within 607.5px)
  
Result: Game uses only 26% of screen height!
```

## Why This Happens

1. **GameContainer** assumes games should maintain exact aspect ratio
2. **Portrait screens** have very different aspect ratio than landscape games
3. **Letterboxing** dramatically reduces usable space
4. **WebView** can't break out of its container bounds

## Solution Approaches

### Approach 1: Fill Mode (Recommended)
```javascript
// In GameContainer, add fill mode:
if (fillScreen) {
  // Don't letterbox, use full screen
  gameWidth = containerLayout.width;
  gameHeight = containerLayout.height;
  x = 0;
  y = 0;
}
```

### Approach 2: Smart Scaling
```javascript
// Allow slight aspect ratio deviation for better fit
const maxAspectDeviation = 0.2; // 20% tolerance
const scale = Math.max(scaleX, scaleY); // Cover instead of contain
```

### Approach 3: Direct WebView Rendering
```javascript
// Skip GameContainer entirely for trials
<View style={StyleSheet.absoluteFillObject}>
  <WebView 
    style={StyleSheet.absoluteFillObject}
    // Let WebView handle all scaling
  />
</View>
```

## Impact Analysis

Current implementation wastes:
- **Portrait**: ~74% of screen space
- **Landscape**: ~30% of screen space

This explains why games appear in a "small box" rather than filling the screen!