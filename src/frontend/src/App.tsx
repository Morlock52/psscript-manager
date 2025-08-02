import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Context Providers - Keep these loaded immediately
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Components that should load immediately
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Breadcrumb from './components/Breadcrumb';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingScreen from './components/LoadingScreen';
import PageLoadingFallback from './components/PageLoadingFallback';
import ErrorBoundary from './components/ErrorBoundary';
import GlobalErrorBoundary from './components/GlobalErrorBoundary';

// Utilities
import { preloadCommonModules } from './utils/dynamicImports';

// Lazy load all pages with webpack magic comments
const Dashboard = lazy(() => import(/* webpackChunkName: "dashboard" */ './pages/Dashboard'));
const ScriptManagement = lazy(() => import(/* webpackChunkName: "scripts" */ './pages/ScriptManagement'));
const ScriptDetail = lazy(() => import(/* webpackChunkName: "script-detail" */ './pages/ScriptDetail'));
const ScriptEditor = lazy(() => import(/* webpackChunkName: "editor", webpackPrefetch: true */ './pages/ScriptEditor'));
const ScriptAnalysis = lazy(() => import(/* webpackChunkName: "analysis" */ './pages/ScriptAnalysis'));
const SimpleChatWithAI = lazy(() => import(/* webpackChunkName: "ai-chat" */ './pages/SimpleChatWithAI'));
const Documentation = lazy(() => import(/* webpackChunkName: "docs" */ './pages/Documentation'));
const Login = lazy(() => import(/* webpackChunkName: "auth" */ './pages/Login'));
const Register = lazy(() => import(/* webpackChunkName: "auth" */ './pages/Register'));
const Settings = lazy(() => import(/* webpackChunkName: "settings" */ './pages/Settings'));
const NotFound = lazy(() => import(/* webpackChunkName: "error" */ './pages/NotFound'));
const Unauthorized = lazy(() => import(/* webpackChunkName: "error" */ './pages/Unauthorized'));
const ChatHistory = lazy(() => import(/* webpackChunkName: "chat-history" */ './pages/ChatHistory'));
const DocumentationCrawl = lazy(() => import(/* webpackChunkName: "docs-crawl" */ './pages/DocumentationCrawl'));
const ScriptUpload = lazy(() => import(/* webpackChunkName: "upload", webpackPrefetch: true */ './pages/ScriptUpload'));
const AgenticAIPage = lazy(() => import(/* webpackChunkName: "agentic-ai" */ './pages/AgenticAIPage'));
const AgentOrchestrationPage = lazy(() => import(/* webpackChunkName: "agent-orchestration" */ './pages/AgentOrchestrationPage'));
const UIComponentsDemo = lazy(() => import(/* webpackChunkName: "demo" */ './pages/UIComponentsDemo'));
const LinkTester = lazy(() => import(/* webpackChunkName: "link-tester" */ './components/LinkTester'));

// Lazy load settings pages
const ProfileSettings = lazy(() => import('./pages/Settings/ProfileSettings'));
const AppearanceSettings = lazy(() => import('./pages/Settings/AppearanceSettings'));
const SecuritySettings = lazy(() => import('./pages/Settings/SecuritySettings'));
const NotificationSettings = lazy(() => import('./pages/Settings/NotificationSettings'));
const ApiSettings = lazy(() => import('./pages/Settings/ApiSettings'));
const UserManagement = lazy(() => import('./pages/Settings/UserManagement'));

// Lazy load heavy components
const AIFeatures = lazy(() => import('./components/AIFeatures'));
const DocumentationErrorBoundary = lazy(() => import('./components/DocumentationErrorBoundary'));

// Development/Testing components
const NavigationTest = lazy(() => import('./components/NavigationTest'));

// Create a client for React Query with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime in v4)
    },
  },
});

// Wrapper component for lazy-loaded routes
const LazyRoute: React.FC<{ children: React.ReactNode; name?: string }> = ({ children, name }) => (
  <Suspense fallback={<PageLoadingFallback pageName={name || ''} />}>
    {children}
  </Suspense>
);

function App() {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [initialLoading, setInitialLoading] = React.useState(true);

  React.useEffect(() => {
    // Simulate initial app loading
    const timer = setTimeout(() => {
      setInitialLoading(false);
      // Preload common modules after initial load
      preloadCommonModules();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  if (initialLoading) {
    return <LoadingScreen />;
  }

  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            <Router>
              <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                <div className="flex-1 flex flex-col overflow-hidden">
                  <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
                  <Breadcrumb />
                  <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900">
                    <ErrorBoundary>
                      <Routes>
                    {/* Public routes */}
                    <Route path="/unauthorized" element={
                      <LazyRoute name="Unauthorized">
                        <Unauthorized />
                      </LazyRoute>
                    } />
                    <Route path="/login" element={
                      <LazyRoute name="Login">
                        <Login />
                      </LazyRoute>
                    } />
                    <Route path="/register" element={
                      <LazyRoute name="Register">
                        <Register />
                      </LazyRoute>
                    } />

                    {/* Protected routes */}
                    <Route path="/" element={<ProtectedRoute />}>
                      <Route index element={<Navigate to="/dashboard" replace />} />
                      <Route path="dashboard" element={
                        <LazyRoute name="Dashboard">
                          <Dashboard />
                        </LazyRoute>
                      } />
                      <Route path="scripts" element={
                        <LazyRoute name="Scripts">
                          <ScriptManagement />
                        </LazyRoute>
                      } />
                      <Route path="scripts/:id" element={
                        <LazyRoute name="Script Details">
                          <ScriptDetail />
                        </LazyRoute>
                      } />
                      <Route path="editor" element={
                        <LazyRoute name="Script Editor">
                          <ScriptEditor />
                        </LazyRoute>
                      } />
                      <Route path="editor/:id" element={
                        <LazyRoute name="Script Editor">
                          <ScriptEditor />
                        </LazyRoute>
                      } />
                      <Route path="upload" element={
                        <LazyRoute name="Script Upload">
                          <ScriptUpload />
                        </LazyRoute>
                      } />
                      <Route path="analysis" element={
                        <LazyRoute name="Script Analysis">
                          <ScriptAnalysis />
                        </LazyRoute>
                      } />
                      <Route path="ai-chat" element={
                        <LazyRoute name="AI Chat">
                          <SimpleChatWithAI />
                        </LazyRoute>
                      } />
                      <Route path="chat-history" element={
                        <LazyRoute name="Chat History">
                          <ChatHistory />
                        </LazyRoute>
                      } />
                      <Route path="ai-features" element={
                        <LazyRoute name="AI Features">
                          <Suspense fallback={<PageLoadingFallback pageName="AI Features" />}>
                            <AIFeatures />
                          </Suspense>
                        </LazyRoute>
                      } />
                      <Route path="agentic-ai" element={
                        <LazyRoute name="Agentic AI">
                          <AgenticAIPage />
                        </LazyRoute>
                      } />
                      <Route path="agent-orchestration" element={
                        <LazyRoute name="Agent Orchestration">
                          <AgentOrchestrationPage />
                        </LazyRoute>
                      } />
                      <Route path="documentation" element={
                        <LazyRoute name="Documentation">
                          <Suspense fallback={<PageLoadingFallback pageName="Documentation" />}>
                            <DocumentationErrorBoundary>
                              <Documentation />
                            </DocumentationErrorBoundary>
                          </Suspense>
                        </LazyRoute>
                      } />
                      <Route path="documentation-crawl" element={
                        <LazyRoute name="Documentation Crawl">
                          <DocumentationCrawl />
                        </LazyRoute>
                      } />
                      
                      {/* Settings routes */}
                      <Route path="settings" element={
                        <LazyRoute name="Settings">
                          <Settings />
                        </LazyRoute>
                      }>
                        <Route index element={<Navigate to="profile" replace />} />
                        <Route path="profile" element={
                          <LazyRoute name="Profile Settings">
                            <ProfileSettings />
                          </LazyRoute>
                        } />
                        <Route path="appearance" element={
                          <LazyRoute name="Appearance Settings">
                            <AppearanceSettings />
                          </LazyRoute>
                        } />
                        <Route path="security" element={
                          <LazyRoute name="Security Settings">
                            <SecuritySettings />
                          </LazyRoute>
                        } />
                        <Route path="notifications" element={
                          <LazyRoute name="Notification Settings">
                            <NotificationSettings />
                          </LazyRoute>
                        } />
                        <Route path="api" element={
                          <LazyRoute name="API Settings">
                            <ApiSettings />
                          </LazyRoute>
                        } />
                        <Route path="users" element={
                          <LazyRoute name="User Management">
                            <UserManagement />
                          </LazyRoute>
                        } />
                      </Route>

                      {/* Demo route */}
                      <Route path="ui-demo" element={
                        <LazyRoute name="UI Components Demo">
                          <UIComponentsDemo />
                        </LazyRoute>
                      } />
                      
                      {/* Link Testing route */}
                      <Route path="link-test" element={
                        <LazyRoute name="Link Tester">
                          <LinkTester />
                        </LazyRoute>
                      } />
                      
                      {/* Navigation test route (development) */}
                      <Route path="nav-test" element={
                        <LazyRoute name="Navigation Test">
                          <div className="p-6">
                            <NavigationTest />
                          </div>
                        </LazyRoute>
                      } />
                    </Route>

                    {/* 404 route */}
                    <Route path="*" element={
                      <LazyRoute name="Not Found">
                        <NotFound />
                      </LazyRoute>
                    } />
                      </Routes>
                    </ErrorBoundary>
                  </main>
                </div>
              </div>
            </Router>
            <ToastContainer position="top-right" autoClose={5000} />
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
}

export default App;