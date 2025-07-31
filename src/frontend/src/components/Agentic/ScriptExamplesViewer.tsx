import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  Chip,
  Divider,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import StarIcon from '@mui/icons-material/Star';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { vs2015 } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import './ScriptExamplesViewer.css';

// Interface for script example data
export interface ScriptExample {
  id: string;
  title: string;
  description?: string;
  script: string;
  tags: string[];
  source?: string;
  similarity?: number; // 0-1 score indicating similarity to user query/script
  url?: string;
  author?: string;
}

interface ScriptExamplesViewerProps {
  examples: ScriptExample[];
  isLoading: boolean;
  loadMore?: () => void;
  hasMore?: boolean;
  onSelectExample?: (example: ScriptExample) => void;
  onRateExample?: (id: string, rating: 'helpful' | 'unhelpful') => void;
}

const ScriptExamplesViewer: React.FC<ScriptExamplesViewerProps> = ({
  examples,
  isLoading,
  loadMore,
  hasMore = false,
  onSelectExample,
  onRateExample,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [ratings, setRatings] = useState<Record<string, 'helpful' | 'unhelpful' | null>>({});

  // Handle tab change
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Copy script to clipboard
  const copyToClipboard = (script: string) => {
    navigator.clipboard.writeText(script);
  };

  // Download script as a file
  const downloadScript = (script: string, title: string) => {
    const element = document.createElement('a');
    const file = new Blob([script], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${title.replace(/\s+/g, '-').toLowerCase()}.ps1`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Handle rating an example
  const handleRate = (id: string, rating: 'helpful' | 'unhelpful') => {
    // Only allow rating once
    if (ratings[id] !== undefined) return;

    // Update local state
    setRatings((prev) => ({ ...prev, [id]: rating }));

    // Call parent handler if provided
    if (onRateExample) {
      onRateExample(id, rating);
    }
  };

  // If loading and no examples
  if (isLoading && examples.length === 0) {
    return (
      <Paper className="loading-paper">
        <CircularProgress size={30} className="loading-spinner" />
        <Typography variant="body1" className="loading-text">
          Looking for relevant PowerShell script examples...
        </Typography>
      </Paper>
    );
  }

  // If no examples found
  if (!isLoading && examples.length === 0) {
    return (
      <Paper className="no-examples-paper">
        <Typography variant="body1" color="text.secondary" className="no-examples-text">
          No script examples found. Try modifying your search criteria.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box className="script-examples-viewer">
      <Box className="header" mb={2} display="flex" alignItems="center" justifyContent="space-between">
        <Typography variant="h6" className="header-title">
          Script Examples
        </Typography>
        <Chip 
          label={`${examples.length} found`} 
          size="small" 
          color="primary" 
          variant="outlined" 
          className="header-chip"
        />
      </Box>

      {/* Tabs for switching between examples */}
      <Tabs 
        value={activeTab} 
        onChange={handleTabChange} 
        variant="scrollable"
        scrollButtons="auto"
        className="tabs"
      >
        {examples.map((example, index) => (
          <Tab 
            key={example.id} 
            label={example.title} 
            id={`script-tab-${index}`}
            aria-controls={`script-tabpanel-${index}`}
            className="tab"
          />
        ))}
      </Tabs>

      {/* Content for the active tab */}
      {examples.map((example, index) => (
        <Box
          key={example.id}
          role="tabpanel"
          hidden={activeTab !== index}
          id={`script-tabpanel-${index}`}
          aria-labelledby={`script-tab-${index}`}
          className="tabpanel"
        >
          {activeTab === index && (
            <Paper 
              variant="outlined" 
              className="tabpanel-paper"
            >
              {/* Header with actions */}
              <Box 
                display="flex" 
                justifyContent="space-between" 
                alignItems="flex-start"
                mb={2}
                className="tabpanel-header"
              >
                <Box>
                  <Typography variant="h6" className="tabpanel-title">{example.title}</Typography>
                  
                  {/* Tags */}
                  <Box display="flex" gap={0.5} mt={1} flexWrap="wrap" className="tabpanel-tags">
                    {example.tags.map((tag, i) => (
                      <Chip 
                        key={i} 
                        label={tag} 
                        size="small" 
                        variant="outlined"
                        className="tabpanel-tag"
                      />
                    ))}
                    
                    {/* Similarity score if available */}
                    {example.similarity !== undefined && (
                      <Chip
                        icon={<StarIcon fontSize="small" />}
                        label={`${Math.round(example.similarity * 100)}% match`}
                        size="small"
                        color="primary"
                        className="tabpanel-similarity"
                      />
                    )}
                  </Box>
                </Box>
                
                {/* Action buttons */}
                <Box className="tabpanel-actions">
                  <Tooltip title="Copy to clipboard">
                    <IconButton 
                      size="small" 
                      onClick={() => copyToClipboard(example.script)}
                      className="tabpanel-action-button"
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="Download script">
                    <IconButton 
                      size="small" 
                      onClick={() => downloadScript(example.script, example.title)}
                      className="tabpanel-action-button"
                    >
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
              
              {/* Description */}
              {example.description && (
                <Typography variant="body2" paragraph className="tabpanel-description">
                  {example.description}
                </Typography>
              )}
              
              {/* Source info */}
              {example.source && (
                <Typography variant="caption" color="text.secondary" display="block" mb={1} className="tabpanel-source">
                  Source: {example.source}
                  {example.url && (
                    <a 
                      href={example.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="tabpanel-source-link"
                    >
                      View Original
                    </a>
                  )}
                </Typography>
              )}
              
              <Divider className="tabpanel-divider" />
              
              {/* Script code */}
              <SyntaxHighlighter
                language="powershell"
                style={vs2015}
                wrapLines
                wrapLongLines
                customStyle={{ borderRadius: '4px' }}
                className="tabpanel-code"
              >
                {example.script}
              </SyntaxHighlighter>
              
              {/* Use this script button & rating */}
              <Box 
                display="flex" 
                justifyContent="space-between" 
                alignItems="center"
                mt={2}
                className="tabpanel-footer"
              >
                {onSelectExample && (
                  <Button 
                    variant="contained" 
                    onClick={() => onSelectExample(example)}
                    className="tabpanel-use-script-button"
                  >
                    Use This Script
                  </Button>
                )}
                
                {/* Rating buttons */}
                <Box className="tabpanel-rating">
                  <Typography variant="caption" color="text.secondary" mr={1} className="tabpanel-rating-text">
                    Was this helpful?
                  </Typography>
                  
                  <Tooltip title="Helpful">
                    <IconButton
                      size="small"
                      onClick={() => handleRate(example.id, 'helpful')}
                      color={ratings[example.id] === 'helpful' ? 'primary' : 'default'}
                      disabled={ratings[example.id] !== undefined}
                      className="tabpanel-rating-button"
                    >
                      <ThumbUpIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="Not helpful">
                    <IconButton
                      size="small"
                      onClick={() => handleRate(example.id, 'unhelpful')}
                      color={ratings[example.id] === 'unhelpful' ? 'error' : 'default'}
                      disabled={ratings[example.id] !== undefined}
                      className="tabpanel-rating-button"
                    >
                      <ThumbDownIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Paper>
          )}
        </Box>
      ))}
      
      {/* Load more button */}
      {hasMore && (
        <Box display="flex" justifyContent="center" mt={2} className="load-more-button-container">
          <Button 
            variant="outlined" 
            onClick={loadMore}
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} /> : null}
            className="load-more-button"
          >
            {isLoading ? 'Loading...' : 'Load More Examples'}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default ScriptExamplesViewer;
