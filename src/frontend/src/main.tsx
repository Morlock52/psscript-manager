import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from './contexts/AuthContext' // Re-enabled
import { ThemeProvider } from './contexts/ThemeContext'
// Temporarily disable telemetry due to dependency issues
// import './telemetry/tracing' // Initialize tracing
// import { initializeMetrics } from './telemetry/metrics' // Initialize metrics
import './index.css'

// Initialize telemetry - disabled temporarily
// initializeMetrics();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider> {/* Re-enabled */}
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </AuthProvider> {/* Re-enabled */}
  </React.StrictMode>
)
