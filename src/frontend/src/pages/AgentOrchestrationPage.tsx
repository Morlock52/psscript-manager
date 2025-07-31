import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  TextField,
  CircularProgress,
  Alert,
  Chip,
  Avatar,
  IconButton
} from '@mui/material';
import { styled } from '@mui/material/styles';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import AddIcon from '@mui/icons-material/Add';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import NoteAltIcon from '@mui/icons-material/NoteAlt';
import CodeIcon from '@mui/icons-material/Code';
import SecurityIcon from '@mui/icons-material/Security';
import AssistantIcon from '@mui/icons-material/Assistant';
import { Link } from 'react-router-dom';

// Import components
import AgentChat from '../components/Agentic/AgentChat';
// import { useAuth } from '../hooks/useAuth'; // Removed

// Import API
import { 
  createAgent,
  Agent
} from '../api/agentOrchestrator';

// TabPanel component for tab content
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`agent-tabpanel-${index}`}
      aria-labelledby={`agent-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

// Styled components
const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.3s, box-shadow 0.3s',
  cursor: 'pointer',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: theme.shadows[10],
  },
}));

const AgentIcon = styled(Avatar)(({ theme }) => ({
  width: 56,
  height: 56,
  backgroundColor: theme.palette.primary.main,
  marginBottom: theme.spacing(2),
}));

// Predefined agent templates
const agentTemplates: Partial<Agent>[] = [
  {
    name: 'PowerShell Expert',
    description: 'Specializes in PowerShell scripting advice, best practices, and code generation',
    capabilities: ['script_analysis', 'code_generation', 'best_practices'],
    model: 'gpt-4o',
    metadata: {
      category: 'programming',
      expertise: 'powershell'
    }
  },
  {
    name: 'Security Reviewer',
    description: 'Analyzes PowerShell scripts for security vulnerabilities and potential risks',
    capabilities: ['security_analysis', 'risk_assessment', 'remediation'],
    model: 'gpt-4o',
    metadata: {
      category: 'security',
      expertise: 'script_security'
    }
  },
  {
    name: 'Script Generator',
    description: 'Creates PowerShell scripts based on your requirements and specifications',
    capabilities: ['code_generation', 'requirements_analysis'],
    model: 'gpt-4o',
    metadata: {
      category: 'productivity',
      expertise: 'automation'
    }
  }
];

/**
 * Agent Orchestration Page
 * Provides a UI for interacting with the agentic framework
 */
const AgentOrchestrationPage: React.FC = () => {
  // const { isAuthenticated, user } = useAuth(); // Removed
  const isAuthenticated = true; // Assume authenticated
  const [activeTab, setActiveTab] = useState(0);
  const [selectedAgentTemplate, setSelectedAgentTemplate] = useState<Partial<Agent> | null>(null);
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Handle tab change
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  // Handle selecting an agent template
  const handleSelectTemplate = (template: Partial<Agent>) => {
    setSelectedAgentTemplate(template);
  };
  
  // Handle creating an agent from a template
  const handleCreateAgent = async (template: Partial<Agent>) => {
    // if (!isAuthenticated) { // Removed auth check
    //   setError('You must be logged in to create an agent');
    //   return;
    // }

    setIsCreatingAgent(true);
    setError(null);
    
    try {
      const agent = await createAgent(template);
      console.log('Created agent:', agent);
      setSelectedAgentTemplate(agent);
      setActiveTab(1); // Switch to chat tab
    } catch (error) {
      console.error('Failed to create agent:', error);
      setError('Failed to create agent. Please try again.');
    } finally {
      setIsCreatingAgent(false);
    }
  };
  
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
        <SmartToyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Agent Orchestration
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Leverage our agentic AI framework to create, customize, and interact with specialized PowerShell assistants. 
        Each agent comes with its own capabilities and expertise to help with your scripting needs.
      </Typography>
      
      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="agent tabs">
          <Tab icon={<AddIcon />} label="Create Agent" id="agent-tab-0" aria-controls="agent-tabpanel-0" />
          <Tab 
            icon={<SmartToyIcon />} 
            label="Chat" 
            id="agent-tab-1" 
            aria-controls="agent-tabpanel-1"
            disabled={!selectedAgentTemplate} 
          />
          <Tab icon={<HistoryIcon />} label="History" id="agent-tab-2" aria-controls="agent-tabpanel-2" />
          <Tab icon={<SettingsIcon />} label="Settings" id="agent-tab-3" aria-controls="agent-tabpanel-3" />
        </Tabs>
      </Box>
      
      {/* Create Agent Tab */}
      <TabPanel value={activeTab} index={0}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Select an Agent Template
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Choose a specialized agent to assist with your PowerShell scripting needs.
            Each agent has different capabilities and expertise.
          </Typography>
          
          <Grid container spacing={3} sx={{ mt: 2 }}>
            {agentTemplates.map((template, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <StyledCard 
                  elevation={selectedAgentTemplate?.name === template.name ? 6 : 2}
                  onClick={() => handleSelectTemplate(template)}
                  sx={{ 
                    borderColor: selectedAgentTemplate?.name === template.name ? 'primary.main' : 'transparent',
                    borderWidth: selectedAgentTemplate?.name === template.name ? 2 : 0,
                    borderStyle: 'solid'
                  }}
                >
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <AgentIcon>
                      {template.name === 'PowerShell Expert' && <CodeIcon />}
                      {template.name === 'Security Reviewer' && <SecurityIcon />}
                      {template.name === 'Script Generator' && <NoteAltIcon />}
                    </AgentIcon>
                    
                    <Typography variant="h6" component="h2" gutterBottom>
                      {template.name}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {template.description}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center', mb: 2 }}>
                      {template.capabilities?.map((capability, i) => (
                        <Chip 
                          key={i} 
                          label={capability.replace('_', ' ')} 
                          size="small" 
                          color="primary" 
                          variant="outlined" 
                        />
                      ))}
                    </Box>
                    
                    <Chip 
                      label={template.model} 
                      size="small" 
                      color="secondary"
                      sx={{ mt: 'auto' }}
                    />
                  </CardContent>
                </StyledCard>
              </Grid>
            ))}
          </Grid>
          
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={isCreatingAgent ? <CircularProgress size={20} color="inherit" /> : <SmartToyIcon />}
              disabled={!selectedAgentTemplate || isCreatingAgent}
              onClick={() => selectedAgentTemplate && handleCreateAgent(selectedAgentTemplate)}
              sx={{ px: 4, py: 1.5 }}
            >
              {isCreatingAgent ? 'Creating...' : 'Create & Start Chat'}
            </Button>
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Box>
      </TabPanel>
      
      {/* Chat Tab */}
      <TabPanel value={activeTab} index={1}>
        {selectedAgentTemplate ? (
          <Box sx={{ height: 'calc(100vh - 250px)', minHeight: '500px' }}>
            <AgentChat 
              agentConfig={selectedAgentTemplate}
              placeholder={`Ask ${selectedAgentTemplate.name} anything about PowerShell...`}
            />
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary">
              Please select an agent template first
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setActiveTab(0)}
              sx={{ mt: 2 }}
            >
              Create Agent
            </Button>
          </Box>
        )}
      </TabPanel>
      
      {/* History Tab */}
      <TabPanel value={activeTab} index={2}>
        <Typography variant="h6" gutterBottom>
          Conversation History
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          View and continue your previous conversations with agents.
        </Typography>
        
        <Paper sx={{ p: 3 }}>
          <List>
            <ListItem
              secondaryAction={
                <Button size="small" variant="outlined">
                  Continue
                </Button>
              }
            >
              <ListItemIcon>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <SmartToyIcon />
                </Avatar>
              </ListItemIcon>
              <ListItemText
                primary="PowerShell Expert"
                secondary="Last message: 3 hours ago"
              />
            </ListItem>
            <Divider />
            <ListItem
              secondaryAction={
                <Button size="small" variant="outlined">
                  Continue
                </Button>
              }
            >
              <ListItemIcon>
                <Avatar sx={{ bgcolor: 'secondary.main' }}>
                  <SecurityIcon />
                </Avatar>
              </ListItemIcon>
              <ListItemText
                primary="Security Reviewer"
                secondary="Last message: Yesterday at 2:15 PM"
              />
            </ListItem>
          </List>
        </Paper>
      </TabPanel>
      
      {/* Settings Tab */}
      <TabPanel value={activeTab} index={3}>
        <Typography variant="h6" gutterBottom>
          Agent Settings
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Configure agent behavior, API settings, and other preferences.
        </Typography>
        
        <Paper sx={{ p: 3 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              API Configuration
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              Agent settings use your OpenAI API key configured in the Settings page.
            </Alert>
            <Button 
              variant="outlined" 
              startIcon={<SettingsIcon />}
              component={Link}
              to="/settings/api"
            >
              Manage API Keys
            </Button>
          </Box>
          
          <Divider sx={{ my: 3 }} />
          
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Default Agent Model
            </Typography>
            <TextField
              select
              label="Default Model"
              defaultValue="gpt-4o"
              fullWidth
              sx={{ mb: 2 }}
              aria-label="Select default AI model"
            >
              <option value="gpt-4o">GPT-4o (Recommended)</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster)</option>
            </TextField>
          </Box>
        </Paper>
      </TabPanel>
    </Container>
  );
};

export default AgentOrchestrationPage;
