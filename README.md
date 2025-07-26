# Super Trunfo Online - Multiplayer Edition 🎮

Um jogo digital de Super Trunfo multiplayer online, onde jogadores podem competir em dispositivos diferentes através da internet.

## 🚀 [Jogar Online](https://supertrunfo-online.railway.app)

## 📖 Sobre o Jogo

Esta é a versão online do clássico Super Trunfo, permitindo que dois jogadores joguem em dispositivos separados através de salas privadas com códigos únicos.

### Como Jogar Online

1. **Registre-se**: Digite seu nome e conecte-se ao servidor
2. **Criar/Entrar em Sala**: 
   - **Criar**: Gere um código único para compartilhar
   - **Entrar**: Use o código de um amigo
3. **Aguardar**: Espere o segundo jogador se conectar
4. **Jogar**: O jogo inicia automaticamente quando ambos estão conectados

### Características Online

- 🌐 **Multiplayer Real-time**: Jogadas sincronizadas via WebSocket
- 🏠 **Sistema de Salas**: Códigos únicos de 6 caracteres
- 📱 **Multi-dispositivo**: Jogue em celular, tablet ou desktop
- 🔄 **Reconexão**: Handling automático de desconexões
- 🎯 **Sem Registro**: Apenas digite seu nome e jogue

## 🛠️ Tecnologias

### Backend
- **Node.js** - Runtime do servidor
- **Express.js** - Framework web
- **Socket.IO** - WebSocket real-time
- **UUID** - Geração de IDs únicos

### Frontend
- **HTML5/CSS3** - Interface responsiva
- **JavaScript ES6+** - Lógica do cliente
- **Socket.IO Client** - Comunicação real-time

### Hospedagem
- **Railway** - Deploy automático e gratuito
- **GitHub** - Controle de versão

## 🎯 Arquitetura Online

```
Cliente A ←→ Servidor Socket.IO ←→ Cliente B
    ↑              ↑                  ↑
Dispositivo 1    Railway           Dispositivo 2
```

### Fluxo de Jogo

1. **Conexão**: Clientes conectam via WebSocket
2. **Registro**: Escolha de nome de jogador
3. **Matchmaking**: Criação/entrada em salas
4. **Sincronização**: Estado do jogo compartilhado
5. **Gameplay**: Turnos alternados em tempo real

## 🚀 Executar Localmente

### Pré-requisitos
- Node.js 14+
- NPM ou Yarn

### Instalação

1. Clone o repositório:
```bash
git clone https://github.com/fspseva/supertrunfo-online.git
cd supertrunfo-online
```

2. Instale dependências do servidor:
```bash
cd server
npm install
```

3. Inicie o servidor:
```bash
npm start
```

4. Acesse:
```
http://localhost:3001
```

### Scripts Disponíveis

- `npm start` - Servidor de produção
- `npm run dev` - Desenvolvimento com nodemon

## 📁 Estrutura do Projeto

```
supertrunfo-online/
├── server/
│   ├── server.js           # Servidor Socket.IO
│   ├── package.json        # Dependências do servidor
│   └── package-lock.json
├── client/
│   ├── index.html          # Interface principal
│   ├── style.css           # Estilos
│   ├── game-online.js      # Lógica do cliente
│   └── carros_imgs/        # Imagens dos carros
├── cars.json               # Dados das cartas
└── README.md               # Esta documentação
```

## 🎮 Funcionalidades Online

### ✅ Implementadas
- **Lobby System** - Criar/entrar em salas
- **Real-time Gameplay** - Sincronização de jogadas
- **Room Codes** - Códigos únicos de 6 caracteres
- **Player Management** - Nomes personalizados
- **Disconnect Handling** - Notificações de desconexão
- **Responsive Design** - Funciona em todos os dispositivos
- **Game State Sync** - Estado sempre sincronizado

### 🔮 Futuras Melhorias
- **Reconexão Automática** - Voltar ao jogo após queda
- **Spectator Mode** - Assistir jogos em andamento
- **Ranking System** - Histórico de vitórias/derrotas
- **Tournament Mode** - Torneios automáticos
- **Chat System** - Comunicação entre jogadores
- **Custom Decks** - Diferentes categorias de cartas

## 🌐 Deploy

### Railway (Recomendado)

1. Fork o repositório
2. Conecte ao Railway
3. Deploy automático do branch `main`
4. Variáveis de ambiente:
   - `PORT=3001` (Railway define automaticamente)

### Render

1. Conecte o repositório ao Render
2. Configure:
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Environment**: Node.js

### Heroku

1. Instale Heroku CLI
2. Configure:
```bash
git subtree push --prefix=server heroku main
```

## 🤝 Diferenças da Versão Local

| Característica | Local | Online |
|----------------|-------|--------|
| Jogadores | 2 na mesma tela | 2 em dispositivos separados |
| Conexão | Não necessária | Internet obrigatória |
| Privacidade | Rotação de tela | Salas privadas |
| Multiplayer | Local apenas | Global |
| Códigos | Não | Salas com códigos |

## 🔧 API Endpoints

### REST
- `GET /` - Interface do jogo
- `GET /api/health` - Status do servidor
- `GET /api/attributes` - Atributos das cartas

### Socket.IO Events

#### Cliente → Servidor
- `register-player` - Registrar jogador
- `create-room` - Criar sala
- `join-room` - Entrar em sala
- `get-top-card` - Solicitar carta atual
- `select-attribute` - Escolher atributo
- `resolve-round` - Resolver rodada

#### Servidor → Cliente
- `registered` - Confirmação de registro
- `room-created` - Sala criada
- `room-joined` - Entrada em sala confirmada
- `game-started` - Jogo iniciado
- `top-card` - Carta atual do jogador
- `cards-revealed` - Resultado da comparação
- `round-resolved` - Rodada resolvida
- `game-over` - Fim do jogo
- `error` - Mensagens de erro

## 📄 Licença

Este projeto é open source e está disponível sob a [MIT License](LICENSE).

## 👨‍💻 Autor

**Fabio Seva** - [@fspseva](https://github.com/fspseva)

## 🙏 Agradecimentos

- Versão local original do Super Trunfo
- Comunidade Socket.IO
- Railway por hospedagem gratuita
- Jogadores beta testers

---

**[🎮 Jogar Agora](https://supertrunfo-online.railway.app)**