import React, { useState } from 'react';
import { Message } from '../hooks/useChat';
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
  message: Message;
  theme: string;
  onSaveScript?: () => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, theme, onSaveScript }) => {
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  
  // Function to check if the message contains code blocks
  const hasCodeBlock = (content: string): boolean => {
    return content.includes('```');
  };
  
  // Function to copy code to clipboard
  const copyCodeToClipboard = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 2000);
    }).catch(err => {
      console.error('Failed to copy code: ', err);
    });
  };
  
  // Extract PowerShell code blocks from message
  const extractCodeBlocks = (content: string): string[] => {
    const regex = /```(?:powershell)?\n([\s\S]*?)```/g;
    const matches = [];
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      matches.push(match[1]);
    }
    
    return matches;
  };
  
  // Render code blocks with syntax highlighting and copy button
  const renderCodeBlock = (props: any) => {
    const { children, className, node, ...rest } = props;
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';
    const isPs = !language || language === 'powershell';
    
    return (
      <div className={`relative rounded-md overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
        <div className="flex justify-between items-center px-4 py-2 text-xs border-b border-gray-700">
          <span>{isPs ? 'PowerShell' : language}</span>
          <div className="flex space-x-2">
            {showCopySuccess && (
              <span className={`text-xs ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                Copied!
              </span>
            )}
            <button
              onClick={() => copyCodeToClipboard(children)}
              className={`px-2 py-1 rounded text-xs ${
                theme === 'dark'
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              Copy
            </button>
            {onSaveScript && isPs && (
              <button
                onClick={onSaveScript}
                className={`px-2 py-1 rounded text-xs ${
                  theme === 'dark'
                    ? 'bg-blue-700 hover:bg-blue-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                Save as Script
              </button>
            )}
          </div>
        </div>
        <pre className={`p-4 overflow-x-auto ${className}`} {...rest}>
          {children}
        </pre>
      </div>
    );
  };
  
  // Custom components for ReactMarkdown
  const components = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      
      if (inline) {
        return (
          <code
            className={`${theme === 'dark' ? 'bg-gray-800 text-gray-200' : 'bg-gray-200 text-gray-800'} px-1 py-0.5 rounded text-sm font-mono`}
            {...props}
          >
            {children}
          </code>
        );
      }
      
      return renderCodeBlock({
        children: String(children).replace(/\n$/, ''),
        className,
        ...props
      });
    },
    p({ children }: any) {
      return <p className="mb-4 last:mb-0">{children}</p>;
    },
    h1({ children }: any) {
      return <h1 className="text-2xl font-bold mb-4">{children}</h1>;
    },
    h2({ children }: any) {
      return <h2 className="text-xl font-bold mb-3">{children}</h2>;
    },
    h3({ children }: any) {
      return <h3 className="text-lg font-bold mb-2">{children}</h3>;
    },
    ul({ children }: any) {
      return <ul className="list-disc pl-6 mb-4">{children}</ul>;
    },
    ol({ children }: any) {
      return <ol className="list-decimal pl-6 mb-4">{children}</ol>;
    },
    li({ children }: any) {
      return <li className="mb-1">{children}</li>;
    },
    a({ href, children }: any) {
      return (
        <a 
          href={href} 
          target="_blank" 
          rel="noopener noreferrer"
          className={`${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} hover:underline`}
        >
          {children}
        </a>
      );
    },
    blockquote({ children }: any) {
      return (
        <blockquote 
          className={`border-l-4 ${
            theme === 'dark' ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-gray-100'
          } pl-4 py-2 mb-4 italic`}
        >
          {children}
        </blockquote>
      );
    },
    table({ children }: any) {
      return (
        <div className="overflow-x-auto mb-4">
          <table className={`min-w-full ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-300'
          } border`}>
            {children}
          </table>
        </div>
      );
    },
    thead({ children }: any) {
      return (
        <thead className={`${
          theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'
        }`}>
          {children}
        </thead>
      );
    },
    tbody({ children }: any) {
      return <tbody>{children}</tbody>;
    },
    tr({ children }: any) {
      return (
        <tr className={`${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-300'
        } border-t`}>
          {children}
        </tr>
      );
    },
    th({ children }: any) {
      return (
        <th className={`${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-300'
        } border px-4 py-2 text-left font-semibold`}>
          {children}
        </th>
      );
    },
    td({ children }: any) {
      return (
        <td className={`${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-300'
        } border px-4 py-2`}>
          {children}
        </td>
      );
    },
    hr() {
      return (
        <hr className={`my-4 ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-300'
        }`} />
      );
    }
  };
  
  return (
    <div className={`mb-4 ${message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}`}>
      <div 
        className={`max-w-3xl rounded-lg p-3 ${
          message.role === 'user'
            ? theme === 'dark' 
              ? 'bg-blue-700 text-white' 
              : 'bg-blue-600 text-white'
            : theme === 'dark'
              ? 'bg-gray-800 text-gray-200'
              : 'bg-white text-gray-800 border border-gray-300'
        }`}
      >
        {message.role === 'user' ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : (
          <div className="markdown-content">
            <ReactMarkdown components={components}>
              {message.content}
            </ReactMarkdown>
            
            {hasCodeBlock(message.content) && onSaveScript && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={onSaveScript}
                  className={`px-3 py-1 rounded text-sm ${
                    theme === 'dark'
                      ? 'bg-blue-700 hover:bg-blue-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  Save as Script
                </button>
              </div>
            )}
          </div>
        )}
        
        {message.timestamp && (
          <div className={`text-xs mt-2 text-right ${
            message.role === 'user'
              ? 'text-blue-200'
              : theme === 'dark'
                ? 'text-gray-500'
                : 'text-gray-500'
          }`}>
            {new Date(message.timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;