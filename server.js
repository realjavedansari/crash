const WebSocket = require('ws');

// Create a new WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

// Game variables
let gameState = 'playing';
let rocketPosition = 1;
let crashedPosition = 0;
let waitingTime = 5000;
let crashedWaitingTime = 3000; 
let startTime = 0;
let remainingTime = 0;

const rocketPositionInterval = setInterval(() => {
  //calculate rocketPosition Seperately here at a fixed rate
  if (gameState === 'playing') {
    if (rocketPosition < 2) {
      rocketPosition *= 1.005;
    } else {
      rocketPosition *= 1.011;
    }
  }
},25);

// Game loop interval (500ms) (sends data to clients)
const gameLoopInterval = setInterval(() => {
  // Update game state and data
  if (gameState === 'playing') {
    if (crashedPosition === 0) {
      // Initialize crashed position
      crashedPosition = generatePositionData();
    } else {
      // Calculate new rocket position
      // happens elsewhere

      // Check if rocket reached crashed position
      if (rocketPosition >= crashedPosition) {
        gameState = 'crashed';
        startTime = Date.now(); // Record the start time
		
		rocketPosition = crashedPosition; //formality so rocket doesn't go further than crashedPosition
      }
    }
  } else if (gameState === 'crashed') {
    const elapsedTime = Date.now() - startTime;
    remainingTime = crashedWaitingTime - elapsedTime;

    if (remainingTime <= 0) {
      gameState = 'waiting';
      rocketPosition = 0;
      crashedPosition = 0;
      startTime = Date.now(); // Record the start time for the waiting state
	  waitingTime = 0; //formality so it looks nice
    }
  } else if (gameState === 'waiting') {
    const elapsedTime = Date.now() - startTime;
    remainingTime = waitingTime - elapsedTime;

    if (remainingTime <= 0) {
      gameState = 'playing';
      rocketPosition = 1;
	  waitingTime = 0; //formality so it looks nice
    }
  }

  // Send game state and data to all connected players
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      const gameUpdate = {
        gameState,
        rocketPosition,
        crashedPosition,
        remainingTime,
      };
      client.send(JSON.stringify(gameUpdate), (error) => {
        if (error) {
          console.error('Error sending game update:', error);
        }
      });
    }
  });
}, 25);

// WebSocket connection opened
wss.on('connection', function connection(ws) {
  console.log('New client connected');

  // Send initial game state and data to the connected player
  const gameUpdate = {
    gameState,
    rocketPosition,
    crashedPosition,
    remainingTime: waitingTime,
  };
  ws.send(JSON.stringify(gameUpdate), (error) => {
    if (error) {
      console.error('Error sending initial game state:', error);
    }
  });

  // WebSocket message received
  ws.on('message', function incoming(message) {
    console.log('Received message from client:', message);
    // You can handle incoming messages from the client here
  });

  // WebSocket connection closed
  ws.on('close', function close() {
    console.log('Client disconnected');
  });
});

// Generate random position data up to 3
function generatePositionData() {
  return Math.random() * 1 + 1;
}

