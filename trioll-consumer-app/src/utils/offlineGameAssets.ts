import type { Game } from '../types/api.types';
/**
 * Offline Game Assets
 * Provides local game data when network is unavailable
 */

/**
 * Evolution Runner game data for offline mode
 * Uses base64 encoded thumbnail to avoid network requests
 */
export const OFFLINE_EVOLUTION_RUNNER: Game = {
  id: 'evolution-runner-001',
  title: 'Evolution Runner',
  description: 'Run, jump, and evolve through different eras of time in this endless runner.',
  genre: 'Endless Runner',
  tags: ['Action', 'Casual', 'Endless'],
  rating: 4.5,
  downloadSize: '50MB',
  minAge: 0,
  developer: 'Trioll Studios',
  publisherName: 'Trioll Studios',
  releaseDate: new Date().toISOString(),
  price: 0,
  trailerUrl: '',
  // Use a simple colored rectangle as thumbnail when offline
  thumbnailUrl:
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzYzNjZmMSIvPgogIDx0ZXh0IHg9IjE1MCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5Fdm9sdXRpb24gUnVubmVyPC90ZXh0Pgo8L3N2Zz4=',
  coverImage:
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iIzYzNjZmMSIvPgogIDx0ZXh0IHg9IjMwMCIgeT0iMjAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMzYiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5Fdm9sdXRpb24gUnVubmVyPC90ZXh0Pgo8L3N2Zz4=',
  isNew: true,
  isTrending: true,
  // Use local HTML for offline play
  trialUrl: 'offline://evolution-runner',
  screenshots: [],
  platforms: ["all"],
  // trialDuration: 180, // 3 minutes
};

/**
 * Offline HTML5 game content
 * A simple game that can be played without network
 */
export const OFFLINE_GAME_HTML = `<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Evolution Runner - Offline Mode</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background: #1a1a2e;
            color: white;
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            overflow: hidden;
        }
        #game-container {
            text-align: center;
            padding: 20px;
        }
        h1 {
            color: #6366f1;
            margin-bottom: 20px;
        }
        #game-canvas {
            border: 2px solid #6366f1;
            background: #0a0a0f;
            margin: 20px 0;
        }
        #score {
            font-size: 24px;
            margin: 10px 0;
        }
        #status {
            color: #FF2D55;
            margin: 20px 0;
        }
        button {
            background: #6366f1;
            color: white;
            border: none;
            padding: 10px 20px;
            font-size: 18px;
            border-radius: 5px;
            cursor: pointer;
            margin: 5px;
        }
        button:active {
            background: #4c4fdb;
        }
    </style>
</head>
<body>
    <div id="game-container">
        <h1>Evolution Runner</h1>
        <div id="status">⚠️ Playing in Offline Mode</div>
        <canvas id="game-canvas" width="300" height="400"></canvas>
        <div id="score">Score: 0</div>
        <div>
            <button onclick="jump()">JUMP</button>
            <button onclick="restart()">RESTART</button>
        </div>
    </div>

    <script>
        // Simple offline game logic
        const canvas = document.getElementById('game-canvas');
        const ctx = canvas.getContext('2d');
        let score = 0;
        let playerY = 300;
        let velocity = 0;
        let isJumping = false;
        let obstacles = [];
        let gameRunning = true;

        // Player
        function drawPlayer() {
            ctx.fillStyle = '#00FF88';
            ctx.fillRect(50, playerY, 30, 30);
        }

        // Obstacles
        function createObstacle() {
            obstacles.push({
                x: canvas.width,
                y: 330,
                width: 20,
                height: 30
            });
        }

        function drawObstacles() {
            ctx.fillStyle = '#FF2D55';
            obstacles.forEach(obstacle => {
                ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            });
        }

        function updateObstacles() {
            obstacles = obstacles.filter(obstacle => {
                obstacle.x -= 3;
                return obstacle.x > -20;
            });

            // Check collisions
            obstacles.forEach(obstacle => {
                if (obstacle.x < 80 && obstacle.x > 20 && playerY > 300) {
                    gameOver();
                }
            });
        }

        // Game functions
        function jump() {
            if (!isJumping && gameRunning) {
                velocity = -10;
                isJumping = true;
                
                // Send message to React Native
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'gameEvent',
                        event: 'jump'
                    }));
                }
            }
        }

        function update() {
            if (!gameRunning) return;

            // Clear canvas
            ctx.fillStyle = '#0a0a0f';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Update player
            if (isJumping) {
                playerY += velocity;
                velocity += 0.5;

                if (playerY >= 300) {
                    playerY = 300;
                    isJumping = false;
                    velocity = 0;
                }
            }

            // Update game
            updateObstacles();
            drawPlayer();
            drawObstacles();

            // Update score
            score++;
            document.getElementById('score').textContent = 'Score: ' + score;

            // Create new obstacles
            if (Math.random() < 0.02) {
                createObstacle();
            }
        }

        function gameOver() {
            gameRunning = false;
            ctx.fillStyle = '#FF2D55';
            ctx.font = '30px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
            
            // Send score to React Native
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'gameOver',
                    score: score
                }));
            }
        }

        function restart() {
            score = 0;
            playerY = 300;
            velocity = 0;
            isJumping = false;
            obstacles = [];
            gameRunning = true;
            
            // Send message to React Native
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'gameEvent',
                    event: 'restart'
                }));
            }
        }

        // Game loop
        setInterval(update, 1000 / 60);

        // Start message
        if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'gameReady',
                message: 'Offline game loaded'
            }));
        }
    </script>
</body>
</html>`;

/**
 * Check if a URL is for offline content
 */
export const isOfflineUrl = (url: string): boolean => {
  return url.startsWith('offline://') || url.startsWith('data:');
};

/**
 * Get offline content for a game
 */
export const getOfflineGameContent = (_gameId: string): string => {
  // For now, return the same game for all offline requests
  return OFFLINE_GAME_HTML;
};
