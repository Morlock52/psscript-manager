# Voice API Integration

This document provides an overview of the Voice API integration for the PSScript Manager platform. The Voice API enables voice input and output capabilities, enhancing the user experience and accessibility of the platform.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Setup and Configuration](#setup-and-configuration)
5. [API Reference](#api-reference)
6. [Usage Examples](#usage-examples)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

## Overview

The Voice API integration adds voice capabilities to the PSScript Manager platform, allowing users to:

- Convert text to speech (voice synthesis)
- Convert speech to text (voice recognition)
- Interact with the platform using voice commands
- Receive voice responses to queries

The implementation supports multiple voice service providers (Google Cloud, Amazon AWS, Microsoft Azure) with fallback mechanisms and caching for improved performance and reliability.

## Architecture

The Voice API integration follows a layered architecture:

1. **AI Service Layer**:
   - `voice_service.py`: Core service with speech synthesis and recognition capabilities
   - `voice_endpoints.py`: FastAPI endpoints for voice processing
   - `voice_agent.py`: Specialized agent for voice tasks

2. **Backend Layer**:
   - `voiceController.js`: Express controller for voice functionality
   - `voiceRoutes.js`: API routes for voice endpoints

3. **Frontend Layer**:
   - `VoiceRecorder.jsx`: Audio recording with visualization
   - `VoicePlayback.jsx`: Audio playback with controls
   - `VoiceChatInterface.jsx`: Chat UI with voice integration
   - `VoiceSettings.jsx`: User preferences for voice features

## Features

- **Multi-provider Support**: Integration with Google Cloud, Amazon AWS, and Microsoft Azure voice services
- **Fallback Mechanism**: Automatic fallback to alternative providers if the primary provider fails
- **Caching**: Efficient caching of voice responses to reduce API calls and improve performance
- **Voice Settings**: User-configurable voice settings (voice selection, playback options)
- **Accessibility**: Enhanced accessibility through voice interaction
- **Visualization**: Audio waveform visualization during recording and playback
- **Error Handling**: Comprehensive error handling and recovery mechanisms

## Setup and Configuration

### Prerequisites

- Node.js 14+ for the backend
- Python 3.8+ for the AI service
- API keys for the voice service providers:
  - Google Cloud Speech-to-Text and Text-to-Speech
  - Amazon Polly and Transcribe
  - Microsoft Azure Cognitive Services

### Installation

1. **AI Service Setup**:
   ```bash
   cd src/ai
   pip install -r requirements.txt
   ```

2. **Backend Setup**:
   ```bash
   cd src/backend
   npm install
   ```

3. **Environment Variables**:
   
   Create a `.env` file in the `src/ai` directory with the following variables:
   ```
   VOICE_API_KEY=your-api-key
   TTS_SERVICE=google  # google, amazon, or microsoft
   STT_SERVICE=google  # google, amazon, or microsoft
   TTS_CACHE_DIR=voice_cache
   TTS_CACHE_TTL=86400  # 24 hours in seconds
   
   # Google Cloud credentials
   GOOGLE_APPLICATION_CREDENTIALS=path/to/google-credentials.json
   
   # Amazon AWS credentials
   AWS_ACCESS_KEY_ID=your-aws-access-key
   AWS_SECRET_ACCESS_KEY=your-aws-secret-key
   AWS_REGION=us-east-1
   
   # Microsoft Azure credentials
   AZURE_SPEECH_KEY=your-azure-speech-key
   AZURE_SPEECH_REGION=eastus
   ```

### Starting the Services

1. **Start the AI Service**:
   ```bash
   cd src/ai
   uvicorn main:app --reload --port 8000
   ```

2. **Start the Backend**:
   ```bash
   cd src/backend
   npm run dev
   ```

## API Reference

### Backend API Endpoints

#### Voice Synthesis

```
POST /api/voice/synthesize
```

Request body:
```json
{
  "text": "Text to synthesize",
  "voiceId": "en-US-Standard-A",
  "outputFormat": "mp3"
}
```

Response:
```json
{
  "audio_data": "base64-encoded-audio-data",
  "format": "mp3",
  "duration": 2.5,
  "text": "Text to synthesize"
}
```

#### Voice Recognition

```
POST /api/voice/recognize
```

Request body:
```json
{
  "audioData": "base64-encoded-audio-data",
  "language": "en-US"
}
```

Response:
```json
{
  "text": "Recognized text",
  "confidence": 0.92,
  "alternatives": [
    {
      "text": "Recognized text",
      "confidence": 0.92
    },
    {
      "text": "Alternative text",
      "confidence": 0.85
    }
  ]
}
```

#### Voice Settings

```
GET /api/voice/settings
```

Response:
```json
{
  "voiceId": "en-US-Standard-A",
  "autoPlay": true,
  "volume": 0.8,
  "speed": 1.0
}
```

```
PUT /api/voice/settings
```

Request body:
```json
{
  "voiceId": "en-US-Standard-A",
  "autoPlay": true,
  "volume": 0.8,
  "speed": 1.0
}
```

#### Available Voices

```
GET /api/voice/voices
```

Response:
```json
{
  "voices": [
    {
      "id": "en-US-Standard-A",
      "name": "English US (Female)",
      "language": "en-US",
      "gender": "female"
    },
    {
      "id": "en-US-Standard-B",
      "name": "English US (Male)",
      "language": "en-US",
      "gender": "male"
    }
  ]
}
```

### AI Service Endpoints

#### Voice Synthesis

```
POST /voice/synthesize
```

Request body:
```json
{
  "text": "Text to synthesize",
  "voice_id": "en-US-Standard-A",
  "output_format": "mp3"
}
```

#### Voice Recognition

```
POST /voice/recognize
```

Request body:
```json
{
  "audio_data": "base64-encoded-audio-data",
  "language": "en-US"
}
```

## Usage Examples

### Frontend Integration

```jsx
import React, { useState } from 'react';
import VoiceRecorder from '../components/VoiceRecorder';
import VoicePlayback from '../components/VoicePlayback';

const VoiceExample = () => {
  const [recognizedText, setRecognizedText] = useState('');
  const [audioData, setAudioData] = useState(null);
  
  const handleVoiceInput = (text, audio) => {
    setRecognizedText(text);
    setAudioData(audio);
  };
  
  return (
    <div className="voice-example">
      <h2>Voice Example</h2>
      
      <VoiceRecorder onAudioCaptured={handleVoiceInput} />
      
      {recognizedText && (
        <div className="recognized-text">
          <h3>Recognized Text:</h3>
          <p>{recognizedText}</p>
        </div>
      )}
      
      {audioData && (
        <div className="playback">
          <h3>Playback:</h3>
          <VoicePlayback audioData={audioData} autoPlay={true} />
        </div>
      )}
    </div>
  );
};
```

### Backend Integration

```javascript
const voiceController = require('./controllers/voiceController');

// Synthesize speech
app.post('/api/custom/speak', async (req, res) => {
  try {
    const { text } = req.body;
    
    // Call the voice controller
    const result = await voiceController.synthesizeSpeech({
      body: {
        text,
        voiceId: 'en-US-Standard-A',
        outputFormat: 'mp3'
      }
    }, res);
    
    // The result is already sent by the controller
  } catch (error) {
    console.error('Error in custom speak endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

## Testing

The Voice API integration includes a comprehensive test script (`test-voice-api.sh`) that tests all aspects of the integration:

```bash
# Make the script executable
chmod +x test-voice-api.sh

# Run the tests
./test-voice-api.sh
```

The test script performs the following tests:

1. Get available voices
2. Get voice settings
3. Update voice settings
4. Synthesize speech
5. Recognize speech
6. End-to-end test (synthesize then recognize)
7. Performance test with multiple languages
8. Stress test with long text
9. Direct AI service test
10. Cache test

## Troubleshooting

### Common Issues

1. **Authentication Errors**:
   - Ensure that the API keys for the voice service providers are correctly set in the environment variables.
   - Check that the authentication middleware is correctly configured.

2. **Voice Service Errors**:
   - Verify that the selected voice service provider is available and properly configured.
   - Check the logs for specific error messages from the voice service provider.

3. **Audio Format Issues**:
   - Ensure that the audio format specified in the request is supported by the voice service provider.
   - Check that the audio data is correctly encoded in base64 format.

4. **Performance Issues**:
   - Verify that the caching mechanism is working correctly.
   - Check the network latency between the backend and the voice service provider.

### Logs and Debugging

- AI Service logs: Check the console output of the AI service for error messages.
- Backend logs: Check the backend logs for API request/response details.
- Browser console: Check the browser console for frontend errors.

### Support

For additional support, please contact the development team or refer to the documentation of the specific voice service provider being used.