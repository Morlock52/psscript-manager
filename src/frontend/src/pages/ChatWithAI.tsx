import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import axios from 'axios';
import Layout from '../components/Layout';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const ChatWithAI: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Welcome message with usage instructions
  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: `# Welcome to PSScriptGPT! 👋

I'm here to help you with PowerShell scripting. Ask me anything about:

- Writing new PowerShell scripts
- Debugging existing scripts
- PowerShell best practices
- Windows administration tasks
- Automation workflows

Feel free to paste in script snippets, and I'll help you improve them.

**What would you like help with today?**`
      }
    ]);
  }, []);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message to the chat
    const userMessage: Message = { role: 'user', content: input };
    const newMessages: Message[] = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Make API call to get AI response
      const response = await axios.post('http://localhost:8000/chat', {
        messages: newMessages.map(msg => ({ role: msg.role, content: msg.content })),
      });

      // Add AI response to chat
      const assistantMessage: Message = { role: 'assistant', content: response.data.response };
      setMessages([...newMessages, assistantMessage]);
    } catch (error) {
      console.error('Error getting chat response:', error);
      const errorMessage: Message = { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error processing your request. Please try again later.' 
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Custom renderer for code blocks in markdown
  const CodeBlock = ({ className, children }: { className?: string; children: React.ReactNode }) => {
    const language = className ? className.replace('language-', '') : 'powershell';
    return (
      <div className="my-4 rounded-md overflow-hidden">
        <SyntaxHighlighter 
          language={language} 
          style={vscDarkPlus}
          customStyle={{ padding: '1em', borderRadius: '0.375rem' }}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      </div>
    );
  };

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-64px)]">
        <header className="bg-gray-800 p-4 shadow-md">
          <div className="container mx-auto">
            <h1 className="text-2xl font-bold">Chat with PSScriptGPT</h1>
            <p className="text-gray-400">Your PowerShell scripting assistant powered by AI</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-900">
          <div className="container mx-auto max-w-4xl">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`mb-6 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
              >
                <div 
                  className={`inline-block max-w-3xl text-left p-4 rounded-lg shadow-sm
                    ${msg.role === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-800 text-gray-100'
                    }`}
                >
                  <ReactMarkdown 
                    components={{
                      code({ node, inline, className, children, ...props }) {
                        if (inline) {
                          return <code className="bg-gray-700 px-1 rounded font-mono text-yellow-300" {...props}>{children}</code>;
                        }
                        return <CodeBlock className={className}>{children}</CodeBlock>;
                      },
                      h1: ({ children }) => <h1 className="text-2xl font-bold mb-2">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-xl font-bold mb-2">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-lg font-bold mb-2">{children}</h3>,
                      p: ({ children }) => <p className="mb-4">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc pl-5 mb-4">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-5 mb-4">{children}</ol>,
                      li: ({ children }) => <li className="mb-1">{children}</li>,
                      a: ({ href, children }) => (
                        <a href={href} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="mb-6 text-left">
                <div className="inline-block max-w-3xl p-4 rounded-lg shadow-sm bg-gray-800">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-3 h-3 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-3 h-3 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="border-t border-gray-700 p-4 bg-gray-800">
          <div className="container mx-auto max-w-4xl">
            <form onSubmit={handleSubmit} className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me about PowerShell scripting..."
                className="flex-1 p-3 border border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                Send
              </button>
            </form>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Your conversations are stored to improve this service. Do not share sensitive information.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ChatWithAI;