import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import VoiceRecorder from './VoiceRecorder';
import VoicePlayback from './VoicePlayback';
import { SendIcon, MicrophoneIcon } from './Icons';

/**
 * Voice Chat Interface Component
 * 
 * This component provides a chat interface with voice capabilities.
 * It allows users to send text messages, record voice messages,
 * and receive responses with voice playback.
 */
const VoiceChatInterface = ({ className = '' }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState({
    voiceId: 'en-US-Standard-A',
    autoPlay: true
  });
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  const { getAuthHeaders, user } = useAuth();
  const { showToast } = useToast();
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Focus input when voice mode changes
  useEffect(() => {
    if (!isVoiceMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVoiceMode]);
  
  // Load voice settings
  useEffect(() => {
    loadVoiceSettings();
  }, []);
  
  /**
   * Load voice settings from the server
   */
  const loadVoiceSettings = async () => {
    try {
      const response = await axios.get('/api/voice/settings', {
        headers: getAuthHeaders()
      });
      
      if (response.data) {
        setVoiceSettings(response.data);
      }
    } catch (error) {
      console.error('Error loading voice settings:', error);
      // Use default settings
    }
  };
  
  /**
   * Scroll to the bottom of the chat
   */
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  /**
   * Handle input change
   */
  const handleInputChange = (e) => {
    setInputText(e.target.value);
  };
  
  /**
   * Handle key press in the input field
   */
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  /**
   * Toggle voice mode
   */
  const toggleVoiceMode = () => {
    setIsVoiceMode(!isVoiceMode);
  };
  
  /**
   * Send a text message
   */
  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;
    
    const messageText = inputText.trim();
    setInputText('');
    
    // Add user message to chat
    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    
    // Send message to server
    await processMessage(messageText);
  };
  
  /**
   * Handle voice input
   */
  const handleVoiceInput = async (text, audioData) => {
    if (!text || isLoading) return;
    
    // Add user message to chat
    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      audioData,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setIsVoiceMode(false);
    
    // Send message to server
    await processMessage(text);
  };
  
  /**
   * Process a message and get a response
   */
  const processMessage = async (text) => {
    setIsLoading(true);
    
    try {
      // Send message to chat API
      const response = await axios.post(
        '/api/chat/message',
        {
          message: text,
          synthesizeVoice: true,
          voiceId: voiceSettings.voiceId
        },
        {
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data) {
        // Add assistant message to chat
        const assistantMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: response.data.text,
          audioData: response.data.audioData,
          timestamp: new Date().toISOString()
        };
        
        setMessages(prevMessages => [...prevMessages, assistantMessage]);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      showToast('Error processing message', 'error');
      
      // Add error message
      const errorMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your message. Please try again.',
        error: true,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Format timestamp
   */
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <div className={`voice-chat-interface ${className}`}>
      <div className="voice-chat-interface__messages">
        {messages.map(message => (
          <div
            key={message.id}
            className={`voice-chat-interface__message voice-chat-interface__message--${message.role} ${
              message.error ? 'voice-chat-interface__message--error' : ''
            }`}
          >
            <div className="voice-chat-interface__message-content">
              {message.content}
            </div>
            
            {message.audioData && message.role === 'assistant' && (
              <div className="voice-chat-interface__message-audio">
                <VoicePlayback
                  audioData={message.audioData}
                  autoPlay={voiceSettings.autoPlay}
                />
              </div>
            )}
            
            <div className="voice-chat-interface__message-timestamp">
              {formatTimestamp(message.timestamp)}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="voice-chat-interface__message voice-chat-interface__message--assistant voice-chat-interface__message--loading">
            <div className="voice-chat-interface__loading-indicator">
              <div className="voice-chat-interface__loading-dot"></div>
              <div className="voice-chat-interface__loading-dot"></div>
              <div className="voice-chat-interface__loading-dot"></div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div className="voice-chat-interface__input-container">
        {!isVoiceMode ? (
          <>
            <input
              ref={inputRef}
              type="text"
              className="voice-chat-interface__input"
              placeholder="Type a message..."
              value={inputText}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
            />
            
            <button
              className="voice-chat-interface__button voice-chat-interface__button--send"
              onClick={sendMessage}
              disabled={!inputText.trim() || isLoading}
              aria-label="Send message"
            >
              <SendIcon />
            </button>
            
            <button
              className="voice-chat-interface__button voice-chat-interface__button--voice"
              onClick={toggleVoiceMode}
              disabled={isLoading}
              aria-label="Switch to voice input"
            >
              <MicrophoneIcon />
            </button>
          </>
        ) : (
          <div className="voice-chat-interface__voice-recorder-container">
            <VoiceRecorder
              onAudioCaptured={handleVoiceInput}
              className="voice-chat-interface__voice-recorder"
            />
            
            <button
              className="voice-chat-interface__button voice-chat-interface__button--cancel"
              onClick={toggleVoiceMode}
              aria-label="Cancel voice input"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
      
      <style jsx>{`
        .voice-chat-interface {
          display: flex;
          flex-direction: column;
          height: 100%;
          border-radius: 8px;
          overflow: hidden;
          background-color: #f5f5f5;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        
        .voice-chat-interface__messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .voice-chat-interface__message {
          max-width: 70%;
          padding: 12px 16px;
          border-radius: 8px;
          position: relative;
        }
        
        .voice-chat-interface__message--user {
          align-self: flex-end;
          background-color: #dcf8c6;
        }
        
        .voice-chat-interface__message--assistant {
          align-self: flex-start;
          background-color: white;
          border: 1px solid #e0e0e0;
        }
        
        .voice-chat-interface__message--error {
          background-color: #ffebee;
          border: 1px solid #ffcdd2;
        }
        
        .voice-chat-interface__message--loading {
          background-color: transparent;
          border: none;
          padding: 8px;
        }
        
        .voice-chat-interface__message-content {
          white-space: pre-wrap;
          word-break: break-word;
        }
        
        .voice-chat-interface__message-audio {
          margin-top: 8px;
        }
        
        .voice-chat-interface__message-timestamp {
          font-size: 12px;
          color: #757575;
          margin-top: 4px;
          text-align: right;
        }
        
        .voice-chat-interface__loading-indicator {
          display: flex;
          gap: 4px;
        }
        
        .voice-chat-interface__loading-dot {
          width: 8px;
          height: 8px;
          background-color: #bdbdbd;
          border-radius: 50%;
          animation: pulse 1.5s infinite ease-in-out;
        }
        
        .voice-chat-interface__loading-dot:nth-child(1) {
          animation-delay: 0s;
        }
        
        .voice-chat-interface__loading-dot:nth-child(2) {
          animation-delay: 0.2s;
        }
        
        .voice-chat-interface__loading-dot:nth-child(3) {
          animation-delay: 0.4s;
        }
        
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.2);
            opacity: 1;
          }
        }
        
        .voice-chat-interface__input-container {
          display: flex;
          padding: 12px;
          background-color: white;
          border-top: 1px solid #e0e0e0;
        }
        
        .voice-chat-interface__input {
          flex: 1;
          padding: 12px 16px;
          border: 1px solid #e0e0e0;
          border-radius: 24px;
          outline: none;
          font-size: 16px;
        }
        
        .voice-chat-interface__input:focus {
          border-color: #2196f3;
        }
        
        .voice-chat-interface__button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          margin-left: 8px;
          border: none;
          border-radius: 50%;
          background-color: #2196f3;
          color: white;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .voice-chat-interface__button:hover {
          background-color: #1976d2;
        }
        
        .voice-chat-interface__button:disabled {
          background-color: #bdbdbd;
          cursor: not-allowed;
        }
        
        .voice-chat-interface__button--voice {
          background-color: #9c27b0;
        }
        
        .voice-chat-interface__button--voice:hover {
          background-color: #7b1fa2;
        }
        
        .voice-chat-interface__button--cancel {
          background-color: #f44336;
          width: auto;
          border-radius: 20px;
          padding: 0 16px;
        }
        
        .voice-chat-interface__button--cancel:hover {
          background-color: #d32f2f;
        }
        
        .voice-chat-interface__voice-recorder-container {
          display: flex;
          width: 100%;
          gap: 8px;
        }
        
        .voice-chat-interface__voice-recorder {
          flex: 1;
        }
      `}</style>
    </div>
  );
};

export default VoiceChatInterface;