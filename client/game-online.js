class SuperTrunfoOnline {
    constructor() {
        this.socket = null;
        this.playerId = null;
        this.playerName = null;
        this.roomCode = null;
        this.gameState = null;
        this.attributes = null;
        this.currentPhase = 'WELCOME';
        
        this.initializeElements();
        this.attachEventListeners();
        this.loadAttributes();
    }

    async loadAttributes() {
        try {
            const response = await fetch('/api/attributes');
            this.attributes = await response.json();
        } catch (error) {
            console.error('Error loading attributes:', error);
        }
    }

    initializeElements() {
        // Screens
        this.welcomeScreen = document.getElementById('welcome-screen');
        this.lobbyScreen = document.getElementById('lobby-screen');
        this.roomScreen = document.getElementById('room-screen');
        this.gameScreen = document.getElementById('game-screen');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.loadingOverlay = document.getElementById('loading');
        this.errorModal = document.getElementById('error-modal');
        
        // Welcome elements
        this.playerNameInput = document.getElementById('player-name');
        this.registerBtn = document.getElementById('register-btn');
        
        // Lobby elements
        this.currentPlayerNameSpan = document.getElementById('current-player-name');
        this.createRoomBtn = document.getElementById('create-room-btn');
        this.roomCodeInput = document.getElementById('room-code');
        this.joinRoomBtn = document.getElementById('join-room-btn');
        
        // Room elements
        this.roomCodeDisplay = document.getElementById('room-code-display');
        this.copyCodeBtn = document.getElementById('copy-code-btn');
        this.leaveRoomBtn = document.getElementById('leave-room-btn');
        this.player1Slot = document.getElementById('player-1-slot');
        this.player2Slot = document.getElementById('player-2-slot');
        this.roomStatusText = document.getElementById('room-status-text');
        
        // Game elements
        this.opponentInfo = document.getElementById('opponent-info');
        this.potInfo = document.getElementById('pot-info');
        this.myInfo = document.getElementById('my-info');
        this.turnIndicator = document.getElementById('turn-indicator');
        this.connectionStatus = document.getElementById('connection-status');
        
        // Game phases
        this.waitingTurn = document.getElementById('waiting-turn');
        this.cardSelection = document.getElementById('card-selection');
        this.cardReveal = document.getElementById('card-reveal');
        
        // Card elements
        this.currentCard = document.getElementById('current-card');
        this.cardName = document.getElementById('card-name');
        this.cardImg = document.getElementById('card-img');
        this.nextRoundBtn = document.getElementById('next-round-btn');
        
        // Reveal elements
        this.myCardName = document.getElementById('my-card-name');
        this.myCardImg = document.getElementById('my-card-img');
        this.opponentCardName = document.getElementById('opponent-card-name');
        this.opponentCardImg = document.getElementById('opponent-card-img');
        this.resultText = document.getElementById('result-text');
        
        // Game over elements
        this.winnerText = document.getElementById('winner-text');
        this.finalStatsText = document.getElementById('final-stats-text');
        this.playAgainBtn = document.getElementById('play-again-btn');
        this.backToLobbyBtn = document.getElementById('back-to-lobby-btn');
        
        // Error elements
        this.errorMessage = document.getElementById('error-message');
        this.errorCloseBtn = document.getElementById('error-close-btn');
        this.loadingText = document.getElementById('loading-text');
    }

    attachEventListeners() {
        // Welcome screen
        this.registerBtn.addEventListener('click', () => this.registerPlayer());
        this.playerNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.registerPlayer();
        });
        
        // Lobby screen
        this.createRoomBtn.addEventListener('click', () => this.createRoom());
        this.joinRoomBtn.addEventListener('click', () => this.joinRoom());
        this.roomCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });
        
        // Room screen
        this.copyCodeBtn.addEventListener('click', () => this.copyRoomCode());
        this.leaveRoomBtn.addEventListener('click', () => this.leaveRoom());
        
        // Game screen
        this.currentCard.addEventListener('click', (e) => {
            const attributeRow = e.target.closest('.attribute-row');
            if (attributeRow && this.currentPhase === 'MY_TURN') {
                const attribute = attributeRow.dataset.attr;
                this.selectAttribute(attribute);
            }
        });
        
        this.nextRoundBtn.addEventListener('click', () => this.nextRound());
        
        // Game over screen
        this.playAgainBtn.addEventListener('click', () => this.playAgain());
        this.backToLobbyBtn.addEventListener('click', () => this.backToLobby());
        
        // Error modal
        this.errorCloseBtn.addEventListener('click', () => this.hideError());
    }

    connectToServer() {
        this.showLoading('Conectando ao servidor...');
        
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.updateConnectionStatus(true);
            this.hideLoading();
        });
        
        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.updateConnectionStatus(false);
            this.showError('Conexão perdida com o servidor');
        });
        
        this.socket.on('registered', (data) => {
            this.playerId = data.playerId;
            this.playerName = data.playerName;
            this.showLobby();
        });
        
        this.socket.on('room-created', (data) => {
            this.roomCode = data.roomCode;
            this.showRoom(data.isHost);
        });
        
        this.socket.on('room-joined', (data) => {
            this.roomCode = data.roomCode;
            this.showRoom(data.isHost);
        });
        
        this.socket.on('player-joined', (data) => {
            this.updatePlayersInRoom(data.players);
            if (data.playerCount === 2) {
                this.roomStatusText.textContent = 'Iniciando jogo...';
            }
        });
        
        this.socket.on('game-started', (data) => {
            this.gameState = data.gameState;
            this.showGame();
        });
        
        this.socket.on('top-card', (card) => {
            this.displayMyCard(card);
            this.currentPhase = 'MY_TURN';
            this.showCardSelection();
        });
        
        this.socket.on('cards-revealed', (data) => {
            this.showCardReveal(data);
        });
        
        this.socket.on('round-resolved', (data) => {
            this.updateGameStats(data);
            this.checkNextTurn(data.nextTurnPlayerId);
        });
        
        this.socket.on('game-over', (gameState) => {
            this.showGameOver(gameState);
        });
        
        this.socket.on('player-disconnected', (data) => {
            this.showError(`${data.playerName} se desconectou`);
        });
        
        this.socket.on('error', (message) => {
            this.showError(message);
        });
    }

    registerPlayer() {
        const name = this.playerNameInput.value.trim();
        if (!name) {
            this.showError('Por favor, digite seu nome');
            return;
        }
        
        this.connectToServer();
        this.socket.emit('register-player', name);
    }

    createRoom() {
        this.showLoading('Criando sala...');
        this.socket.emit('create-room');
    }

    joinRoom() {
        const code = this.roomCodeInput.value.trim().toUpperCase();
        if (!code) {
            this.showError('Por favor, digite o código da sala');
            return;
        }
        
        this.showLoading('Entrando na sala...');
        this.socket.emit('join-room', code);
    }

    leaveRoom() {
        this.backToLobby();
    }

    copyRoomCode() {
        navigator.clipboard.writeText(this.roomCode).then(() => {
            this.copyCodeBtn.textContent = 'Copiado!';
            setTimeout(() => {
                this.copyCodeBtn.textContent = 'Copiar Código';
            }, 2000);
        });
    }

    selectAttribute(attribute) {
        if (this.currentPhase !== 'MY_TURN') return;
        
        // Highlight selected attribute
        const attributeRows = this.currentCard.querySelectorAll('.attribute-row');
        attributeRows.forEach(row => row.classList.remove('selected'));
        
        const selectedRow = this.currentCard.querySelector(`[data-attr="${attribute}"]`);
        if (selectedRow) {
            selectedRow.classList.add('selected');
        }
        
        this.showLoading('Aguardando oponente...');
        this.socket.emit('select-attribute', attribute);
        this.currentPhase = 'WAITING_REVEAL';
    }

    nextRound() {
        this.showLoading('Resolvendo rodada...');
        this.socket.emit('resolve-round');
    }

    playAgain() {
        this.backToLobby();
    }

    backToLobby() {
        this.roomCode = null;
        this.gameState = null;
        this.currentPhase = 'LOBBY';
        this.showLobby();
    }

    // UI Methods
    showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        
        const targetScreen = document.getElementById(`${screenName}-screen`);
        if (targetScreen) {
            targetScreen.classList.remove('hidden');
        }
    }

    showLobby() {
        this.currentPlayerNameSpan.textContent = this.playerName;
        this.roomCodeInput.value = '';
        this.showScreen('lobby');
        this.hideLoading();
    }

    showRoom(isHost) {
        this.roomCodeDisplay.textContent = this.roomCode;
        this.updatePlayersInRoom([{ id: this.playerId, name: this.playerName }]);
        this.roomStatusText.textContent = isHost ? 
            'Compartilhe o código com um amigo' : 
            'Aguardando outro jogador...';
        this.showScreen('room');
        this.hideLoading();
    }

    showGame() {
        this.updateGameDisplay();
        this.showScreen('game');
        this.hideLoading();
        
        // Request my top card if it's my turn
        if (this.gameState.turnPlayerId === this.playerId) {
            this.socket.emit('get-top-card');
        } else {
            this.showWaitingTurn();
        }
    }

    showWaitingTurn() {
        this.currentPhase = 'WAITING_TURN';
        this.waitingTurn.classList.remove('hidden');
        this.cardSelection.classList.add('hidden');
        this.cardReveal.classList.add('hidden');
    }

    showCardSelection() {
        this.currentPhase = 'MY_TURN';
        this.waitingTurn.classList.add('hidden');
        this.cardSelection.classList.remove('hidden');
        this.cardReveal.classList.add('hidden');
        this.hideLoading();
    }

    showCardReveal(data) {
        this.currentPhase = 'REVEAL';
        
        // Determine which card is mine and which is opponent's
        const playerIds = Object.keys(this.gameState.players);
        const isPlayerA = playerIds[0] === this.playerId;
        
        const myCard = isPlayerA ? data.cardA : data.cardB;
        const opponentCard = isPlayerA ? data.cardB : data.cardA;
        const myValue = data.values[this.playerId];
        const opponentId = playerIds.find(id => id !== this.playerId);
        const opponentValue = data.values[opponentId];
        
        this.displayRevealCard('my', myCard);
        this.displayRevealCard('opponent', opponentCard);
        
        // Highlight chosen attribute and show result
        this.highlightChosenAttribute(data.attribute, myValue, opponentValue, data.winnerId);
        this.showResult(data.winnerId);
        
        this.waitingTurn.classList.add('hidden');
        this.cardSelection.classList.add('hidden');
        this.cardReveal.classList.remove('hidden');
        this.hideLoading();
    }

    showGameOver(gameState) {
        this.currentPhase = 'GAME_OVER';
        
        const playerIds = Object.keys(gameState.players);
        const winnerId = gameState.winnerId;
        const isWinner = winnerId === this.playerId;
        
        this.winnerText.textContent = isWinner ? 'Você Venceu!' : 'Você Perdeu!';
        
        const myCards = gameState.players[this.playerId].deck.length;
        const opponentId = playerIds.find(id => id !== this.playerId);
        const opponentCards = gameState.players[opponentId].deck.length;
        
        this.finalStatsText.innerHTML = `
            <strong>Resultado Final:</strong><br>
            Suas cartas: ${myCards}<br>
            Cartas do oponente: ${opponentCards}<br>
            Cartas no pot: ${gameState.pot.length}
        `;
        
        this.showScreen('game-over');
    }

    updateGameDisplay() {
        if (!this.gameState) return;
        
        const playerIds = Object.keys(this.gameState.players);
        const opponentId = playerIds.find(id => id !== this.playerId);
        const myPlayer = this.gameState.players[this.playerId];
        const opponent = this.gameState.players[opponentId];
        
        this.myInfo.textContent = `Você: ${myPlayer.deck.length} cartas`;
        this.opponentInfo.textContent = `Oponente: ${opponent.deck.length} cartas`;
        
        let potText = `Pot: ${this.gameState.pot.length} cartas`;
        if (this.gameState.excludedCard) {
            potText += ` | 1 carta excluída`;
        }
        this.potInfo.textContent = potText;
        
        const isMyTurn = this.gameState.turnPlayerId === this.playerId;
        this.turnIndicator.textContent = isMyTurn ? 'Sua vez!' : 'Vez do oponente';
    }

    updateGameStats(data) {
        const playerIds = Object.keys(this.gameState.players);
        const opponentId = playerIds.find(id => id !== this.playerId);
        
        this.gameState.players[this.playerId].deck.length = data.deckSizes[this.playerId];
        this.gameState.players[opponentId].deck.length = data.deckSizes[opponentId];
        this.gameState.pot.length = data.potSize;
        this.gameState.turnPlayerId = data.nextTurnPlayerId;
        
        this.updateGameDisplay();
    }

    checkNextTurn(nextTurnPlayerId) {
        if (nextTurnPlayerId === this.playerId) {
            setTimeout(() => {
                this.socket.emit('get-top-card');
            }, 1000);
        } else {
            setTimeout(() => {
                this.showWaitingTurn();
            }, 1000);
        }
    }

    updatePlayersInRoom(players) {
        // Reset slots
        this.player1Slot.classList.remove('filled');
        this.player2Slot.classList.remove('filled');
        
        const slot1Name = this.player1Slot.querySelector('.player-name');
        const slot2Name = this.player2Slot.querySelector('.player-name');
        const slot1Status = this.player1Slot.querySelector('.player-status');
        const slot2Status = this.player2Slot.querySelector('.player-status');
        
        slot1Name.textContent = 'Aguardando...';
        slot2Name.textContent = 'Aguardando...';
        slot1Status.className = 'player-status waiting';
        slot2Status.className = 'player-status waiting';
        
        // Fill slots with players
        players.forEach((player, index) => {
            const slot = index === 0 ? this.player1Slot : this.player2Slot;
            const nameSpan = slot.querySelector('.player-name');
            const statusSpan = slot.querySelector('.player-status');
            
            slot.classList.add('filled');
            nameSpan.textContent = player.name;
            statusSpan.className = 'player-status ready';
        });
    }

    displayMyCard(card) {
        this.cardName.textContent = card.name;
        this.cardImg.src = card.imageUrl;
        this.cardImg.alt = card.name;
        
        // Update attribute values
        const attributeRows = this.currentCard.querySelectorAll('.attribute-row');
        attributeRows.forEach(row => {
            const attr = row.dataset.attr;
            const value = card.attrs[attr];
            const valueSpan = row.querySelector('.attr-value');
            
            // Format value based on attribute
            let formattedValue = value;
            if (attr === 'maxSpeed') {
                formattedValue = `${value} km/h`;
            } else if (attr === 'power') {
                formattedValue = `${value} HP`;
            } else if (attr === 'acceleration') {
                formattedValue = `${value} s`;
            } else if (attr === 'displacement') {
                formattedValue = value === 0 ? 'Elétrico' : `${value} cc`;
            } else if (attr === 'weight') {
                formattedValue = `${value} kg`;
            }
            
            valueSpan.textContent = formattedValue;
            
            // Update attribute name
            if (this.attributes && this.attributes[attr]) {
                const nameSpan = row.querySelector('.attr-name');
                nameSpan.textContent = this.attributes[attr].name;
            }
        });
        
        // Clear previous selections
        attributeRows.forEach(row => {
            row.classList.remove('selected');
        });
    }

    displayRevealCard(playerType, card) {
        const nameElement = document.getElementById(`${playerType}-card-name`);
        const imgElement = document.getElementById(`${playerType}-card-img`);
        
        nameElement.textContent = card.name;
        imgElement.src = card.imageUrl;
        imgElement.alt = card.name;
        
        // Update attribute values
        Object.keys(card.attrs).forEach(attr => {
            const attrElement = document.getElementById(`${playerType}-attr-${attr}`);
            if (attrElement) {
                const value = card.attrs[attr];
                const valueSpan = attrElement.querySelector('.attr-value');
                
                // Format value
                let formattedValue = value;
                if (attr === 'maxSpeed') {
                    formattedValue = `${value} km/h`;
                } else if (attr === 'power') {
                    formattedValue = `${value} HP`;
                } else if (attr === 'acceleration') {
                    formattedValue = `${value} s`;
                } else if (attr === 'displacement') {
                    formattedValue = value === 0 ? 'Elétrico' : `${value} cc`;
                } else if (attr === 'weight') {
                    formattedValue = `${value} kg`;
                }
                
                valueSpan.textContent = formattedValue;
            }
        });
    }

    highlightChosenAttribute(attribute, myValue, opponentValue, winnerId) {
        // Clear previous highlights
        document.querySelectorAll('.attribute-row').forEach(row => {
            row.classList.remove('selected', 'winner', 'loser');
        });
        
        // Highlight chosen attribute
        const myAttrElement = document.getElementById(`my-attr-${attribute}`);
        const opponentAttrElement = document.getElementById(`opponent-attr-${attribute}`);
        
        if (myAttrElement && opponentAttrElement) {
            myAttrElement.classList.add('selected');
            opponentAttrElement.classList.add('selected');
            
            const isWinner = winnerId === this.playerId;
            const isTie = winnerId === null;
            
            if (!isTie) {
                if (isWinner) {
                    myAttrElement.classList.add('winner');
                    opponentAttrElement.classList.add('loser');
                } else {
                    opponentAttrElement.classList.add('winner');
                    myAttrElement.classList.add('loser');
                }
            }
        }
    }

    showResult(winnerId) {
        const isWinner = winnerId === this.playerId;
        const isTie = winnerId === null;
        
        if (isTie) {
            this.resultText.textContent = 'Empate!';
            this.resultText.className = 'result-text tie';
        } else if (isWinner) {
            this.resultText.textContent = 'Você Venceu!';
            this.resultText.className = 'result-text winner';
        } else {
            this.resultText.textContent = 'Você Perdeu!';
            this.resultText.className = 'result-text winner';
        }
    }

    updateConnectionStatus(connected) {
        this.connectionStatus.textContent = connected ? '● Conectado' : '● Desconectado';
        this.connectionStatus.className = connected ? 'connection-status connected' : 'connection-status disconnected';
    }

    showLoading(message = 'Carregando...') {
        this.loadingText.textContent = message;
        this.loadingOverlay.classList.remove('hidden');
    }

    hideLoading() {
        this.loadingOverlay.classList.add('hidden');
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorModal.classList.remove('hidden');
        this.hideLoading();
    }

    hideError() {
        this.errorModal.classList.add('hidden');
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SuperTrunfoOnline();
});