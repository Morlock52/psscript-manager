import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Sparkles,
  FileText,
  Code,
  Shield,
  TestTube,
  Brain,
  Zap,
  GitMerge,
  Languages,
  Package,
  MessageSquare,
  Search,
  Bug,
  History,
  AlertTriangle,
  BookOpen,
  Play,
  Layers,
  Settings,
  Cpu
} from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

interface Script {
  id: number;
  title: string;
  content: string;
  description?: string;
}

interface AIFeature {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: (script?: Script) => Promise<any>;
  requiresScript: boolean;
  category: 'analysis' | 'generation' | 'transformation' | 'assistance';
}

const AIFeatures: React.FC = () => {
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [featureResults, setFeatureResults] = useState<Record<string, any>>({});
  const [nlDescription, setNlDescription] = useState('');
  const [templateType, setTemplateType] = useState('file-management');
  const [targetLanguage, setTargetLanguage] = useState('python');
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{role: string; content: string}>>([]);

  // Fetch available scripts
  const { data: scriptsData } = useQuery({
    queryKey: ['scripts'],
    queryFn: () => api.get('/scripts')
  });

  const scripts = scriptsData?.data?.scripts || [];

  // Define all AI features
  const aiFeatures: AIFeature[] = [
    {
      id: 'generate-docs',
      title: 'Generate Documentation',
      description: 'Auto-generate comprehensive documentation for your scripts',
      icon: <FileText className="w-5 h-5" />,
      category: 'generation',
      requiresScript: true,
      action: async (script) => {
        const response = await api.post(`/ai-features/scripts/${script?.id}/documentation`);
        return response.data;
      }
    },
    {
      id: 'refactoring',
      title: 'Refactoring Suggestions',
      description: 'Get AI-powered suggestions to improve your code',
      icon: <Code className="w-5 h-5" />,
      category: 'analysis',
      requiresScript: true,
      action: async (script) => {
        const response = await api.get(`/ai-features/scripts/${script?.id}/refactor`);
        return response.data;
      }
    },
    {
      id: 'nl-to-script',
      title: 'Natural Language to Script',
      description: 'Convert plain English descriptions into PowerShell scripts',
      icon: <Brain className="w-5 h-5" />,
      category: 'generation',
      requiresScript: false,
      action: async () => {
        const response = await api.post('/ai-features/nl-to-script', {
          description: nlDescription
        });
        return response.data;
      }
    },
    {
      id: 'categorize',
      title: 'Smart Categorization',
      description: 'AI-powered categorization with confidence scores',
      icon: <Layers className="w-5 h-5" />,
      category: 'analysis',
      requiresScript: true,
      action: async (script) => {
        const response = await api.get(`/ai-features/scripts/${script?.id}/categorize`);
        return response.data;
      }
    },
    {
      id: 'security-scan',
      title: 'Security Scanner',
      description: 'Detect vulnerabilities and security issues',
      icon: <Shield className="w-5 h-5" />,
      category: 'analysis',
      requiresScript: true,
      action: async (script) => {
        const response = await api.get(`/ai-features/scripts/${script?.id}/security-scan`);
        return response.data;
      }
    },
    {
      id: 'code-review',
      title: 'Code Review',
      description: 'Get a comprehensive code review with scoring',
      icon: <Search className="w-5 h-5" />,
      category: 'analysis',
      requiresScript: true,
      action: async (script) => {
        const response = await api.get(`/ai-features/scripts/${script?.id}/review`);
        return response.data;
      }
    },
    {
      id: 'generate-tests',
      title: 'Generate Tests',
      description: 'Auto-generate Pester tests for your scripts',
      icon: <TestTube className="w-5 h-5" />,
      category: 'generation',
      requiresScript: true,
      action: async (script) => {
        const response = await api.post(`/ai-features/scripts/${script?.id}/generate-tests`);
        return response.data;
      }
    },
    {
      id: 'explain-error',
      title: 'Error Explainer',
      description: 'Get detailed explanations for PowerShell errors',
      icon: <AlertTriangle className="w-5 h-5" />,
      category: 'assistance',
      requiresScript: false,
      action: async () => {
        const response = await api.post('/ai-features/explain-error', {
          error: 'Example error message'
        });
        return response.data;
      }
    },
    {
      id: 'similar-scripts',
      title: 'Find Similar Scripts',
      description: 'Find similar scripts with AI explanations',
      icon: <Search className="w-5 h-5" />,
      category: 'analysis',
      requiresScript: true,
      action: async (script) => {
        const response = await api.get(`/ai-features/scripts/${script?.id}/similar-enhanced`);
        return response.data;
      }
    },
    {
      id: 'performance',
      title: 'Performance Prediction',
      description: 'Predict script performance and resource usage',
      icon: <Zap className="w-5 h-5" />,
      category: 'analysis',
      requiresScript: true,
      action: async (script) => {
        const response = await api.get(`/ai-features/scripts/${script?.id}/predict-performance`);
        return response.data;
      }
    },
    {
      id: 'merge-scripts',
      title: 'Smart Merge',
      description: 'Intelligently merge multiple scripts',
      icon: <GitMerge className="w-5 h-5" />,
      category: 'transformation',
      requiresScript: false,
      action: async () => {
        const response = await api.post('/ai-features/scripts/merge', {
          scriptIds: [1, 2], // Example IDs
          mergeStrategy: 'optimized'
        });
        return response.data;
      }
    },
    {
      id: 'generate-template',
      title: 'Generate from Template',
      description: 'Create scripts from pre-built templates',
      icon: <FileText className="w-5 h-5" />,
      category: 'generation',
      requiresScript: false,
      action: async () => {
        const response = await api.post('/ai-features/scripts/generate-template', {
          templateType,
          parameters: {}
        });
        return response.data;
      }
    },
    {
      id: 'convert-language',
      title: 'Convert to Other Languages',
      description: 'Convert PowerShell to Python, Bash, or JavaScript',
      icon: <Languages className="w-5 h-5" />,
      category: 'transformation',
      requiresScript: true,
      action: async (script) => {
        const response = await api.post(`/ai-features/scripts/${script?.id}/convert-language`, {
          targetLanguage
        });
        return response.data;
      }
    },
    {
      id: 'optimize',
      title: 'AI Optimization',
      description: 'Optimize scripts for performance and readability',
      icon: <Cpu className="w-5 h-5" />,
      category: 'transformation',
      requiresScript: true,
      action: async (script) => {
        const response = await api.post(`/ai-features/scripts/${script?.id}/optimize`, {
          optimizationLevel: 'balanced'
        });
        return response.data;
      }
    },
    {
      id: 'dependencies',
      title: 'Dependency Analysis',
      description: 'Analyze script dependencies and compatibility',
      icon: <Package className="w-5 h-5" />,
      category: 'analysis',
      requiresScript: true,
      action: async (script) => {
        const response = await api.get(`/ai-features/scripts/${script?.id}/dependencies`);
        return response.data;
      }
    },
    {
      id: 'generate-module',
      title: 'Generate Module',
      description: 'Create a PowerShell module from scripts',
      icon: <Package className="w-5 h-5" />,
      category: 'generation',
      requiresScript: false,
      action: async () => {
        const response = await api.post('/ai-features/scripts/generate-module', {
          scriptIds: [1, 2],
          moduleName: 'MyModule',
          moduleVersion: '1.0.0'
        });
        return response.data;
      }
    },
    {
      id: 'chat-assistant',
      title: 'AI Chat Assistant',
      description: 'Chat with AI for PowerShell help',
      icon: <MessageSquare className="w-5 h-5" />,
      category: 'assistance',
      requiresScript: false,
      action: async () => {
        const response = await api.post('/ai-features/chat', {
          message: chatMessage,
          sessionId: 'chat-session-1'
        });
        return response.data;
      }
    },
    {
      id: 'predict-execution',
      title: 'Execution Prediction',
      description: 'Predict what a script will do before running',
      icon: <Play className="w-5 h-5" />,
      category: 'analysis',
      requiresScript: true,
      action: async (script) => {
        const response = await api.post(`/ai-features/scripts/${script?.id}/predict-execution`, {});
        return response.data;
      }
    },
    {
      id: 'code-smells',
      title: 'Code Smell Detection',
      description: 'Detect code smells and anti-patterns',
      icon: <Bug className="w-5 h-5" />,
      category: 'analysis',
      requiresScript: true,
      action: async (script) => {
        const response = await api.get(`/ai-features/scripts/${script?.id}/code-smells`);
        return response.data;
      }
    },
    {
      id: 'changelog',
      title: 'Generate Changelog',
      description: 'AI-generated changelog for script versions',
      icon: <History className="w-5 h-5" />,
      category: 'generation',
      requiresScript: true,
      action: async (script) => {
        const response = await api.get(`/ai-features/scripts/${script?.id}/changelog`);
        return response.data;
      }
    }
  ];

  // Group features by category
  const featuresByCategory = aiFeatures.reduce((acc, feature) => {
    if (!acc[feature.category]) acc[feature.category] = [];
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, AIFeature[]>);

  // Execute feature mutation
  const executeFeature = useMutation({
    mutationFn: async ({ feature, script }: { feature: AIFeature; script?: Script }) => {
      setActiveFeature(feature.id);
      try {
        const result = await feature.action(script);
        setFeatureResults(prev => ({ ...prev, [feature.id]: result }));
        return result;
      } finally {
        setActiveFeature(null);
      }
    },
    onSuccess: (data, { feature }) => {
      toast.success(`${feature.title} completed successfully!`);
    },
    onError: (error: any, { feature }) => {
      toast.error(`${feature.title} failed: ${error.response?.data?.error || error.message}`);
    }
  });

  const categoryIcons = {
    analysis: <Search className="w-5 h-5" />,
    generation: <Sparkles className="w-5 h-5" />,
    transformation: <Code className="w-5 h-5" />,
    assistance: <MessageSquare className="w-5 h-5" />
  };

  const categoryDescriptions = {
    analysis: 'Analyze and understand your scripts better',
    generation: 'Generate new scripts and content',
    transformation: 'Transform and optimize existing scripts',
    assistance: 'Get help and explanations'
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">AI Features</h1>
        <p className="text-gray-600">
          Leverage the power of AI to enhance your PowerShell scripting experience
        </p>
      </div>

      {/* Script Selector */}
      <div className="mb-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Select a Script</h2>
        <select
          value={selectedScript?.id || ''}
          onChange={(e) => {
            const script = scripts.find(s => s.id === parseInt(e.target.value));
            setSelectedScript(script || null);
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a script...</option>
          {scripts.map((script: Script) => (
            <option key={script.id} value={script.id}>
              {script.title}
            </option>
          ))}
        </select>
      </div>

      {/* Features by Category */}
      {Object.entries(featuresByCategory).map(([category, features]) => (
        <div key={category} className="mb-8">
          <div className="flex items-center mb-4">
            <div className="text-blue-600 mr-2">
              {categoryIcons[category as keyof typeof categoryIcons]}
            </div>
            <h2 className="text-xl font-semibold capitalize">{category}</h2>
          </div>
          <p className="text-gray-600 mb-4">
            {categoryDescriptions[category as keyof typeof categoryDescriptions]}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature) => (
              <div
                key={feature.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="text-blue-600">{feature.icon}</div>
                  <button
                    onClick={() => {
                      if (feature.requiresScript && !selectedScript) {
                        toast.error('Please select a script first');
                        return;
                      }
                      
                      // Handle special cases
                      if (feature.id === 'nl-to-script' && !nlDescription) {
                        toast.error('Please enter a description');
                        return;
                      }
                      if (feature.id === 'chat-assistant' && !chatMessage) {
                        toast.error('Please enter a message');
                        return;
                      }
                      
                      executeFeature.mutate({ feature, script: selectedScript || undefined });
                    }}
                    disabled={activeFeature === feature.id || (feature.requiresScript && !selectedScript)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      activeFeature === feature.id
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : feature.requiresScript && !selectedScript
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {activeFeature === feature.id ? 'Running...' : 'Run'}
                  </button>
                </div>
                
                <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600 mb-4">{feature.description}</p>
                
                {/* Special inputs for specific features */}
                {feature.id === 'nl-to-script' && (
                  <textarea
                    value={nlDescription}
                    onChange={(e) => setNlDescription(e.target.value)}
                    placeholder="Describe what you want the script to do..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-2"
                    rows={3}
                  />
                )}
                
                {feature.id === 'generate-template' && (
                  <select
                    value={templateType}
                    onChange={(e) => setTemplateType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-2"
                  >
                    <option value="file-management">File Management</option>
                    <option value="system-monitoring">System Monitoring</option>
                    <option value="user-management">User Management</option>
                  </select>
                )}
                
                {feature.id === 'convert-language' && (
                  <select
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-2"
                  >
                    <option value="python">Python</option>
                    <option value="bash">Bash</option>
                    <option value="javascript">JavaScript</option>
                  </select>
                )}
                
                {feature.id === 'chat-assistant' && (
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Ask a PowerShell question..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-2"
                  />
                )}
                
                {/* Results display */}
                {featureResults[feature.id] && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-md">
                    <h4 className="text-sm font-semibold mb-2">Results:</h4>
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(featureResults[feature.id], null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AIFeatures;