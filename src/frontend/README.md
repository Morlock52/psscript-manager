# Frontend - PowerShell Script Management Application

The frontend is built with React, TypeScript, and Tailwind CSS, providing a modern and responsive user interface for managing PowerShell scripts.

## Key Components

- **Dashboard** - Activity feed, quick access, and statistics
- **Upload Interface** - Script submission with AI analysis preview
- **Script Detail View** - Syntax highlighting, execution, version history
- **Search & Browse** - Advanced filtering and semantic search
- **Analytics** - Usage and performance metrics visualization
- **Full-screen Editor** - Monaco-based editor for script editing

## Technology Stack

- React 18+ for component-based UI
- TypeScript for type safety
- Tailwind CSS for styling (with dark mode)
- Monaco Editor for code display and editing
- D3.js for data visualizations
- React Query for data fetching and caching
- Vite for fast bundling and development experience

## Setup Instructions

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Local Development Setup

1. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

2. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:5173/
   ```

### Docker Setup

1. Build and start the container:
   ```bash
   # From the project root directory
   docker-compose up -d frontend
   ```

2. Access the application:
   ```
   http://localhost:3000/
   ```

### Environment Variables

Create a `.env` file in the frontend root directory with these variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:4000/api` |
| `VITE_USE_MOCKS` | Use mock data (true/false) | `true` |

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run typecheck` - Check TypeScript types

## Docker Image

The frontend is containerized using Docker. The Dockerfile:
- Uses Node.js 18 Alpine as base image
- Installs dependencies
- Exposes port 3000
- Configures volume mounts for fast development

## Features

- **Responsive Design**: Works on mobile, tablet, and desktop
- **Dark Mode**: Default dark theme for better code visibility
- **Full-screen Editor**: Monaco editor for script editing
- **Mock Data Support**: Toggle between mock and real API data
- **Real-time Updates**: Live preview of script analysis
- **Interactive UI**: Advanced filtering and visualization