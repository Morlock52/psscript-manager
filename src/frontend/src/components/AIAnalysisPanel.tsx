import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Link,
  LinearProgress,
  CircularProgress,
  Button,
  Alert,
  Skeleton,
  Grid,
  Paper,
  Tooltip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SecurityIcon from '@mui/icons-material/Security';
import CodeIcon from '@mui/icons-material/Code';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DescriptionIcon from '@mui/icons-material/Description';
import BugReportIcon from '@mui/icons-material/BugReport';
import LinkIcon from '@mui/icons-material/Link';
import SearchIcon from '@mui/icons-material/Search';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import TerminalIcon from '@mui/icons-material/Terminal';
import { AIAnalysisResult } from '../api/aiAgent';
import ReactMarkdown from 'react-markdown';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { vs2015 } from 'react-syntax-highlighter/dist/esm/styles/hljs';

import './AIAnalysisPanel.css';

interface AIAnalysisPanelProps {
  analysis: AIAnalysisResult | null;
  isLoading: boolean;
  error: string | null;
  onAskQuestion: (question: string) => void;
}

/**
 * Renders the score as a colored circular progress with label
 */
const ScoreIndicator: React.FC<{
  score: number;
  label: string;
  color: string;
  icon: React.ReactNode;
}> = ({ score, label, color, icon }) => {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      p={1}
    >
      <Box position="relative" display="inline-flex">
        <CircularProgress
          variant="determinate"
          value={score}
          size={70}
          thickness={5}
          sx={{ color }}
        />
        <Box
          top={0}
          left={0}
          bottom={0}
          right={0}
          position="absolute"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Typography variant="h6" component="div" color={color}>
            {score}
          </Typography>
        </Box>
      </Box>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        gap={0.5}
        mt={1}
      >
        {icon}
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Box>
    </Box>
  );
};

/**
 * Renders a list of suggestions
 */
const SuggestionsList: React.FC<{ suggestions: string[] }> = ({
  suggestions,
}) => {
  if (!suggestions.length) return null;

  return (
    <Box mt={2}>
      <Typography variant="h6" gutterBottom>
        Suggestions
      </Typography>
      <Box component="ul" sx={{ pl: 2 }}>
        {suggestions.map((suggestion, index) => (
          <Box
            component="li"
            key={index}
            sx={{
              mb: 1,
              '&::marker': {
                color: 'primary.main',
              },
            }}
          >
            <Typography variant="body2">{suggestion}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

/**
 * Command details section
 */
const CommandDetails: React.FC<{
  commandDetails: AIAnalysisResult['analysis']['commandDetails'];
}> = ({ commandDetails }) => {
  if (!commandDetails || Object.keys(commandDetails).length === 0) return null;

  return (
    <Box mt={3}>
      <Typography variant="h6" gutterBottom display="flex" alignItems="center">
        <TerminalIcon fontSize="small" sx={{ mr: 1 }} />
        Command Details
      </Typography>
      {Object.entries(commandDetails).map(([command, details]) => (
        <Accordion key={command} sx={{ mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography
              variant="subtitle1"
              sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}
            >
              {command}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" paragraph>
              {details.description}
            </Typography>
            {details.parameters && details.parameters.length > 0 && (
              <>
                <Typography variant="subtitle2">Parameters:</Typography>
                <Box component="ul" sx={{ pl: 2 }}>
                  {details.parameters.map((param, idx) => (
                    <Box component="li" key={idx} sx={{ mb: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: 'monospace' }}
                      >
                        <strong>{param.name}</strong>: {param.description}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </>
            )}
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};

/**
 * Documentation references section
 */
const DocumentationReferences: React.FC<{
  references: AIAnalysisResult['analysis']['msDocsReferences'];
}> = ({ references }) => {
  if (!references || references.length === 0) return null;

  return (
    <Box mt={3}>
      <Typography variant="h6" gutterBottom display="flex" alignItems="center">
        <LinkIcon fontSize="small" sx={{ mr: 1 }} />
        Documentation References
      </Typography>
      <Box component="ul" sx={{ pl: 2 }}>
        {references.map((ref, index) => (
          <Box component="li" key={index} sx={{ mb: 1 }}>
            <Link
              href={ref.url}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ display: 'flex', alignItems: 'center' }}
            >
              <Typography variant="body2">{ref.title}</Typography>
              <LinkIcon fontSize="small" sx={{ ml: 0.5, fontSize: '0.9rem' }} />
            </Link>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

/**
 * Similar script examples section
 */
const ScriptExamples: React.FC<{
  examples: any[];
}> = ({ examples }) => {
  if (!examples || examples.length === 0) return null;

  return (
    <Box mt={3}>
      <Typography variant="h6" gutterBottom display="flex" alignItems="center">
        <DescriptionIcon fontSize="small" sx={{ mr: 1 }} />
        Similar Script Examples
      </Typography>
      {examples.map((example, index) => (
        <Accordion key={index} sx={{ mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">
              {example.title || `Example ${index + 1}`}
            </Typography>
            {example.similarity && (
              <Chip
                label={`${Math.round(example.similarity * 100)}% match`}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ ml: 2 }}
              />
            )}
          </AccordionSummary>
          <AccordionDetails>
            {example.description && (
              <Typography variant="body2" paragraph>
                {example.description}
              </Typography>
            )}
            {example.script && (
              <SyntaxHighlighter
                language="powershell"
                style={vs2015}
                wrapLines
                wrapLongLines
              >
                {example.script}
              </SyntaxHighlighter>
            )}
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};

/**
 * Main AI Analysis Panel component
 */
const AIAnalysisPanel: React.FC<AIAnalysisPanelProps> = ({
  analysis,
  isLoading,
  error,
  onAskQuestion,
}) => {
  const [questionInput, setQuestionInput] = useState('');

  // Handle loading state
  if (isLoading) {
    return (
      <div className="ai-analysis-loading">
        <Typography variant="h5" gutterBottom>
          Analyzing script with AI...
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Our agentic AI is analyzing your script, searching for relevant documentation, and finding similar examples.
        </Typography>
        <LinearProgress sx={{ mt: 2, mb: 3 }} />
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Skeleton variant="rectangular" height={100} />
          </Grid>
          <Grid item xs={12} md={8}>
            <Skeleton variant="rectangular" height={100} />
          </Grid>
          <Grid item xs={12}>
            <Skeleton variant="rectangular" height={200} />
          </Grid>
        </Grid>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="ai-analysis-error">
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Typography variant="body2">
          Please check your API key or try again later. If the problem persists, contact support.
        </Typography>
      </div>
    );
  }

  // Handle empty state
  if (!analysis) {
    return (
      <div className="ai-analysis-empty">
        <Typography variant="h6" gutterBottom>
          No analysis available
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Submit a script for analysis to see AI-powered insights.
        </Typography>
      </div>
    );
  }

  // Get data from analysis
  const {
    purpose,
    securityScore,
    codeQualityScore,
    riskScore,
    suggestions,
    commandDetails,
    msDocsReferences,
    examples,
    rawAnalysis,
  } = analysis.analysis;

  // Handle question submission
  const handleQuestionSubmit = () => {
    if (questionInput.trim()) {
      onAskQuestion(questionInput);
      setQuestionInput('');
    }
  };

  return (
    <div className="ai-analysis-container">
      <div className="ai-analysis-header">
        <Typography variant="h5" gutterBottom display="flex" alignItems="center">
          <SearchIcon sx={{ mr: 1 }} /> AI Script Analysis
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Our agentic AI assistant has analyzed your script and gathered relevant information.
        </Typography>
        {analysis.metadata && (
          <Typography variant="caption" color="text.secondary" display="block" mt={1}>
            Analyzed using {analysis.metadata.model} in {analysis.metadata.processingTime?.toFixed(2) || '?'} seconds
          </Typography>
        )}
      </div>

      <Divider sx={{ mb: 3 }} />

      <div className="ai-analysis-score-section">
        <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'background.paper' }}>
          <Typography variant="h6" gutterBottom>
            Script Purpose
          </Typography>
          <Typography variant="body1">{purpose}</Typography>
        </Paper>
      </div>

      <div className="ai-analysis-score-section">
        <Grid container spacing={2} justifyContent="center" mb={3}>
          <Grid item>
            <ScoreIndicator
              score={securityScore}
              label="Security"
              color={securityScore > 70 ? 'success.main' : securityScore > 40 ? 'warning.main' : 'error.main'}
              icon={<SecurityIcon fontSize="small" />}
            />
          </Grid>
          <Grid item>
            <ScoreIndicator
              score={codeQualityScore}
              label="Code Quality"
              color={codeQualityScore > 70 ? 'success.main' : codeQualityScore > 40 ? 'warning.main' : 'error.main'}
              icon={<CodeIcon fontSize="small" />}
            />
          </Grid>
          <Grid item>
            <ScoreIndicator
              score={riskScore}
              label="Risk Level"
              color={riskScore < 30 ? 'success.main' : riskScore < 70 ? 'warning.main' : 'error.main'}
              icon={<WarningIcon fontSize="small" />}
            />
          </Grid>
        </Grid>
      </div>

      <div className="ai-analysis-section">
        <SuggestionsList suggestions={suggestions} />
      </div>

      <div className="ai-analysis-section">
        <CommandDetails commandDetails={commandDetails} />
      </div>

      <div className="ai-analysis-section">
        <DocumentationReferences references={msDocsReferences} />
      </div>

      <div className="ai-analysis-section">
        <ScriptExamples examples={examples || []} />
      </div>

      {rawAnalysis && (
        <Accordion sx={{ mt: 3 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" display="flex" alignItems="center">
              <DescriptionIcon fontSize="small" sx={{ mr: 1 }} />
              Full Analysis Details
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ backgroundColor: 'background.paper', p: 2, borderRadius: 1 }}>
              <ReactMarkdown>{rawAnalysis}</ReactMarkdown>
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      <div className="ai-analysis-question-section">
        <Typography variant="subtitle1" gutterBottom display="flex" alignItems="center">
          <HelpOutlineIcon fontSize="small" sx={{ mr: 1 }} />
          Ask a follow-up question about this script
        </Typography>
        <div className="ai-analysis-flex-row">
          <div className="ai-analysis-flex-grow">
            <textarea
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              placeholder="Ask about security concerns, functionality, or how to improve this script..."
              className="ai-analysis-question-input"
            />
          </div>
          <Button
            variant="contained"
            color="primary"
            onClick={handleQuestionSubmit}
            disabled={!questionInput.trim()}
          >
            Ask
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AIAnalysisPanel;
