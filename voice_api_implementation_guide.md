# Voice API Implementation Guide

This guide provides step-by-step instructions for implementing the remaining items on the Voice API roadmap. It builds upon the fixes already implemented in the `voice_api_issues_and_solutions.md` document.

## Phase 2: Performance & Stability Improvements

### 1. Implement Proper Caching with Invalidation and Monitoring

#### Steps:
1. Enhance the caching mechanism in `voice_service.py` to include cache invalidation based on content changes:
   ```python
   async def invalidate_cache(self, pattern: str = None):
       """Invalidate cache entries matching the given pattern."""
       async with self.tts_cache_lock:
           if pattern:
               # Remove matching entries from memory cache
               keys_to_remove = [k for k in self.tts_cache.keys() if pattern in k]
               for key in keys_to_remove:
                   self.tts_cache.pop(key)
               
               # Remove matching entries from disk cache
               if os.path.exists(self.tts_cache_dir):
                   for filename in os.listdir(self.tts_cache_dir):
                       if pattern in filename and filename.endswith('.json'):
                           try:
                               os.remove(os.path.join(self.tts_cache_dir, filename))
                           except Exception as e:
                               logger.error(f"Error removing cache file: {e}")
           else:
               # Clear entire cache
               self.tts_cache.clear()
               if os.path.exists(self.tts_cache_dir):
                   for filename in os.listdir(self.tts_cache_dir):
                       if filename.endswith('.json'):
                           try:
                               os.remove(os.path.join(self.tts_cache_dir, filename))
                           except Exception as e:
                               logger.error(f"Error removing cache file: {e}")
   ```

2. Add cache monitoring metrics:
   ```python
   async def get_cache_stats(self):
       """Get cache statistics."""
       async with self.tts_cache_lock:
           memory_cache_size = len(self.tts_cache)
           disk_cache_size = 0
           disk_cache_files = 0
           
           if os.path.exists(self.tts_cache_dir):
               disk_cache_files = len([f for f in os.listdir(self.tts_cache_dir) if f.endswith('.json')])
               disk_cache_size = sum(os.path.getsize(os.path.join(self.tts_cache_dir, f)) 
                                    for f in os.listdir(self.tts_cache_dir) 
                                    if f.endswith('.json'))
           
           return {
               "memory_cache_entries": memory_cache_size,
               "disk_cache_files": disk_cache_files,
               "disk_cache_size_bytes": disk_cache_size,
               "max_cache_size": self.tts_cache_max_size,
               "cache_ttl_seconds": self.tts_cache_ttl
           }
   ```

3. Add a new endpoint in `voice_endpoints.py` to expose cache management:
   ```python
   @router.get("/cache/stats")
   async def get_cache_stats(
       voice_service: VoiceService = Depends(get_voice_service)
   ):
       """Get cache statistics."""
       return await voice_service.get_cache_stats()
   
   @router.post("/cache/invalidate")
   async def invalidate_cache(
       pattern: Optional[str] = None,
       voice_service: VoiceService = Depends(get_voice_service)
   ):
       """Invalidate cache entries matching the given pattern."""
       await voice_service.invalidate_cache(pattern)
       return {"status": "success", "message": "Cache invalidated"}
   ```

### 2. Add Browser Compatibility Checks

#### Steps:
1. Update `VoiceRecorder.jsx` to include browser compatibility checks:
   ```javascript
   import React, { useEffect, useState } from 'react';
   
   const VoiceRecorder = ({ onRecordingComplete }) => {
     const [isRecording, setIsRecording] = useState(false);
     const [isCompatible, setIsCompatible] = useState(true);
     const [compatibilityError, setCompatibilityError] = useState('');
     
     useEffect(() => {
       // Check browser compatibility
       const checkCompatibility = () => {
         if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
           setIsCompatible(false);
           setCompatibilityError('Your browser does not support audio recording. Please use a modern browser like Chrome, Firefox, or Edge.');
           return false;
         }
         
         // Check for specific browser issues
         const ua = navigator.userAgent;
         if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
           setIsCompatible(false);
           setCompatibilityError('Audio recording is not fully supported on iOS devices. Please use a desktop browser for the best experience.');
           return false;
         }
         
         return true;
       };
       
       checkCompatibility();
     }, []);
     
     // Rest of the component...
     
     if (!isCompatible) {
       return (
         <div className="voice-recorder-error">
           <p>{compatibilityError}</p>
         </div>
       );
     }
     
     return (
       // Recorder UI...
     );
   };
   
   export default VoiceRecorder;
   ```

### 3. Implement Voice Settings Persistence

#### Steps:
1. Create a new database table in your database schema:
   ```sql
   CREATE TABLE voice_settings (
     user_id VARCHAR(255) PRIMARY KEY,
     provider VARCHAR(50) NOT NULL DEFAULT 'google',
     voice_id VARCHAR(100),
     language VARCHAR(20) NOT NULL DEFAULT 'en-US',
     output_format VARCHAR(10) NOT NULL DEFAULT 'mp3',
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
   );
   ```

2. Update `voiceController.js` to add settings persistence:
   ```javascript
   const db = require('../db');
   
   // Get user voice settings
   exports.getVoiceSettings = async (req, res) => {
     try {
       const userId = req.user.id; // Assuming authentication middleware sets req.user
       
       const [settings] = await db.query(
         'SELECT provider, voice_id, language, output_format FROM voice_settings WHERE user_id = ?',
         [userId]
       );
       
       if (settings.length === 0) {
         // Return default settings if none exist
         return res.json({
           provider: 'google',
           voice_id: null,
           language: 'en-US',
           output_format: 'mp3'
         });
       }
       
       res.json(settings[0]);
     } catch (error) {
       console.error('Error getting voice settings:', error);
       res.status(500).json({ error: 'Failed to get voice settings' });
     }
   };
   
   // Update user voice settings
   exports.updateVoiceSettings = async (req, res) => {
     try {
       const userId = req.user.id; // Assuming authentication middleware sets req.user
       const { provider, voice_id, language, output_format } = req.body;
       
       // Validate input
       if (!provider) {
         return res.status(400).json({ error: 'Provider is required' });
       }
       
       if (!['google', 'amazon', 'microsoft'].includes(provider)) {
         return res.status(400).json({ error: 'Invalid provider' });
       }
       
       // Insert or update settings
       await db.query(
         `INSERT INTO voice_settings (user_id, provider, voice_id, language, output_format)
          VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
          provider = VALUES(provider),
          voice_id = VALUES(voice_id),
          language = VALUES(language),
          output_format = VALUES(output_format)`,
         [userId, provider, voice_id, language || 'en-US', output_format || 'mp3']
       );
       
       res.json({ success: true, message: 'Voice settings updated successfully' });
     } catch (error) {
       console.error('Error updating voice settings:', error);
       res.status(500).json({ error: 'Failed to update voice settings' });
     }
   };
   ```

3. Update `voiceRoutes.js` to add the new routes:
   ```javascript
   const express = require('express');
   const router = express.Router();
   const voiceController = require('../controllers/voiceController');
   const authMiddleware = require('../middleware/auth');
   
   // Apply authentication middleware to all routes
   router.use(authMiddleware);
   
   // Existing routes...
   
   // Voice settings routes
   router.get('/settings', voiceController.getVoiceSettings);
   router.put('/settings', voiceController.updateVoiceSettings);
   
   module.exports = router;
   ```

### 4. Optimize Base64 Audio Data Handling

#### Steps:
1. Update `VoiceRecorder.jsx` to implement streaming and compression:
   ```javascript
   import React, { useEffect, useState, useRef } from 'react';
   import { compressAudio } from '../utils/audioUtils';
   
   const VoiceRecorder = ({ onRecordingComplete }) => {
     // Existing state...
     const mediaRecorderRef = useRef(null);
     const audioChunksRef = useRef([]);
     
     const startRecording = async () => {
       try {
         const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
         const options = { mimeType: 'audio/webm' }; // More efficient than wav
         
         const mediaRecorder = new MediaRecorder(stream, options);
         mediaRecorderRef.current = mediaRecorder;
         audioChunksRef.current = [];
         
         mediaRecorder.ondataavailable = (event) => {
           if (event.data.size > 0) {
             audioChunksRef.current.push(event.data);
           }
         };
         
         mediaRecorder.onstop = async () => {
           const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
           
           // Compress audio before sending
           const compressedBlob = await compressAudio(audioBlob);
           
           // Convert to base64
           const reader = new FileReader();
           reader.readAsDataURL(compressedBlob);
           reader.onloadend = () => {
             const base64data = reader.result.split(',')[1];
             onRecordingComplete(base64data);
           };
         };
         
         mediaRecorder.start(100); // Collect data in 100ms chunks
         setIsRecording(true);
       } catch (error) {
         console.error('Error starting recording:', error);
         setError('Failed to start recording: ' + error.message);
       }
     };
     
     // Rest of the component...
   };
   ```

2. Create an audio utilities file `src/frontend/utils/audioUtils.js`:
   ```javascript
   /**
    * Compresses audio data to reduce size
    * @param {Blob} audioBlob - The audio blob to compress
    * @returns {Promise<Blob>} - Compressed audio blob
    */
   export const compressAudio = async (audioBlob) => {
     // For WebM, we can use a lower bitrate
     // This requires Web Audio API support
     try {
       const audioContext = new (window.AudioContext || window.webkitAudioContext)();
       const arrayBuffer = await audioBlob.arrayBuffer();
       const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
       
       // Create an offline context for processing
       const offlineContext = new OfflineAudioContext(
         audioBuffer.numberOfChannels,
         audioBuffer.length,
         audioBuffer.sampleRate
       );
       
       // Create a source node
       const source = offlineContext.createBufferSource();
       source.buffer = audioBuffer;
       
       // Create a compression node
       const compressor = offlineContext.createDynamicsCompressor();
       compressor.threshold.value = -50;
       compressor.knee.value = 40;
       compressor.ratio.value = 12;
       compressor.attack.value = 0;
       compressor.release.value = 0.25;
       
       // Connect nodes
       source.connect(compressor);
       compressor.connect(offlineContext.destination);
       
       // Start rendering
       source.start(0);
       const renderedBuffer = await offlineContext.startRendering();
       
       // Convert back to blob
       const wavBlob = await bufferToWave(renderedBuffer, renderedBuffer.length);
       
       return wavBlob;
     } catch (error) {
       console.error('Audio compression failed:', error);
       // Fall back to original blob if compression fails
       return audioBlob;
     }
   };
   
   /**
    * Convert an AudioBuffer to a Blob using Wave format
    */
   function bufferToWave(abuffer, len) {
     // Implementation details...
     // (This is a standard function to convert AudioBuffer to Wave format)
   }
   ```

3. Update `voiceController.js` to handle streaming uploads:
   ```javascript
   const multer = require('multer');
   const upload = multer({ storage: multer.memoryStorage() });
   
   // Update the route to use multer for handling file uploads
   exports.recognizeSpeech = [
     upload.single('audio'),
     async (req, res) => {
       try {
         let audioData;
         
         // Handle both form data uploads and JSON base64
         if (req.file) {
           // Direct file upload
           audioData = req.file.buffer.toString('base64');
         } else if (req.body.audio_data) {
           // JSON base64 data
           audioData = req.body.audio_data;
         } else {
           return res.status(400).json({ error: 'No audio data provided' });
         }
         
         // Process the audio data...
         
       } catch (error) {
         console.error('Speech recognition error:', error);
         res.status(500).json({ error: 'Speech recognition failed' });
       }
     }
   ];
   ```

### 5. Add Audio Format and Size Validation

#### Steps:
1. Update `voiceController.js` to add validation:
   ```javascript
   // Add validation middleware
   const validateAudio = (req, res, next) => {
     // Check if it's a file upload
     if (req.file) {
       // Check file size (10MB limit)
       if (req.file.size > 10 * 1024 * 1024) {
         return res.status(400).json({ 
           error: 'Audio file too large. Maximum size is 10MB.' 
         });
       }
       
       // Check file type
       const allowedMimeTypes = ['audio/wav', 'audio/mpeg', 'audio/webm', 'audio/ogg'];
       if (!allowedMimeTypes.includes(req.file.mimetype)) {
         return res.status(400).json({ 
           error: 'Invalid audio format. Supported formats: WAV, MP3, WebM, OGG.' 
         });
       }
     } 
     // Check if it's base64 data
     else if (req.body.audio_data) {
       // Check data size (base64 is ~33% larger than binary)
       if (req.body.audio_data.length > 13 * 1024 * 1024) {
         return res.status(400).json({ 
           error: 'Audio data too large. Maximum size is 10MB.' 
         });
       }
       
       // Validate base64 format
       if (!/^[A-Za-z0-9+/=]+$/.test(req.body.audio_data)) {
         return res.status(400).json({ 
           error: 'Invalid base64 data format.' 
         });
       }
     } else {
       return res.status(400).json({ error: 'No audio data provided' });
     }
     
     next();
   };
   
   // Apply validation to the route
   exports.recognizeSpeech = [
     upload.single('audio'),
     validateAudio,
     async (req, res) => {
       // Existing implementation...
     }
   ];
   ```

## Phase 3: Code Quality & Usability Enhancements

### 1. Consolidate Redundant Methods in Voice Agent

#### Steps:
1. Identify redundant methods in `src/ai/agents/voice_agent.py` and consolidate them:
   ```python
   # Before consolidation:
   def process_text_to_speech(self, text, voice_id=None):
       # Implementation...
   
   def generate_audio(self, text, voice_id=None):
       # Similar implementation...
   
   # After consolidation:
   def synthesize_speech(self, text, voice_id=None, output_format="mp3"):
       """
       Synthesize text into speech.
       
       Args:
           text: Text to synthesize
           voice_id: Voice ID to use (optional)
           output_format: Output audio format (default: mp3)
           
       Returns:
           Dictionary containing the audio data and metadata
       """
       # Implementation that combines both methods...
   ```

### 2. Standardize Naming Conventions

#### Steps:
1. Create a style guide document for the project that defines naming conventions:
   ```markdown
   # Voice API Style Guide
   
   ## Naming Conventions
   
   ### Python
   - Use snake_case for variables, functions, and methods
   - Use PascalCase for classes
   - Use UPPER_CASE for constants
   
   ### JavaScript
   - Use camelCase for variables, functions, and methods
   - Use PascalCase for classes and React components
   - Use UPPER_CASE for constants
   
   ### File Naming
   - Use snake_case for Python files
   - Use camelCase for JavaScript files
   - Use PascalCase for React component files
   
   ## Code Structure
   
   ### Python
   - Imports should be grouped: standard library, third-party, local
   - Use type hints for function parameters and return values
   - Use docstrings for all functions and classes
   
   ### JavaScript
   - Imports should be grouped: React/libraries, components, utilities
   - Use JSDoc comments for functions and components
   - Use destructuring for props in React components
   ```

2. Apply the naming conventions consistently across the codebase.

### 3. Add Comprehensive API Documentation

#### Steps:
1. Update `voiceRoutes.js` to include comprehensive documentation:
   ```javascript
   /**
    * @swagger
    * /api/voice/synthesize:
    *   post:
    *     summary: Synthesize text into speech
    *     description: Converts the provided text into speech using the specified voice and format
    *     tags: [Voice]
    *     security:
    *       - bearerAuth: []
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *             required:
    *               - text
    *             properties:
    *               text:
    *                 type: string
    *                 description: Text to synthesize into speech
    *               voice_id:
    *
