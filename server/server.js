const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3001;

// Load car data - try both possible paths
let carsData;
const carsPath1 = path.join(__dirname, '../cars.json');
const carsPath2 = path.join(__dirname, '../../cars.json');

if (fs.existsSync(carsPath1)) {
    carsData = JSON.parse(fs.readFileSync(carsPath1, 'utf8'));
    console.log('Loaded cars from:', carsPath1);
} else if (fs.existsSync(carsPath2)) {
    carsData = JSON.parse(fs.readFileSync(carsPath2, 'utf8'));
    console.log('Loaded cars from:', carsPath2);
} else {
    console.error('Cars data not found! Checked:', carsPath1, carsPath2);
    process.exit(1);
}

// Game state storage
const rooms = new Map();
const players = new Map(); // socketId -> player info

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files - try both possible paths
const clientPath1 = path.join(__dirname, '../client');
const clientPath2 = path.join(__dirname, '../../client');

if (fs.existsSync(clientPath1)) {
    app.use(express.static(clientPath1));
    console.log('Serving client from:', clientPath1);
} else if (fs.existsSync(clientPath2)) {
    app.use(express.static(clientPath2));
    console.log('Serving client from:', clientPath2);
} else {
    console.log('Client directory not found! Checked:', clientPath1, clientPath2);
}

// Utility functions
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function createNewGame(roomId, playerIds) {
    const shuffledCards = shuffleArray(carsData.cards.map(card => card.id));
    
    // Remove one random card if total is odd to ensure equal distribution
    let gameCards = shuffledCards;
    if (shuffledCards.length % 2 === 1) {
        gameCards = shuffledCards.slice(0, -1);
    }
    
    // Split equally between players
    const midPoint = gameCards.length / 2;
    const playerADeck = gameCards.slice(0, midPoint);
    const playerBDeck = gameCards.slice(midPoint);
    
    return {
        id: roomId,
        players: {
            [playerIds[0]]: { 
                id: playerIds[0], 
                name: players.get(playerIds[0])?.name || 'Jogador 1', 
                deck: playerADeck,
                connected: true
            },
            [playerIds[1]]: { 
                id: playerIds[1], 
                name: players.get(playerIds[1])?.name || 'Jogador 2', 
                deck: playerBDeck,
                connected: true
            }
        },
        turnPlayerId: playerIds[0],
        phase: 'SETUP',
        pot: [],
        lastRound: null,
        history: [],
        excludedCard: shuffledCards.length % 2 === 1 ? shuffledCards[shuffledCards.length - 1] : null,
        createdAt: Date.now()
    };
}

function getCardById(cardId) {
    return carsData.cards.find(card => card.id === cardId);
}

function compareCards(cardA, cardB, attribute) {
    const attrConfig = carsData.attributes[attribute];
    const valueA = cardA.attrs[attribute];
    const valueB = cardB.attrs[attribute];
    
    if (attrConfig.direction === 'max') {
        return valueA > valueB ? 'A' : valueA < valueB ? 'B' : null;
    } else {
        return valueA < valueB ? 'A' : valueA > valueB ? 'B' : null;
    }
}

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function cleanupInactiveRooms() {
    const now = Date.now();
    const ROOM_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    
    for (const [roomId, room] of rooms.entries()) {
        if (now - room.createdAt > ROOM_TIMEOUT) {
            rooms.delete(roomId);
            console.log(`Cleaned up inactive room: ${roomId}`);
        }
    }
}

// Cleanup every 5 minutes
setInterval(cleanupInactiveRooms, 5 * 60 * 1000);

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    
    // Register player
    socket.on('register-player', (playerName) => {
        players.set(socket.id, {
            id: socket.id,
            name: playerName || `Player-${socket.id.substring(0, 6)}`,
            roomId: null
        });
        
        socket.emit('registered', {
            playerId: socket.id,
            playerName: players.get(socket.id).name
        });
    });
    
    // Create room
    socket.on('create-room', () => {
        const roomCode = generateRoomCode();
        const player = players.get(socket.id);
        
        if (!player) {
            socket.emit('error', 'Player not registered');
            return;
        }
        
        const room = {
            id: roomCode,
            players: [socket.id],
            game: null,
            phase: 'WAITING',
            createdAt: Date.now()
        };
        
        rooms.set(roomCode, room);
        player.roomId = roomCode;
        socket.join(roomCode);
        
        socket.emit('room-created', {
            roomCode,
            isHost: true
        });
        
        console.log(`Room created: ${roomCode} by ${player.name}`);
    });
    
    // Join room
    socket.on('join-room', (roomCode) => {
        const room = rooms.get(roomCode);
        const player = players.get(socket.id);
        
        if (!player) {
            socket.emit('error', 'Player not registered');
            return;
        }
        
        if (!room) {
            socket.emit('error', 'Room not found');
            return;
        }
        
        if (room.players.length >= 2) {
            socket.emit('error', 'Room is full');
            return;
        }
        
        if (room.players.includes(socket.id)) {
            socket.emit('error', 'Already in this room');
            return;
        }
        
        room.players.push(socket.id);
        player.roomId = roomCode;
        socket.join(roomCode);
        
        socket.emit('room-joined', {
            roomCode,
            isHost: false
        });
        
        // Notify both players
        io.to(roomCode).emit('player-joined', {
            playerCount: room.players.length,
            players: room.players.map(pid => ({
                id: pid,
                name: players.get(pid)?.name || 'Unknown'
            }))
        });
        
        // Start game if room is full
        if (room.players.length === 2) {
            room.game = createNewGame(roomCode, room.players);
            room.phase = 'IN_GAME';
            
            io.to(roomCode).emit('game-started', {
                gameState: room.game
            });
        }
        
        console.log(`Player ${player.name} joined room: ${roomCode}`);
    });
    
    // Get player's top card
    socket.on('get-top-card', () => {
        const player = players.get(socket.id);
        if (!player || !player.roomId) {
            socket.emit('error', 'Not in a room');
            return;
        }
        
        const room = rooms.get(player.roomId);
        if (!room || !room.game) {
            socket.emit('error', 'Game not found');
            return;
        }
        
        const gamePlayer = room.game.players[socket.id];
        if (!gamePlayer || gamePlayer.deck.length === 0) {
            socket.emit('error', 'No cards left');
            return;
        }
        
        const topCardId = gamePlayer.deck[0];
        const card = getCardById(topCardId);
        
        socket.emit('top-card', card);
    });
    
    // Select attribute
    socket.on('select-attribute', (attribute) => {
        const player = players.get(socket.id);
        if (!player || !player.roomId) {
            socket.emit('error', 'Not in a room');
            return;
        }
        
        const room = rooms.get(player.roomId);
        if (!room || !room.game) {
            socket.emit('error', 'Game not found');
            return;
        }
        
        if (room.game.turnPlayerId !== socket.id) {
            socket.emit('error', 'Not your turn');
            return;
        }
        
        if (!carsData.attributes[attribute]) {
            socket.emit('error', 'Invalid attribute');
            return;
        }
        
        const playerIds = Object.keys(room.game.players);
        const playerA = room.game.players[playerIds[0]];
        const playerB = room.game.players[playerIds[1]];
        
        if (playerA.deck.length === 0 || playerB.deck.length === 0) {
            room.game.phase = 'GAME_OVER';
            io.to(player.roomId).emit('game-over', room.game);
            return;
        }
        
        const cardA = getCardById(playerA.deck[0]);
        const cardB = getCardById(playerB.deck[0]);
        
        // Map socket IDs to A/B for comparison
        const socketToPlayer = {};
        socketToPlayer[playerIds[0]] = 'A';
        socketToPlayer[playerIds[1]] = 'B';
        
        const winnerId = compareCards(cardA, cardB, attribute);
        let winnerSocketId = null;
        
        if (winnerId === 'A') {
            winnerSocketId = playerIds[0];
        } else if (winnerId === 'B') {
            winnerSocketId = playerIds[1];
        }
        
        room.game.lastRound = {
            chosenAttr: attribute,
            cardsPlayed: { [playerIds[0]]: cardA.id, [playerIds[1]]: cardB.id },
            winnerId: winnerSocketId
        };
        
        room.game.phase = 'REVEAL';
        
        // Send reveal to both players
        io.to(player.roomId).emit('cards-revealed', {
            cardA,
            cardB,
            attribute,
            winnerId: winnerSocketId,
            values: {
                [playerIds[0]]: cardA.attrs[attribute],
                [playerIds[1]]: cardB.attrs[attribute]
            }
        });
    });
    
    // Resolve round
    socket.on('resolve-round', () => {
        const player = players.get(socket.id);
        if (!player || !player.roomId) {
            socket.emit('error', 'Not in a room');
            return;
        }
        
        const room = rooms.get(player.roomId);
        if (!room || !room.game || !room.game.lastRound) {
            socket.emit('error', 'No round to resolve');
            return;
        }
        
        const { winnerId } = room.game.lastRound;
        const playerIds = Object.keys(room.game.players);
        const playerA = room.game.players[playerIds[0]];
        const playerB = room.game.players[playerIds[1]];
        
        // Remove top cards from both players
        const cardA = playerA.deck.shift();
        const cardB = playerB.deck.shift();
        
        if (winnerId) {
            const winner = room.game.players[winnerId];
            
            // Add cards to end of winner's deck
            if (winnerId === playerIds[0]) {
                winner.deck.push(cardA, cardB, ...room.game.pot);
            } else {
                winner.deck.push(cardB, cardA, ...room.game.pot);
            }
            
            // Clear pot
            room.game.pot = [];
            
            // Winner becomes next turn player
            room.game.turnPlayerId = winnerId;
        } else {
            // Tie - cards go to pot
            room.game.pot.push(cardA, cardB);
            // Turn player stays the same
        }
        
        // Check if game is over
        if (playerA.deck.length === 0) {
            room.game.phase = 'GAME_OVER';
            room.game.winnerId = playerIds[1];
            io.to(player.roomId).emit('game-over', room.game);
        } else if (playerB.deck.length === 0) {
            room.game.phase = 'GAME_OVER';
            room.game.winnerId = playerIds[0];
            io.to(player.roomId).emit('game-over', room.game);
        } else {
            room.game.phase = 'WAITING_FOR_TURN';
            io.to(player.roomId).emit('round-resolved', {
                deckSizes: { 
                    [playerIds[0]]: playerA.deck.length, 
                    [playerIds[1]]: playerB.deck.length 
                },
                potSize: room.game.pot.length,
                nextTurnPlayerId: room.game.turnPlayerId
            });
        }
    });
    
    // Get game state
    socket.on('get-game-state', () => {
        const player = players.get(socket.id);
        if (!player || !player.roomId) {
            socket.emit('error', 'Not in a room');
            return;
        }
        
        const room = rooms.get(player.roomId);
        if (!room) {
            socket.emit('error', 'Room not found');
            return;
        }
        
        socket.emit('game-state', room.game);
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        
        const player = players.get(socket.id);
        if (player && player.roomId) {
            const room = rooms.get(player.roomId);
            if (room) {
                // Mark player as disconnected in game
                if (room.game && room.game.players[socket.id]) {
                    room.game.players[socket.id].connected = false;
                }
                
                // Remove from room players list
                room.players = room.players.filter(pid => pid !== socket.id);
                
                // Notify other players
                socket.to(player.roomId).emit('player-disconnected', {
                    playerId: socket.id,
                    playerName: player.name
                });
                
                // Clean up empty rooms
                if (room.players.length === 0) {
                    rooms.delete(player.roomId);
                    console.log(`Room ${player.roomId} deleted - no players left`);
                }
            }
        }
        
        players.delete(socket.id);
    });
});

// REST API routes
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        rooms: rooms.size,
        players: players.size 
    });
});

app.get('/api/attributes', (req, res) => {
    res.json(carsData.attributes);
});

app.get('/', (req, res) => {
    const indexPath1 = path.join(__dirname, '../client/index.html');
    const indexPath2 = path.join(__dirname, '../../client/index.html');
    
    if (fs.existsSync(indexPath1)) {
        res.sendFile(indexPath1);
    } else if (fs.existsSync(indexPath2)) {
        res.sendFile(indexPath2);
    } else {
        res.status(404).send(`
            <h1>Super Trunfo Online Server</h1>
            <p>Client files not found!</p>
            <p>Checked paths:</p>
            <ul>
                <li>${indexPath1}</li>
                <li>${indexPath2}</li>
            </ul>
            <p>Current directory: ${__dirname}</p>
        `);
    }
});

server.listen(PORT, () => {
    console.log(`Super Trunfo Online server running on port ${PORT}`);
});