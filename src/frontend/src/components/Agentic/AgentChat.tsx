import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  List,
  ListItem,
  Divider,
  IconButton,
  Chip,
  Avatar,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  Snackbar,
  useTheme
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import CodeIcon from '@mui/icons-material/Code';
import ReplayIcon from '@mui/icons-material/Replay';
import InfoIcon from '@mui/icons-material/Info';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
// import { useAuth } from '../../hooks/useAuth'; // Removed
import ReactMarkdown from 'react-markdown';

// Import agentic framework
import { 
  Agent, 
  Thread, 
  Message, 
  Run, 
  createAgent, 
  createThread, 
  addMessage, 
  createRun, 
  getThread, 
  getThreadMessages, 
  waitForRun
} from '../../api/agentOrchestrator';

interface AgentChatProps {
  agentConfig?: Partial<Agent>;
  initialMessage?: string;
  placeholder?: string;
  showToolbar?: boolean;
}

const AgentChat: React.FC<AgentChatProps> = ({
  agentConfig = {
    name: 'PowerShell Assistant',
    description: 'I can help you with PowerShell scripting and automation',
    capabilities: ['script_analysis', 'code_generation', 'security_review'],
    model: 'gpt-4o'
  },
  initialMessage = 'Hello! I\'m your PowerShell scripting assistant. How can I help you today?',
  placeholder = 'Ask anything about PowerShell scripting...',
  showToolbar = true
}) => {
  const theme = useTheme();
  // const { isAuthenticated } = useAuth(); // Removed
  const isAuthenticated = true; // Assume authenticated
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // State for the conversation
  const [agent, setAgent] = useState<Agent | null>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info' as 'info' | 'success' | 'warning' | 'error'
  });
  
  // Initialize the agent and thread
  useEffect(() => {
    const initializeAgent = async () => {
      try {
        // Create the agent
        const newAgent = await createAgent(agentConfig);
        setAgent(newAgent);
        
        // Create a thread
        const newThread = await createThread(newAgent.id);
        setThread(newThread);
        
        // Add the initial welcome message
        const welcomeMessage: Message = {
          id: 'welcome-msg',
          threadId: newThread.id,
          role: 'assistant',
          content: initialMessage,
          metadata: {},
          createdAt: new Date()
        };
        
        setMessages([welcomeMessage]);
      } catch (error) {
        console.error('Failed to initialize agent:', error);
        setError('Failed to initialize the assistant. Please try again later.');
        setNotification({
          open: true,
          message: 'Failed to initialize the assistant',
          severity: 'error'
        });
      }
    };

    // if (isAuthenticated) { // Removed auth check
      initializeAgent();
    // }

    return () => {
      // Clean up logic if needed
    };
  }, [isAuthenticated, agentConfig, initialMessage]);
  
  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Handle sending a message
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !thread || !agent || isProcessing) return;
    
    const userMessage = inputMessage;
    setInputMessage('');
    setIsProcessing(true);
    
    try {
      // Add user message to UI immediately for responsiveness
      const tempUserMessage: Message = {
        id: `temp-${Date.now()}`,
        threadId: thread.id,
        role: 'user',
        content: userMessage,
        metadata: {},
        createdAt: new Date()
      };
      
      setMessages(prev => [...prev, tempUserMessage]);
      
      // Add the message to the thread
      await addMessage(thread.id, userMessage);
      
      // Create a new run
      const run = await createRun(thread.id);
      
      // Add a temporary loading message
      const tempLoadingMessage: Message = {
        id: `loading-${Date.now()}`,
        threadId: thread.id,
        role: 'assistant',
        content: '...',
        metadata: { isLoading: true },
        createdAt: new Date()
      };
      
      setMessages(prev => [...prev, tempLoadingMessage]);
      
      // Wait for the run to complete
      await waitForRun(run.id);
      
      // Get updated messages
      const updatedThread = await getThread(thread.id);
      const updatedMessages = await getThreadMessages(thread.id);
      
      // Update the thread and messages
      setThread(updatedThread);
      setMessages(updatedMessages);
      
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
      setNotification({
        open: true,
        message: 'Failed to send message',
        severity: 'error'
      });
      
      // Remove the loading message
      setMessages(prev => prev.filter(m => !m.metadata?.isLoading));
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle pressing Enter to send a message
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };
  
  // Handle closing the notification
  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };
  
  // Render a message based on its role
  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';
    const isLoading = message.metadata?.isLoading;
    
    return (
      <Box 
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isUser ? 'flex-end' : 'flex-start',
          mb: 2
        }}
      >
        <Box 
          sx={{
            display: 'flex',
            flexDirection: isUser ? 'row-reverse' : 'row',
            alignItems: 'flex-start',
            gap: 1
          }}
        >
          <Avatar
            sx={{
              bgcolor: isUser ? theme.palette.primary.main : theme.palette.secondary.main,
              color: '#fff'
            }}
          >
            {isUser ? <PersonIcon /> : <SmartToyIcon />}
          </Avatar>
          
          <Paper
            elevation={1}
            sx={{
              p: 2,
              maxWidth: '80%',
              borderRadius: 2,
              bgcolor: isUser ? theme.palette.primary.light : theme.palette.background.paper,
              color: isUser ? '#fff' : 'inherit'
            }}
          >
            {isLoading ? (
              <Box sx={{ width: '100%', minWidth: '200px' }}>
                <LinearProgress />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Thinking...
                </Typography>
              </Box>
            ) : (
              <Box>
                <ReactMarkdown
                  children={message.content || ''}
                  components={{
                    code({node, inline, className, children, ...props}) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <SyntaxHighlighter
                          children={String(children).replace(/\n$/, '')}
                          style={atomDark}
                          language={match[1]}
                          PreTag="div"
                          {...props}
                        />
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    }
                  }}
                />
              </Box>
            )}
          </Paper>
        </Box>
        
        <Typography 
          variant="caption" 
          color="text.secondary"
          sx={{ 
            mt: 0.5, 
            mx: 2,
            alignSelf: isUser ? 'flex-end' : 'flex-start'
          }}
        >
          {new Date(message.createdAt).toLocaleTimeString()}
        </Typography>
      </Box>
    );
  };
  
  return (
    <Card elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ bgcolor: theme.palette.secondary.main }}>
            <SmartToyIcon />
          </Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">
              {agent?.name || 'PowerShell Assistant'}
            </Typography>
            <Chip
              size="small"
              label={agent?.model || 'GPT-4o'}
              sx={{ fontSize: '0.7rem' }}
            />
          </Box>
        </Box>
        
        {showToolbar && (
          <Box>
            <IconButton size="small" title="Restart conversation">
              <ReplayIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" title="About this assistant">
              <InfoIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
      </Box>
      
      {/* Messages area */}
      <Box
        sx={{
          flexGrow: 1,
          p: 2,
          overflow: 'auto',
          bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50'
        }}
      >
        {messages.map(message => (
          <React.Fragment key={message.id}>
            {renderMessage(message)}
          </React.Fragment>
        ))}
        <div ref={messagesEndRef} />
      </Box>
      
      {/* Input area */}
      <Box
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper'
        }}
      >
        <Grid container spacing={1} alignItems="flex-end">
          <Grid item xs>
            <TextField
              fullWidth
              multiline
              maxRows={4}
              placeholder={placeholder}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isProcessing || !thread}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2
                }
              }}
            />
          </Grid>
          <Grid item>
            <Button
              variant="contained"
              color="primary"
              endIcon={isProcessing ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isProcessing || !thread}
              sx={{ borderRadius: 2, px: 3, py: 1 }}
            >
              {isProcessing ? 'Sending...' : 'Send'}
            </Button>
          </Grid>
        </Grid>
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Box>
      
      {/* Notification */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Card>
  );
};

export default AgentChat;
