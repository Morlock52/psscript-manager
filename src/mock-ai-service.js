// Simple mock AI service to handle requests from the backend
const express = require('express');
const cors = require('cors');
const app = express();
const port = 8000;

// Add middleware
app.use(express.json({ limit: '50mb' }));
app.use(cors());

// Mock analysis response
const mockAnalysisResponse = {
  analysis: {
    purpose: "This is a mock analysis from the AI service",
    securityScore: 85,
    codeQualityScore: 90,
    riskScore: 15,
    suggestions: [
      "Consider adding error handling",
      "Add more comments to explain complex logic",
      "Use secure parameter handling"
    ],
    commandDetails: {
      "Get-Content": {
        description: "Reads content from a file",
        parameters: [
          { name: "Path", description: "Path to the file" },
          { name: "Encoding", description: "File encoding" }
        ]
      }
    },
    msDocsReferences: [
      { title: "Get-Content Documentation", url: "https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-content" }
    ],
    examples: [],
    rawAnalysis: "This script appears to perform file operations. It uses common PowerShell commands and has no obvious security issues."
  },
  metadata: {
    processingTime: 1.23,
    version: "0.1.0",
    model: "mock-model"
  }
};

// Mock embed response
const mockEmbedResponse = {
  embedding: [0.01, 0.02, 0.03, 0.04, 0.05],
  status: "success"
};

// Handle /analyze endpoint
app.post('/analyze', (req, res) => {
  console.log("Received analyze request:", JSON.stringify(req.body).substring(0, 100) + "...");
  
  // Add a slight delay to simulate processing
  setTimeout(() => {
    res.json(mockAnalysisResponse);
  }, 500);
});

// Handle /analyze-script endpoint
app.post('/analyze-script', (req, res) => {
  console.log("Received analyze-script request:", JSON.stringify(req.body).substring(0, 100) + "...");
  
  // Add a slight delay to simulate processing
  setTimeout(() => {
    res.json(mockAnalysisResponse);
  }, 500);
});

// Handle /embed endpoint
app.post('/embed', (req, res) => {
  console.log("Received embed request:", JSON.stringify(req.body).substring(0, 100) + "...");
  
  // Add a slight delay to simulate processing
  setTimeout(() => {
    res.json(mockEmbedResponse);
  }, 200);
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Mock AI service running at http://localhost:${port}`);
});
