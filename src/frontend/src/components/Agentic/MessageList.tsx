import React from 'react';
import { Message } from '../../api/assistantsApi';
import ReactMarkdown from 'react-markdown';
import DOMPurify from 'dompurify';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Message styling for different roles
const messageStyles = {
  user: {
    backgroundColor: '#f0f4f8',
    borderRadius: '12px',
    padding: '12px 16px',
    margin: '10px 0',
    alignSelf: 'flex-end',
    maxWidth: '80%',
  },
  assistant: {
    backgroundColor: '#e7f7f5',
    borderRadius: '12px',
    padding: '12px 16px',
    margin: '10px 0',
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  system: {
    backgroundColor: '#f8f0f4',
    borderRadius: '12px',
    padding: '12px 16px',
    margin: '10px 0',
    alignSelf: 'center',
    maxWidth: '80%',
    fontStyle: 'italic',
  },
};

// Helper to extract text from message content
const getMessageText = (message: Message): string => {
  return message.content
    .filter(part => part.type === 'text')
    .map(part => (part as any).text.value)
    .join('\n');
};

interface MessageListProps {
  messages: Message[];
  loading?: boolean;
}

const MessageList: React.FC<MessageListProps> = ({ messages, loading = false }) => {
  // Create ref for auto-scrolling
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  React.useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="message-list" style={{ 
      display: 'flex', 
      flexDirection: 'column',
      height: '100%',
      overflowY: 'auto',
      padding: '16px',
    }}>
      {messages.map((message) => (
        <div
          key={message.id}
          className={`message message-${message.role}`}
          style={{
            ...(messageStyles[message.role as keyof typeof messageStyles]),
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div className="message-header" style={{ 
            marginBottom: '8px',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            color: message.role === 'user' ? '#2c5282' : '#285e61',
          }}>
            {message.role === 'user' ? 'You' : 'Assistant'}
          </div>
          <div className="message-content">
            <ReactMarkdown
              components={{
                code({node, inline, className, children, ...props}) {
                  const match = /language-(\w+)/.exec(className || '')
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={tomorrow}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  )
                }
              }}
            >
              {getMessageText(message)}
            </ReactMarkdown>
          </div>
          <div className="message-timestamp" style={{ 
            fontSize: '0.7rem',
            color: '#718096',
            alignSelf: 'flex-end',
            marginTop: '8px',
          }}>
            {new Date(message.created_at * 1000).toLocaleTimeString()}
          </div>
        </div>
      ))}
      
      {loading && (
        <div className="message message-assistant" style={messageStyles.assistant}>
          <div className="message-header" style={{ 
            marginBottom: '8px',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            color: '#285e61',
          }}>
            Assistant
          </div>
          <div className="message-content" style={{ display: 'flex', alignItems: 'center' }}>
            <div className="typing-indicator" style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}>
              <div style={{ 
                width: '8px',
                height: '8px',
                backgroundColor: '#285e61',
                borderRadius: '50%',
                animation: 'pulse 1s infinite',
              }}></div>
              <div style={{ 
                width: '8px',
                height: '8px',
                backgroundColor: '#285e61',
                borderRadius: '50%',
                animation: 'pulse 1s infinite .3s',
              }}></div>
              <div style={{ 
                width: '8px',
                height: '8px',
                backgroundColor: '#285e61',
                borderRadius: '50%',
                animation: 'pulse 1s infinite .6s',
              }}></div>
            </div>
          </div>
        </div>
      )}
      
      {/* This div helps us auto-scroll to the bottom */}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;