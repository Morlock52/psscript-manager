import React, { useState, KeyboardEvent } from 'react';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = 'Type your message...',
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const handleInput = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  // Handle sending message
  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className="message-input-container"
      style={{
        display: 'flex',
        padding: '16px',
        borderTop: '1px solid #e2e8f0',
        backgroundColor: '#f8fafc',
      }}
    >
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          flex: 1,
          resize: 'none',
          border: '1px solid #cbd5e0',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '1rem',
          lineHeight: '1.5',
          minHeight: '50px',
          maxHeight: '200px',
          overflowY: 'auto',
          boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
          transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
          outline: 'none',
          marginRight: '12px',
        }}
      />
      <button
        onClick={handleSend}
        disabled={disabled || !message.trim()}
        style={{
          backgroundColor: disabled || !message.trim() ? '#a0aec0' : '#4299e1',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '0 20px',
          fontSize: '1rem',
          fontWeight: 'bold',
          cursor: disabled || !message.trim() ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.15s ease-in-out',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    </div>
  );
};

export default MessageInput;
