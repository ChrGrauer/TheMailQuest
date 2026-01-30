# The Mail Quest

A serious game designed to explain basic email deliverability concepts to non-experts. The Mail Quest is an interactive training tool that helps players understand the complexities of email sending, reputation management, and deliverability best practices.

## Tech Stack

- **Frontend**: SvelteKit + Tailwind CSS
- **Backend**: SvelteKit Server with WebSocket support
- **Logging**: Pino with file rotation
- **Testing**: Vitest (unit/component) + Playwright (e2e)
- **Real-time Communication**: WebSocket (ws library)

## Project Structure

```
src/
├── lib/
│   ├── components/      # Svelte components
│   ├── server/
│   │   ├── logger/      # Pino logging configuration
│   │   └── websocket/   # WebSocket server setup
│   ├── stores/          # Svelte stores for state management
│   └── types/           # TypeScript type definitions
├── routes/              # SvelteKit routes and API endpoints
│   └── api/             # Server-side API endpoints
└── app.css              # Global Tailwind styles
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm, pnpm, or yarn

### Installation

```sh
npm install
```

### Development

Start the development server:

```sh
npm run dev

# or with auto-open browser
npm run dev -- --open
```

### Testing

```sh
# Run unit tests
npm run test

# Run unit tests with UI
npm run test:ui

# Run e2e tests
npm run test:e2e
```

### Building

Create a production build:

```sh
npm run build
```

Preview the production build:

```sh
npm run preview
```

## Key Features

- **Real-time Multiplayer**: Supports up to 15 concurrent players via WebSocket
- **Session-based**: 45-minute training sessions with no persistent storage
- **Event-driven Architecture**: Player actions broadcast to all clients
- **Comprehensive Logging**: Structured JSON logs for game events, player actions, and errors
- **ATDD Approach**: Tests written before implementation following Acceptance Test-Driven Development

## Game Architecture Principles

- **Stateful Server**: All game data stored in memory during active session
- **No Persistence**: Game resets between sessions (optional JSON export for results)
- **Single Instance**: Designed for single-node deployment (no horizontal scaling needed)
- **Event Broadcasting**: Real-time updates to all connected players

## Logging

Logs are stored in the `./logs` directory with daily rotation and compression. In development mode, logs are pretty-printed to the console. In production, logs are written as structured JSON for easy parsing and analysis.

## Deployment

The application can be deployed to any Node.js hosting platform that supports WebSockets:
- Railway
- Render
- Vercel (if WebSocket support is available)
- Netlify (if WebSocket support is available)

## Documentation

Project documentation and user stories are managed in Obsidian and linked to this repository.


