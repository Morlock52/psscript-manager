import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Context Providers
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Pages
import Dashboard from './pages/Dashboard';
import ScriptManagement from './pages/ScriptManagement';
import ScriptDetail from './pages/ScriptDetail';
import ScriptEditor from './pages/ScriptEditor';
import ScriptAnalysis from './pages/ScriptAnalysis';
import SimpleChatWithAI from './pages/SimpleChatWithAI';
import Documentation from './pages/Documentation';
import Login from './pages/Login';
import Register from './pages/Register';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import ChatHistory from './pages/ChatHistory';
import DocumentationCrawl from './pages/DocumentationCrawl';
import ScriptUpload from './pages/ScriptUpload';
import AgenticAIPage from './pages/AgenticAIPage';
import AgentOrchestrationPage from './pages/AgentOrchestrationPage';
import UIComponentsDemo from './pages/UIComponentsDemo';

// Settings Pages
import ProfileSettings from './pages/Settings/ProfileSettings';
import AppearanceSettings from './pages/Settings/AppearanceSettings';
import SecuritySettings from './pages/Settings/SecuritySettings';
import NotificationSettings from './pages/Settings/NotificationSettings';
import ApiSettings from './pages/Settings/ApiSettings';
import UserManagement from './pages/Settings/UserManagement';

// Components
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingScreen from './components/LoadingScreen';
import AIFeatures from './components/AIFeatures';
import DocumentationErrorBoundary from './components/DocumentationErrorBoundary';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Simulate initial loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
              <ToastContainer position="top-right" theme="colored" />
              
              {/* Sidebar */}
              <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
              
              {/* Main Content */}
              <div className="flex flex-col flex-1 overflow-hidden">
                <Navbar onMenuClick={() => setSidebarOpen(true)} />
                
                <main className="flex-1 overflow-y-auto p-4">
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/documentation" element={
                      <DocumentationErrorBoundary>
                        <Documentation />
                      </DocumentationErrorBoundary>
                    } />
                    <Route path="/ui-components" element={<UIComponentsDemo />} />
                    
                    {/* Protected Routes */}
                    <Route path="/" element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    } />

                    {/* Script Management */}
                    <Route path="/scripts" element={
                      <ProtectedRoute>
                        <ScriptManagement />
                      </ProtectedRoute>
                    } />
                    <Route path="/scripts/upload" element={
                      <ProtectedRoute>
                        <ScriptUpload />
                      </ProtectedRoute>
                    } />
                    <Route path="/scripts/:id" element={
                      <ProtectedRoute>
                        <ScriptDetail />
                      </ProtectedRoute>
                    } />
                    <Route path="/scripts/:id/edit" element={
                      <ProtectedRoute>
                        <ScriptEditor />
                      </ProtectedRoute>
                    } />
                    <Route path="/scripts/:id/analysis" element={
                      <ProtectedRoute>
                        <ScriptAnalysis />
                      </ProtectedRoute>
                    } />

                    {/* AI Features */}
                    <Route path="/chat" element={
                      <ProtectedRoute>
                        <SimpleChatWithAI />
                      </ProtectedRoute>
                    } />
                    <Route path="/chat/history" element={
                      <ProtectedRoute>
                        <ChatHistory />
                      </ProtectedRoute>
                    } />
                    <Route path="/ai/assistant" element={
                      <ProtectedRoute>
                        <AgenticAIPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/ai/agents" element={
                      <ProtectedRoute>
                        <AgentOrchestrationPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/ai/features" element={
                      <ProtectedRoute>
                        <AIFeatures />
                      </ProtectedRoute>
                    } />

                    {/* Documentation */}
                    <Route path="/documentation/crawl" element={
                      <ProtectedRoute requiredRole="admin">
                        <DocumentationErrorBoundary>
                          <DocumentationCrawl />
                        </DocumentationErrorBoundary>
                      </ProtectedRoute>
                    } />

                    {/* Settings */}
                    <Route path="/settings" element={
                      <ProtectedRoute>
                        <Settings />
                      </ProtectedRoute>
                    } />
                    <Route path="/settings/profile" element={
                      <ProtectedRoute>
                        <ProfileSettings />
                      </ProtectedRoute>
                    } />
                    <Route path="/settings/appearance" element={
                      <ProtectedRoute>
                        <AppearanceSettings />
                      </ProtectedRoute>
                    } />
                    <Route path="/settings/security" element={
                      <ProtectedRoute>
                        <SecuritySettings />
                      </ProtectedRoute>
                    } />
                    <Route path="/settings/notifications" element={
                      <ProtectedRoute>
                        <NotificationSettings />
                      </ProtectedRoute>
                    } />
                    <Route path="/settings/api" element={
                      <ProtectedRoute>
                        <ApiSettings />
                      </ProtectedRoute>
                    } />
                    <Route path="/settings/users" element={
                      <ProtectedRoute requiredRole="admin">
                        <UserManagement />
                      </ProtectedRoute>
                    } />

                    {/* Fallbacks */}
                    <Route path="/404" element={<NotFound />} />
                    <Route path="/unauthorized" element={
                      <div className="flex items-center justify-center min-h-screen">
                        <div className="text-center">
                          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
                          <p className="mt-2 text-gray-600">You don't have permission to access this page.</p>
                        </div>
                      </div>
                    } />
                    <Route path="*" element={<Navigate to="/404" replace />} />
                  </Routes>
                </main>
              </div>
            </div>
          </Router>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
