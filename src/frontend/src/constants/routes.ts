// Centralized route definitions for PSScript application
export const ROUTES = {
  // Public routes
  LOGIN: '/login',
  REGISTER: '/register',
  UNAUTHORIZED: '/unauthorized',
  
  // Main navigation
  HOME: '/',
  DASHBOARD: '/dashboard',
  SCRIPTS: '/scripts',
  SCRIPT_DETAIL: '/scripts/:id',
  
  // Editor routes
  EDITOR: '/editor',
  EDITOR_WITH_ID: '/editor/:id',
  UPLOAD: '/upload',
  
  // Analysis
  ANALYSIS: '/analysis',
  
  // AI Assistant routes
  AI_CHAT: '/ai-chat',
  CHAT_HISTORY: '/chat-history',
  AI_FEATURES: '/ai-features',
  AGENTIC_AI: '/agentic-ai',
  AGENT_ORCHESTRATION: '/agent-orchestration',
  
  // Documentation
  DOCUMENTATION: '/documentation',
  DOCUMENTATION_CRAWL: '/documentation-crawl',
  
  // Settings routes
  SETTINGS: '/settings',
  SETTINGS_PROFILE: '/settings/profile',
  SETTINGS_APPEARANCE: '/settings/appearance',
  SETTINGS_SECURITY: '/settings/security',
  SETTINGS_NOTIFICATIONS: '/settings/notifications',
  SETTINGS_API: '/settings/api',
  SETTINGS_USERS: '/settings/users',
  
  // Demo & Testing
  UI_DEMO: '/ui-demo',
  LINK_TEST: '/link-test',
} as const;

// Type for route values
export type RouteValue = typeof ROUTES[keyof typeof ROUTES];

// Helper function to get route with params
export const getRoute = (route: RouteValue, params?: Record<string, string>): string => {
  if (!params) return route;
  
  let path = route;
  Object.entries(params).forEach(([key, value]) => {
    path = path.replace(`:${key}`, value);
  });
  
  return path;
};

// Helper function to check if a path matches a route pattern
export const matchesRoute = (path: string, routePattern: RouteValue): boolean => {
  const pattern = routePattern.replace(/:[^/]+/g, '[^/]+');
  const regex = new RegExp(`^${pattern}$`);
  return regex.test(path);
};