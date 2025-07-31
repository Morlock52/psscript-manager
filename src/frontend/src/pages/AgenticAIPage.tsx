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
  Divider,
  TextField,
  CircularProgress,
  Alert,
  Snackbar,
  IconButton,
  Link as MuiLink,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import CodeIcon from '@mui/icons-material/Code';
import HelpIcon from '@mui/icons-material/Help';
import PsychologyIcon from '@mui/icons-material/Psychology';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import { Link as RouterLink } from 'react-router-dom';

// Import CSS
import './AgenticAIPage.css';

// Import components
import AIAnalysisPanel from '../components/AIAnalysisPanel';
import PleaseMethodAgent from '../components/Agentic/PleaseMethodAgent';
import ScriptExamplesViewer, { ScriptExample } from '../components/Agentic/ScriptExamplesViewer';
import CodeEditor from '../components/CodeEditor'; // Correct import path

// Import API utilities 
import { AIAnalysisResult, analyzeScriptWithAgent, generateScript } from '../api/aiAgent';
import { runAIAgentWorkflow } from '../utils/aiAgentUtils';

// Tab panel component
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
      id={`ai-workflow-tabpanel-${index}`}
      aria-labelledby={`ai-workflow-tab-${index}`}
      {...other}
      className="agentic-ai-tab-panel"
    >
      {value === index && (
        <Box className="agentic-ai-tab-panel-content">
          {children}
        </Box>
      )}
    </div>
  );
};

// Styled components
const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  position: 'relative',
  overflow: 'hidden',
}));

// Mock script examples for testing
const MOCK_EXAMPLES: ScriptExample[] = [
  {
    id: 'ex1',
    title: 'System Information Collector',
    description: 'Collects detailed system information including OS, hardware, and installed software.',
    script: `# System Information Collector
# Gathers detailed information about the system

function Get-SystemDetails {
    $computerSystem = Get-CimInstance CIM_ComputerSystem
    $operatingSystem = Get-CimInstance CIM_OperatingSystem
    $processor = Get-CimInstance CIM_Processor
    $physicalMemory = Get-CimInstance CIM_PhysicalMemory | Measure-Object -Property Capacity -Sum
    $diskDrives = Get-CimInstance CIM_DiskDrive
    
    $systemInfo = [PSCustomObject]@{
        ComputerName = $computerSystem.Name
        Manufacturer = $computerSystem.Manufacturer
        Model = $computerSystem.Model
        OperatingSystem = $operatingSystem.Caption
        OSVersion = $operatingSystem.Version
        OSBuild = $operatingSystem.BuildNumber
        Processor = $processor.Name
        CPUCores = $processor.NumberOfCores
        MemoryGB = [math]::Round($physicalMemory.Sum / 1GB, 2)
        DiskCount = $diskDrives.Count
        TotalDiskSizeGB = [math]::Round(($diskDrives | Measure-Object -Property Size -Sum).Sum / 1GB, 2)
        LastBootTime = $operatingSystem.LastBootUpTime
        InstallDate = $operatingSystem.InstallDate
    }
    
    return $systemInfo
}

# Get system information
$systemInfo = Get-SystemDetails

# Display the results
$systemInfo | Format-List

# Optional: Export to file
# $systemInfo | Export-Csv -Path "$env:USERPROFILE\\Desktop\\SystemInfo.csv" -NoTypeInformation`,
    tags: ['System', 'Hardware', 'Information'],
    similarity: 0.92,
  },
  {
    id: 'ex2',
    title: 'Log Parser',
    description: 'Parses log files and extracts warnings and errors.',
    script: `# Log Parser
# Extracts warnings and errors from log files
param(
    [Parameter(Mandatory=$true)]
    [string]$LogPath,
    
    [Parameter(Mandatory=$false)]
    [string]$OutputPath = "$env:USERPROFILE\\Desktop\\LogResults.csv",
    
    [string[]]$Patterns = @("ERROR", "WARN", "EXCEPTION", "FAIL")
)

function Parse-Logs {
    param(
        [string]$LogPath,
        [string[]]$Patterns
    )
    
    if (!(Test-Path -Path $LogPath)) {
        Write-Error "Log path not found: $LogPath"
        return $null
    }
    
    $logs = Get-ChildItem -Path $LogPath -Filter "*.log" -Recurse
    
    $results = @()
    
    foreach ($log in $logs) {
        Write-Host "Processing $($log.FullName)..."
        
        $lineNumber = 0
        $content = Get-Content -Path $log.FullName
        
        foreach ($line in $content) {
            $lineNumber++
            
            foreach ($pattern in $Patterns) {
                if ($line -match $pattern) {
                    $results += [PSCustomObject]@{
                        LogFile = $log.Name
                        LineNumber = $lineNumber
                        Pattern = $pattern
                        Line = $line
                        Timestamp = if ($line -match '\\d{4}-\\d{2}-\\d{2}') { $matches[0] } else { "Not found" }
                    }
                    break
                }
            }
        }
    }
    
    return $results
}

# Parse logs
$results = Parse-Logs -LogPath $LogPath -Patterns $Patterns

# Display summary
Write-Host "Found $($results.Count) matches across $($results | Select-Object -Unique LogFile | Measure-Object).Count files."

# Export results
if ($results.Count -gt 0) {
    $results | Export-Csv -Path $OutputPath -NoTypeInformation
    Write-Host "Results exported to $OutputPath"
}`,
    tags: ['Logs', 'Parser', 'Monitoring'],
    similarity: 0.85,
    source: 'PowerShell Community Scripts',
  },
];

/**
 * Agentic AI Workflow Page
 * Main container for all AI-powered features
 */
const AgenticAIPage: React.FC = () => {
  // State for tabs
  const [activeTab, setActiveTab] = useState(0);
  
  // State for script code
  const [scriptCode, setScriptCode] = useState('');
  const [scriptName, setScriptName] = useState('');
  
  // State for analysis
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  
  // State for script examples
  const [scriptExamples, setScriptExamples] = useState<ScriptExample[]>([]);
  const [isLoadingExamples, setIsLoadingExamples] = useState(false);
  
  // State for generation
  const [generationPrompt, setGenerationPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // State for notification
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info' as 'info' | 'success' | 'warning' | 'error',
  });
  
  // OpenAI API key (check environment variable first, otherwise empty string)
  const [apiKey, setApiKey] = useState('');
  const [hasEnvApiKey, setHasEnvApiKey] = useState(false);
  
  // Load saved API key and examples on component mount
  useEffect(() => {
    // Check for environment variable first
    const envApiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (envApiKey) {
      console.log('Environment variable OpenAI API key detected');
      setHasEnvApiKey(true);
    } else {
      console.log('No environment variable OpenAI API key found, checking localStorage');
      // Otherwise check localStorage
      const savedApiKey = localStorage.getItem('openai_api_key');
      if (savedApiKey) {
        console.log('Found OpenAI API key in localStorage');
        setApiKey(savedApiKey);
      } else {
        console.log('No API key found in localStorage');
      }
    }
    
    // In a real implementation, we would fetch examples from API
    // For now, use mock data
    setScriptExamples(MOCK_EXAMPLES);
  }, []);
  
  // Get the effective API key to use (env variable takes precedence over localStorage)
  const getEffectiveApiKey = (): string | undefined => {
    const envApiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (envApiKey) {
      return envApiKey;
    }
    
    if (apiKey) {
      return apiKey;
    }
    
    // If we have neither, return undefined to use backend's fallback
    return undefined;
  };
  
  // Handle tab change
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  // Handle script analysis
  const handleAnalyzeScript = async () => {
    if (!scriptCode.trim()) {
      setNotification({
        open: true,
        message: 'Please enter a script to analyze',
        severity: 'warning',
      });
      return;
    }
    
    setIsAnalyzing(true);
    setAnalysisError(null);
    
    try {
      const result = await runAIAgentWorkflow(
        scriptCode,
        scriptName || 'script.ps1',
        getEffectiveApiKey(),
        false
      );
      
      setAiAnalysis(result.analysis);
      
      if (result.error) {
        setAnalysisError(result.error);
      }
      
      if (result.examples.length > 0) {
        // Convert to our ScriptExample format
        const formattedExamples: ScriptExample[] = result.examples.map((ex, i) => ({
          id: `gen-${i}`,
          title: ex.title || `Example ${i + 1}`,
          description: ex.description || '',
          script: ex.script || '',
          tags: ex.tags || [],
          similarity: ex.similarity || 0.5,
          source: 'AI Generated',
        }));
        
        setScriptExamples(formattedExamples);
      }
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'An error occurred during analysis');
      console.error('Error analyzing script:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Handle script generation
  const handleGenerateScript = async () => {
    if (!generationPrompt.trim()) {
      setNotification({
        open: true,
        message: 'Please enter a description of the script you want to generate',
        severity: 'warning',
      });
      return;
    }
    
    setIsGenerating(true);
    
    try {
      const generatedCode = await generateScript(generationPrompt, getEffectiveApiKey());
      
      if (generatedCode) {
        setScriptCode(generatedCode);
        setScriptName(generationPrompt.split(' ').slice(0, 3).join('-') + '.ps1');
        
        // Switch to editor tab
        setActiveTab(1);
        
        setNotification({
          open: true,
          message: 'Script generated successfully! You can now edit it in the editor.',
          severity: 'success',
        });
      }
    } catch (error) {
      console.error('Error generating script:', error);
      setNotification({
        open: true,
        message: 'Error generating script. Please try again.',
        severity: 'error',
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Handle using an example script
  const handleUseExample = (example: ScriptExample) => {
    setScriptCode(example.script);
    setScriptName(example.title.toLowerCase().replace(/\s+/g, '-') + '.ps1');
    
    // Switch to editor tab
    setActiveTab(1);
    
    setNotification({
      open: true,
      message: `Example script "${example.title}" loaded into the editor`,
      severity: 'success',
    });
  };
  
  // Handle uploading a script file
  const handleUploadScript = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setScriptCode(content);
        setScriptName(file.name);
      };
      reader.readAsText(file);
    }
  };
  
  // Handle notification close
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };
  
  // Handle AI assistant script generation
  const handleScriptFromAssistant = (script: string) => {
    setScriptCode(script);
    setScriptName('assistant-generated.ps1');
    
    // Switch to editor tab
    setActiveTab(1);
    
    setNotification({
      open: true,
      message: 'Script generated by AI Assistant loaded into the editor',
      severity: 'success',
    });
  };
  
  // Handle asking AI about current script
  const handleAskAboutScript = (question: string) => {
    // Switch to assistant tab
    setActiveTab(3);
    
    // The PleaseMethodAgent component will handle the question
    setNotification({
      open: true,
      message: 'Question sent to AI Assistant',
      severity: 'info',
    });
  };
  
  return (
    <Container maxWidth="xl" className="agentic-ai-container">
      <Typography variant="h4" gutterBottom>
        PowerShell AI Assistant
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="body1" color="text.secondary">
          Use our agentic AI workflows to analyze, generate, and understand PowerShell scripts.
        </Typography>
        <Button
          variant="outlined"
          size="small"
          component={RouterLink}
          to="/settings/api"
          startIcon={
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
              <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/>
            </svg>
          }
        >
          API Settings
        </Button>
      </Box>
      
      {/* Main tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="AI workflow tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab
            icon={<SearchIcon />}
            label="Examples"
            id="ai-workflow-tab-0"
            aria-controls="ai-workflow-tabpanel-0"
          />
          <Tab
            icon={<CodeIcon />}
            label="Script Editor"
            id="ai-workflow-tab-1"
            aria-controls="ai-workflow-tabpanel-1"
          />
          <Tab
            icon={<PsychologyIcon />}
            label="AI Analysis"
            id="ai-workflow-tab-2"
            aria-controls="ai-workflow-tabpanel-2"
          />
          <Tab
            icon={<HelpIcon />}
            label="AI Assistant"
            id="ai-workflow-tab-3"
            aria-controls="ai-workflow-tabpanel-3"
          />
        </Tabs>
      </Box>
      
      {/* Tab panels */}
      <Box className="agentic-ai-tab-content">
        {/* Examples Tab */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} lg={4}>
              <StyledPaper className="agentic-ai-paper">
                <Typography variant="h6" gutterBottom>
                  Generate a Script
                </Typography>
                <Typography variant="body2" paragraph>
                  Describe what you want the script to do, and our AI will generate a PowerShell script for you.
                </Typography>
                
                <TextField
                  fullWidth
                  label="Describe the script you need"
                  multiline
                  rows={4}
                  value={generationPrompt}
                  onChange={(e) => setGenerationPrompt(e.target.value)}
                  placeholder="E.g., Create a script that monitors CPU and memory usage and sends an email alert when thresholds are exceeded"
                  variant="outlined"
                  className="generation-prompt-field"
                />
                
                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleGenerateScript}
                  disabled={isGenerating || !generationPrompt.trim()}
                  startIcon={isGenerating ? <CircularProgress size={20} /> : null}
                >
                  {isGenerating ? 'Generating...' : 'Generate Script'}
                </Button>
                
                <Divider className="agentic-ai-divider" />
                
                <Typography variant="h6" gutterBottom>
                  Upload a Script
                </Typography>
                <Typography variant="body2" paragraph>
                  Upload your own PowerShell script to edit or analyze.
                </Typography>
                
                <Button
                  variant="outlined"
                  component="label"
                  fullWidth
                  startIcon={<FileUploadIcon />}
                >
                  Upload Script
                  <input
                    type="file"
                    hidden
                    accept=".ps1"
                    onChange={handleUploadScript}
                  />
                </Button>
              </StyledPaper>
            </Grid>
            
            <Grid item xs={12} lg={8}>
              <StyledPaper className="agentic-ai-paper">
                <ScriptExamplesViewer
                  examples={scriptExamples}
                  isLoading={isLoadingExamples}
                  onSelectExample={handleUseExample}
                />
              </StyledPaper>
            </Grid>
          </Grid>
        </TabPanel>
        
        {/* Script Editor Tab */}
        <TabPanel value={activeTab} index={1}>
          <StyledPaper className="editor-paper">
            <Box className="agentic-ai-header">
              <Box>
                <Typography variant="h6">
                  Script Editor
                </Typography>
                <TextField
                  size="small"
                  value={scriptName}
                  onChange={(e) => setScriptName(e.target.value)}
                  placeholder="script.ps1"
                  className="script-name-field"
                />
              </Box>
              
              <Box>
                <Button
                  variant="contained"
                  onClick={handleAnalyzeScript}
                  disabled={isAnalyzing || !scriptCode.trim()}
                  startIcon={isAnalyzing ? <CircularProgress size={20} /> : null}
                  className="analyze-button"
                >
                  {isAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
                </Button>
                
                <Button
                  variant="outlined"
                  onClick={() => handleAskAboutScript("How can I improve this script?")}
                  disabled={!scriptCode.trim()}
                  className="ask-button"
                >
                  Ask AI Assistant
                </Button>
              </Box>
            </Box>
            
            <Divider className="agentic-ai-divider" />
            
            <Box className="agentic-ai-editor-container">
              <CodeEditor
                value={scriptCode}
                onChange={setScriptCode}
                language="powershell"
                height="100%"
              />
            </Box>
          </StyledPaper>
        </TabPanel>
        
        {/* AI Analysis Tab */}
        <TabPanel value={activeTab} index={2}>
          <StyledPaper className="agentic-ai-paper">
            <AIAnalysisPanel
              analysis={aiAnalysis}
              isLoading={isAnalyzing}
              error={analysisError}
              onAskQuestion={handleAskAboutScript}
            />
          </StyledPaper>
        </TabPanel>
        
        {/* AI Assistant Tab */}
        <TabPanel value={activeTab} index={3}>
          <StyledPaper className="agentic-ai-paper">
            <PleaseMethodAgent
              activeScript={scriptCode}
              onScriptGenerated={handleScriptFromAssistant}
            />
          </StyledPaper>
        </TabPanel>
      </Box>
      
      {/* Notifications */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ width: '100%' }}
          action={
            <IconButton
              size="small"
              aria-label="close"
              color="inherit"
              onClick={handleCloseNotification}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AgenticAIPage;
