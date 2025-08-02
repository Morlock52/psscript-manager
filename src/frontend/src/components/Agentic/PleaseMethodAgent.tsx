import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Card,
  CardContent,
  Typography,
  Divider,
  CircularProgress,
  IconButton,
  Paper,
  Alert,
  Chip,
  Tooltip,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CodeIcon from '@mui/icons-material/Code';
import SearchIcon from '@mui/icons-material/Search';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LinkIcon from '@mui/icons-material/Link';
import { askAgentQuestion } from '../../api/aiAgent';
import ReactMarkdown from 'react-markdown';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { vs2015 } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { styled } from '@mui/material/styles';

// Interface for a message in the conversation
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  isError?: boolean;
  metadata?: {
    source?: string;
    internet?: boolean;
    command?: string;
    scriptReference?: string;
  };
}

const MessageCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  maxWidth: '85%',
  borderRadius: '12px',
}));

const UserMessage = styled(MessageCard)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  marginLeft: 'auto',
  position: 'relative',
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: '8px',
    right: '-12px',
    width: '20px',
    height: '20px',
    backgroundColor: theme.palette.primary.main,
    clipPath: 'polygon(0 0, 0% 100%, 100% 50%)',
    transform: 'rotate(-45deg)',
  },
}));

const AssistantMessage = styled(MessageCard)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  marginRight: 'auto',
  position: 'relative',
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: '8px',
    left: '-12px',
    width: '20px',
    height: '20px',
    backgroundColor: theme.palette.background.paper,
    clipPath: 'polygon(0 50%, 100% 0, 100% 100%)',
    transform: 'rotate(-45deg)',
    borderLeft: `1px solid ${theme.palette.divider}`,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
}));

const SystemMessage = styled(MessageCard)(({ theme }) => ({
  backgroundColor: theme.palette.grey[100],
  color: theme.palette.text.secondary,
  margin: '0 auto',
  fontSize: '0.9rem',
  padding: theme.spacing(1.5),
  fontStyle: 'italic',
}));

// Component for rendering code blocks in markdown
const CodeBlock = ({ language, value }: { language: string; value: string }) => {
  return (
    <Box position="relative" mb={2} mt={1}>
      <Box position="absolute" top={8} right={8} zIndex={1}>
        <Tooltip title="Copy code">
          <IconButton
            size="small"
            onClick={() => navigator.clipboard.writeText(value)}
            sx={{ color: 'white', opacity: 0.7, '&:hover': { opacity: 1 } }}
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <SyntaxHighlighter
        language={language || 'powershell'}
        style={vs2015}
        wrapLines
        wrapLongLines
        customStyle={{ borderRadius: '4px' }}
      >
        {value}
      </SyntaxHighlighter>
    </Box>
  );
};

interface PleaseMethodAgentProps {
  activeScript?: string;
  onScriptGenerated?: (script: string) => void;
}

/**
 * Agentic implementation of the "please" method for interacting
 * with the AI Assistant in a conversational manner
 */
const PleaseMethodAgent: React.FC<PleaseMethodAgentProps> = ({
  activeScript,
  onScriptGenerated,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Add initial welcome message
  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'How can I assist you with PowerShell scripts today? Ask me to explain, create, or modify scripts for you.',
        timestamp: new Date(),
      },
    ]);
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input field when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Handle user input submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!input.trim()) return;

    // Add user message to chat
    const userMessageId = `user-${Date.now()}`;
    const userMessage: Message = {
      id: userMessageId,
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    // Add assistant "thinking" message
    const assistantMessageId = `assistant-${Date.now()}`;
    const loadingMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Make API call to backend
      const response = await askAgentQuestion(input, activeScript);

      // Check if this is a script generation request
      const isScriptGeneration = input.toLowerCase().includes('generate') && 
        input.toLowerCase().includes('script');

      // Extract any generated script if present
      const scriptRegex = /```powershell\n([\s\S]*?)```/;
      const scriptMatch = response.match(scriptRegex);
      const generatedScript = scriptMatch ? scriptMatch[1] : null;

      // If a script was generated and we have a callback
      if (generatedScript && onScriptGenerated && isScriptGeneration) {
        onScriptGenerated(generatedScript);
      }

      // Update the assistant message with the response
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: response,
                isLoading: false,
                metadata: {
                  internet: response.includes('Based on information from the internet') ||
                    response.includes('According to online resources'),
                  command: generatedScript ? "true" : "false",
                },
              }
            : msg
        )
      );
    } catch (error) {
      // Handle error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: 'Sorry, there was an error processing your request. Please try again.',
                isLoading: false,
                isError: true,
              }
            : msg
        )
      );
      console.error('Error in ask endpoint:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Generate suggested prompts based on context
  const getSuggestedPrompts = (): string[] => {
    if (activeScript) {
      return [
        'Explain what this script does',
        'What security concerns exist in this script?',
        'How can I make this script more efficient?',
        'Generate documentation for this script',
      ];
    }
    return [
      'Generate a script to monitor system performance',
      'Create a script to manage user accounts',
      'How do I parse log files with PowerShell?',
      'Generate a script to back up important files',
    ];
  };

  // Handle clicking a suggested prompt
  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt);
    // Focus the input field
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Render a message based on its role
  const renderMessage = (message: Message) => {
    if (message.role === 'system') {
      return (
        <SystemMessage>
          <Typography variant="body2">{message.content}</Typography>
        </SystemMessage>
      );
    }

    if (message.role === 'user') {
      return (
        <UserMessage>
          <Typography variant="body1">{message.content}</Typography>
        </UserMessage>
      );
    }

    // Assistant message
    if (message.isLoading) {
      return (
        <AssistantMessage>
          <Box display="flex" alignItems="center" gap={1}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              Thinking...
            </Typography>
          </Box>
        </AssistantMessage>
      );
    }

    if (message.isError) {
      return (
        <AssistantMessage>
          <Alert severity="error" sx={{ mb: 0 }}>
            {message.content}
          </Alert>
        </AssistantMessage>
      );
    }

    return (
      <AssistantMessage>
        <Box mb={message.metadata ? 2 : 0}>
          <ReactMarkdown
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <CodeBlock
                    language={match[1] || 'text'}
                    value={String(children).replace(/\n$/, '')}
                  />
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </Box>
        
        {/* Metadata badges */}
        {message.metadata && (
          <Box display="flex" gap={1} mt={1}>
            {message.metadata.internet && (
              <Tooltip title="Used internet search to gather information">
                <Chip
                  icon={<SearchIcon fontSize="small" />}
                  label="Web Research"
                  size="small"
                  variant="outlined"
                  color="primary"
                />
              </Tooltip>
            )}
            {message.metadata.command && (
              <Tooltip title="Contains executable PowerShell commands">
                <Chip
                  icon={<CodeIcon fontSize="small" />}
                  label="Script Generated"
                  size="small"
                  variant="outlined"
                  color="secondary"
                />
              </Tooltip>
            )}
            {message.metadata.source && (
              <Tooltip title={`Source: ${message.metadata.source}`}>
                <Chip
                  icon={<LinkIcon fontSize="small" />}
                  label="Reference"
                  size="small"
                  variant="outlined"
                />
              </Tooltip>
            )}
          </Box>
        )}
      </AssistantMessage>
    );
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          PowerShell AI Assistant
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Ask me anything about PowerShell scripting. I can create scripts, explain commands, 
          suggest improvements, and provide examples. I'll use internet research when needed.
        </Typography>
        
        <Divider sx={{ mb: 3 }} />
        
        {/* Conversation container */}
        <Box
          sx={{
            height: '400px',
            overflowY: 'auto',
            mb: 3,
            p: 1,
            bgcolor: 'background.default',
            borderRadius: 1,
          }}
        >
          {messages.map((message) => (
            <Box
              key={message.id}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                mb: 2,
              }}
            >
              {renderMessage(message)}
            </Box>
          ))}
          <Box ref={messagesEndRef} />
        </Box>
        
        {/* Suggested prompts */}
        <Box mb={2}>
          <Typography variant="caption" color="text.secondary" display="block" mb={1}>
            Suggested questions:
          </Typography>
          <Box display="flex" gap={1} flexWrap="wrap">
            {getSuggestedPrompts().map((prompt, index) => (
              <Chip
                key={index}
                label={prompt}
                size="small"
                onClick={() => handleSuggestedPrompt(prompt)}
                sx={{ mb: 1 }}
              />
            ))}
          </Box>
        </Box>
        
        {/* Input form */}
        <form onSubmit={handleSubmit}>
          <Box display="flex" gap={1}>
            <TextField
              inputRef={inputRef}
              fullWidth
              variant="outlined"
              placeholder="Ask me about PowerShell scripting..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              multiline
              maxRows={4}
              size="small"
            />
            <Button
              variant="contained"
              color="primary"
              type="submit"
              disabled={!input.trim() || isLoading}
              startIcon={isLoading ? <CircularProgress size={20} /> : <SendIcon />}
            >
              Send
            </Button>
          </Box>
        </form>
        
        {/* Context indicator */}
        {activeScript && (
          <Box mt={2}>
            <Typography variant="caption" color="text.secondary">
              Providing answers based on your current script context.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default PleaseMethodAgent;
