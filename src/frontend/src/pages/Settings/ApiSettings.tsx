import React, { useState, useEffect } from 'react';
// import { useAuth } from '../../hooks/useAuth'; // Removed
import { useTheme } from '../../hooks/useTheme';
import { Alert, TextField, Button, Card, CardContent, Typography, Box, Link, CircularProgress, Divider, Switch, FormControlLabel } from '@mui/material';

interface ApiKey {
  name: string;
  key: string;
  description: string;
  placeholder: string;
  url: string;
  envKey?: string; // Environment variable key
  hasEnvValue?: boolean; // Whether there's a value from environment variable
}

const ApiSettings: React.FC = () => {
  const { theme } = useTheme();
  // const { isAuthenticated } = useAuth(); // Removed
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [useEnvVariables, setUseEnvVariables] = useState(true);
  
  // API keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    {
      name: 'openai_api_key',
      key: '',
      description: 'OpenAI API Key for ChatGPT and other AI services',
      placeholder: 'sk-...',
      url: 'https://platform.openai.com/account/api-keys',
      envKey: 'VITE_OPENAI_API_KEY',
      hasEnvValue: !!import.meta.env.VITE_OPENAI_API_KEY
    },
    {
      name: 'google_api_key',
      key: '',
      description: 'Google API Key for search and other Google services',
      placeholder: 'AIza...',
      url: 'https://console.cloud.google.com/apis/credentials',
      envKey: 'VITE_GOOGLE_API_KEY',
      hasEnvValue: !!import.meta.env.VITE_GOOGLE_API_KEY
    },
    {
      name: 'weather_api_key',
      key: '',
      description: 'OpenWeather API Key for weather data',
      placeholder: '1a2b3c...',
      url: 'https://home.openweathermap.org/api_keys',
      envKey: 'VITE_WEATHER_API_KEY',
      hasEnvValue: !!import.meta.env.VITE_WEATHER_API_KEY
    },
    {
      name: 'alpha_vantage_api_key',
      key: '',
      description: 'Alpha Vantage API Key for financial data',
      placeholder: 'ABC123...',
      url: 'https://www.alphavantage.co/support/#api-key',
      envKey: 'VITE_ALPHA_VANTAGE_API_KEY',
      hasEnvValue: !!import.meta.env.VITE_ALPHA_VANTAGE_API_KEY
    }
  ]);

  // Load API keys from localStorage on component mount
  useEffect(() => {
    const loadApiKeys = () => {
      const updatedApiKeys = [...apiKeys];
      let keysUpdated = false;
      
      updatedApiKeys.forEach((apiKey, index) => {
        // Check environment variables first
        if (apiKey.envKey && import.meta.env[apiKey.envKey]) {
          updatedApiKeys[index] = { 
            ...apiKey, 
            key: useEnvVariables ? '' : import.meta.env[apiKey.envKey] || '',
            hasEnvValue: true
          };
          keysUpdated = true;
        } else {
          // Fall back to localStorage if no environment variable
          const savedKey = localStorage.getItem(apiKey.name);
          if (savedKey) {
            updatedApiKeys[index] = { ...apiKey, key: savedKey };
            keysUpdated = true;
          }
        }
      });
      
      if (keysUpdated) {
        setApiKeys(updatedApiKeys);
      }
    };
    
    loadApiKeys();
  }, [useEnvVariables]);

  // Handle input change
  const handleInputChange = (index: number, value: string) => {
    const updatedApiKeys = [...apiKeys];
    updatedApiKeys[index] = { ...updatedApiKeys[index], key: value };
    setApiKeys(updatedApiKeys);
  };

  // Toggle using environment variables
  const handleToggleEnvVariables = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUseEnvVariables(event.target.checked);
  };

  // Save API keys
  const handleSave = () => {
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      // Save to localStorage
      apiKeys.forEach(apiKey => {
        if (apiKey.key) {
          localStorage.setItem(apiKey.name, apiKey.key);
        } else {
          localStorage.removeItem(apiKey.name);
        }
      });
      
      setSaveMessage('API keys saved successfully');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving API keys:', error);
      setSaveMessage('Error saving API keys');
    } finally {
      setIsSaving(false);
    }
  };

  // Display a padded version of the API key
  const displayKey = (key: string) => {
    if (!key) return '';
    if (key.length <= 8) return '••••••••';
    return key.substring(0, 4) + '••••••••' + key.substring(key.length - 4);
  };

  return (
    <div className="p-6">
      <Typography variant="h4" component="h1" gutterBottom>
        API Settings
      </Typography>
      <Typography variant="body1" paragraph>
        Manage your API keys for external services. These keys are used by the application to access external APIs.
      </Typography>

      <Box sx={{ mb: 3 }}>
        <FormControlLabel
          control={
            <Switch
              checked={useEnvVariables}
              onChange={handleToggleEnvVariables}
              color="primary"
            />
          }
          label="Use environment variables when available"
        />
        <Typography variant="body2" color="text.secondary">
          When enabled, the application will prioritize API keys set in environment variables over manual entries
        </Typography>
      </Box>

      <Divider sx={{ mb: 4 }} />

      {saveMessage && (
        <Alert 
          severity={saveMessage.includes('Error') ? 'error' : 'success'} 
          sx={{ mb: 3 }}
        >
          {saveMessage}
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4">
        {apiKeys.map((apiKey, index) => (
          <Card key={apiKey.name} variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <div className="flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <Typography variant="h6" component="h2">
                    {apiKey.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Typography>
                  {apiKey.hasEnvValue && (
                    <Alert 
                      severity="success" 
                      icon={false}
                      sx={{ py: 0, px: 1 }}
                    >
                      Environment Variable Set
                    </Alert>
                  )}
                </div>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {apiKey.description}
                </Typography>
                
                <TextField
                  type="password"
                  value={apiKey.key}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  placeholder={apiKey.hasEnvValue && useEnvVariables 
                    ? "Using environment variable (leave blank to use it)" 
                    : apiKey.placeholder}
                  fullWidth
                  margin="normal"
                  variant="outlined"
                  InputProps={{
                    readOnly: apiKey.hasEnvValue && useEnvVariables
                  }}
                  helperText={
                    apiKey.hasEnvValue && useEnvVariables
                      ? "This key is set in environment variables and will be used automatically"
                      : `Enter your ${apiKey.name.replace(/_/g, ' ')} here`
                  }
                />
                
                <Box sx={{ mt: 1 }}>
                  <Link href={apiKey.url} target="_blank" rel="noopener">
                    Get {apiKey.name.replace(/_/g, ' ')} from provider
                  </Link>
                </Box>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={isSaving || apiKeys.every(key => !key.key || (key.hasEnvValue && useEnvVariables))}
          startIcon={isSaving ? <CircularProgress size={20} /> : null}
        >
          {isSaving ? 'Saving...' : 'Save API Keys'}
        </Button>
      </Box>
    </div>
  );
};

export default ApiSettings;
