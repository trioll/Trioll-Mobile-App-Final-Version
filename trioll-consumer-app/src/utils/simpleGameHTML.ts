
export const simpleGameHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
        body {
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #1a1a2e, #16213e);
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            font-family: Arial, sans-serif;
            overflow: hidden;
            touch-action: none;
        }
        #game {
            width: 100%;
            height: 100%;
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        #score {
            position: absolute;
            top: 20px;
            left: 20px;
            color: white;
            font-size: 24px;
            font-weight: bold;
            text-shadow: 0 0 10px rgba(255,255,255,0.5);
        }
        #title {
            color: white;
            font-size: 32px;
            margin-bottom: 20px;
            text-shadow: 0 0 20px rgba(0,255,136,0.5);
        }
        #play-area {
            width: 300px;
            height: 300px;
            border: 2px solid #00FF88;
            border-radius: 20px;
            position: relative;
            box-shadow: 0 0 30px rgba(0,255,136,0.3);
            background: rgba(0,0,0,0.3);
        }
        .target {
            width: 60px;
            height: 60px;
            background: radial-gradient(circle, #00FF88, #00CC66);
            border-radius: 50%;
            position: absolute;
            cursor: pointer;
            box-shadow: 0 0 20px #00FF88;
            transition: transform 0.2s;
        }
        .target:active {
            transform: scale(0.9);
        }
        #message {
            color: white;
            margin-top: 20px;
            font-size: 18px;
            text-align: center;
        }
        #start-btn {
            background: linear-gradient(45deg, #6366f1, #8b5cf6);
            color: white;
            border: none;
            padding: 15px 40px;
            font-size: 18px;
            border-radius: 25px;
            cursor: pointer;
            margin-top: 20px;
            box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
        }
    </style>
</head>
<body>
    <div id="game">
        <div id="score">Score: 0</div>
        <h1 id="title">Evolution Runner</h1>
        <div id="play-area"></div>
        <div id="message">Tap the green circles to score!</div>
        <button id="start-btn" onclick="startGame()">Start Game</button>
    </div>

    <script>
        let score = 0;
        let gameActive = false;
        let level = 1;

        function sendToReactNative(type, data) {
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type, ...data }));
            }
        }

        function updateScore(points) {
            score += points;
            document.getElementById('score').textContent = 'Score: ' + score;
            sendToReactNative('score', { value: score });
            
            if (score > 0 && score % 50 === 0) {
                level++;
                sendToReactNative('level', { level });
                document.getElementById('message').textContent = 'Level ' + level + '! Speed increased!';
            }
        }

        function createTarget() {
            if (!gameActive) return;
            
            const playArea = document.getElementById('play-area');
            const target = document.createElement('div');
            target.className = 'target';
            
            const maxX = playArea.offsetWidth - 60;
            const maxY = playArea.offsetHeight - 60;
            target.style.left = Math.random() * maxX + 'px';
            target.style.top = Math.random() * maxY + 'px';
            
            target.onclick = function() {
                updateScore(10);
                target.remove();
            };
            
            playArea.appendChild(target);
            
            // Remove target after some time
            setTimeout(() => {
                if (target.parentNode) {
                    target.remove();
                }
            }, 2000 - (level * 100));
            
            // Create next target
            setTimeout(createTarget, 1500 - (level * 50));
        }

        function startGame() {
            score = 0;
            level = 1;
            gameActive = true;
            document.getElementById('score').textContent = 'Score: 0';
            document.getElementById('message').textContent = 'Tap the green circles to score!';
            document.getElementById('start-btn').style.display = 'none';
            document.getElementById('play-area').innerHTML = '';
            
            sendToReactNative('score', { value: 0 });
            sendToReactNative('level', { level: 1 });
            
            createTarget();
        }

        function endGame() {
            gameActive = false;
            document.getElementById('message').textContent = 'Game Over! Final Score: ' + score;
            document.getElementById('start-btn').style.display = 'block';
            document.getElementById('start-btn').textContent = 'Play Again';
        }

        // Auto-start
        window.onload = function() {
            document.getElementById('message').textContent = 'Tap Start to begin!';
        };
    </script>
</body>
</html>
`;
