# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OrionAutomato is a desktop application built with Electron that provides a visual flow builder for web automation workflows. It consists of three main components:

1. **Electron Shell**: Desktop wrapper managing the application lifecycle
2. **Backend API**: NestJS server running on port 3001 (dev) / 3002 (production)
3. **Frontend UI**: React SPA for the visual flow builder interface

## Build Commands

### Development
```bash
npm run electron-dev     # Run Electron app in development mode
npm run start           # Start development (runs both frontend and backend)

# Backend specific
cd backend && npm run start:dev    # Start backend with hot reload
cd backend && npm run start:debug  # Start backend with debugging

# Frontend specific  
cd frontend && npm run start       # Start React dev server on port 3000
```

### Production Build
```bash
npm run build          # Build both frontend and backend
npm run dist          # Build and package Electron app for distribution (creates DMG)

# Individual builds
npm run build:frontend # Build React app to frontend/build/
npm run build:backend  # Build NestJS app to backend/dist/
```

### Testing & Linting
```bash
# Backend
cd backend && npm run test    # Run Jest tests
cd backend && npm run lint    # Run ESLint
cd backend && npm run format  # Format with Prettier

# Frontend
cd frontend && npm run test   # Run tests
```

## Architecture & Key Components

### Tech Stack
- **Desktop**: Electron 28.x
- **Backend**: NestJS 11.x, TypeScript, TypeORM (SQLite), Playwright, Socket.io
- **Frontend**: React 19.x, TypeScript, ReactFlow, Socket.io-client

### Module Structure (Backend)
- **flow/**: Core flow management and execution engine
- **betting-house/**: Integrations with betting platforms (Betano)
- **scraping/**: Playwright-based web automation
- **websocket/**: Real-time communication gateway
- **auth/**: Authentication module
- **health/**: Health check endpoints

### Key Features
1. **Visual Flow Builder**: Drag-and-drop interface using ReactFlow
2. **Dynamic Routes**: Flows can register custom API endpoints
3. **Real-time Updates**: WebSocket communication for live execution logs
4. **Browser Automation**: Playwright with stealth capabilities
5. **Database**: SQLite with entities for flows, executions, and caching

### API Configuration
- **Base URL**: `http://localhost:3001/api/v1` (development)
- **WebSocket**: Same port as API
- **CORS**: Enabled for all origins in development

### TypeScript Configuration
- Backend uses CommonJS with path aliases: `@modules`, `@providers`, `@shared`
- Frontend uses ES modules with strict mode
- Both have separate tsconfig.json files

### Important Development Notes

1. **Running the Full Stack**:
   - Use `npm run electron-dev` to start everything together
   - Backend spawns as child process of Electron main
   - Frontend served from localhost:3000 in dev, bundled files in production

2. **Flow Development**:
   - Flows are stored in SQLite with JSON columns for flexible schema
   - Each flow can have multiple nodes connected by edges
   - Execution logs stream via WebSocket

3. **Custom UI Components**:
   - Project replaces native browser dialogs with custom React components
   - Toast notifications, dialogs, and modals are implemented in React

4. **Security Considerations**:
   - Electron runs with context isolation enabled
   - No node integration in renderer process
   - Input validation via NestJS pipes

### Database Schema
- Uses TypeORM with SQLite
- Main entities: Flow, FlowExecution, BettingHouse configurations
- JSON columns for storing complex flow data structures

### Debugging Tips
- Backend logs available via WebSocket in real-time
- Use `npm run start:debug` for backend debugging with breakpoints
- Frontend React DevTools work normally in Electron dev mode
- Check Electron main process logs in terminal