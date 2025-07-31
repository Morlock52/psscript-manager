import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Grid, 
  Card, 
  CardContent,
  Tabs, 
  Tab, 
  Divider, 
  Alert,
  TextField,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
  FormControlLabel,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
// import { useAuth } from '../../hooks/useAuth'; // Removed
import { useTheme } from '../../hooks/useTheme';
import { useLocation, useNavigate } from 'react-router-dom';
import KeyIcon from '@mui/icons-material/Key';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import BrushIcon from '@mui/icons-material/Brush';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...props }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...props}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const a11yProps = (index: number) => {
  return {
    id: `settings-tab-${index}`,
    'aria-controls': `settings-tabpanel-${index}`,
  };
};

const Settings: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  // const { isAuthenticated, user } = useAuth(); // Removed
  const location = useLocation();
  const navigate = useNavigate();

  // Determine initial tab based on URL path
  const getInitialTab = () => {
    const path = location.pathname;
    if (path.includes('/api')) return 1;
    if (path.includes('/advanced')) return 2;
    return 0; // Default to general tab
  };

  const [tabValue, setTabValue] = useState(getInitialTab());
  // Removed states related to managing API key via localStorage
  // const [openaiApiKey, setOpenaiApiKey] = useState('');
  // const [showApiKey, setShowApiKey] = useState(false);
  // const [isSaving, setIsSaving] = useState(false);
  // const [saveMessage, setSaveMessage] = useState('');
  const [hasEnvApiKey, setHasEnvApiKey] = useState(false);

  // Check only for environment variable
  useEffect(() => {
    const envApiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (envApiKey) {
      console.log('Environment variable API key detected');
      setHasEnvApiKey(true);
    } else {
      console.log('No environment variable API key found');
      setHasEnvApiKey(false);
    }
    // Removed loading from localStorage
  }, []); // Removed useEnvVariables dependency as it's no longer used

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    if (newValue === 0) navigate('/settings');
    else if (newValue === 1) navigate('/settings/api');
    else if (newValue === 2) navigate('/settings/advanced');
  };

  // Removed handleToggleEnvVariables as the switch is removed
  // Removed handleSaveApiKey as saving to localStorage is removed

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Configure your application preferences and API credentials.
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="settings tabs">
          <Tab label="General" {...a11yProps(0)} />
          <Tab label="API Keys" {...a11yProps(1)} />
          <Tab label="Advanced" {...a11yProps(2)} />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Typography variant="h5" component="h2" gutterBottom>
          General Settings
        </Typography>
        
        <Card variant="outlined" sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" component="h3" gutterBottom>
              Appearance
            </Typography>
            
            <List>
              <ListItem>
                <ListItemIcon>
                  {theme === 'dark' ? <DarkModeIcon /> : <LightModeIcon />}
                </ListItemIcon>
                <ListItemText 
                  primary="Dark Mode" 
                  secondary="Switch between light and dark interface themes"
                />
                <Switch 
                  checked={theme === 'dark'} 
                  onChange={toggleTheme} 
                  color="primary" 
                  inputProps={{ 'aria-label': 'toggle dark mode' }}
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" component="h3" gutterBottom>
              API Key Status
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              The application uses an OpenAI API key for AI features. This key should be configured securely on the backend or via environment variables (VITE_OPENAI_API_KEY).
            </Typography>

            {hasEnvApiKey ? (
              <Alert 
                severity="success" 
                sx={{ mb: 2 }}
                icon={<CheckCircleOutlineIcon />}
              >
                OpenAI API key detected in environment variables (VITE_OPENAI_API_KEY). The application will use this key.
              </Alert>
            ) : (
              <Alert 
                severity="warning" 
                sx={{ mb: 2 }}
              >
                No OpenAI API key detected in environment variables. AI features may require backend configuration or may not function correctly.
              </Alert>
            )}

            {/* Removed API Key input, toggle, and save button for security */}
            
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Typography variant="h5" component="h2" gutterBottom>
          API Keys
        </Typography>
        
        <Card variant="outlined" sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" component="h3" gutterBottom>
              API Key Management
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              API keys (like OpenAI) should be managed securely on the backend or through environment variables, not stored in the browser. This section is for informational purposes or future backend-driven key management.
            </Typography>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Typography variant="h5" component="h2" gutterBottom>
          Advanced Settings
        </Typography>
        
        <Card variant="outlined" sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" component="h3" gutterBottom>
              AI Model Configuration
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel id="default-ai-model-label">Default AI Model</InputLabel>
                  <Select
                    labelId="default-ai-model-label"
                    id="default-ai-model-select"
                    defaultValue="gpt-4o"
                    label="Default AI Model"
                    aria-labelledby="default-ai-model-label"
                  >
                    <MenuItem value="gpt-4o">GPT-4o (Recommended)</MenuItem>
                    <MenuItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  label="Model Temperature"
                  type="number"
                  defaultValue={0.7}
                  InputProps={{
                    inputProps: { 
                      min: 0, 
                      max: 1, 
                      step: 0.1,
                      'aria-label': 'Model Temperature'
                    },
                  }}
                  fullWidth
                  helperText="Controls randomness: 0 is deterministic, 1 is creative"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
        
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" component="h3" gutterBottom>
              Script Generation Settings
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch 
                      defaultChecked 
                      color="primary" 
                      inputProps={{ 'aria-label': 'include comments switch' }}
                    />
                  }
                  label="Include comments in generated scripts"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch 
                      defaultChecked 
                      color="primary" 
                      inputProps={{ 'aria-label': 'auto-format code switch' }}
                    />
                  }
                  label="Auto-format generated code"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </TabPanel>
    </Container>
  );
};

export default Settings;
