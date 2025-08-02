import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { MicrophoneIcon, StopIcon, PlayIcon, PauseIcon } from './Icons';

/**
 * Voice Recorder Component
 * 
 * This component provides voice recording and playback functionality.
 * It allows users to record their voice, play back the recording,
 * and send the recording for processing.
 */
const VoiceRecorder = ({ onAudioCaptured, className = '' }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [volume, setVolume] = useState([]);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  
  const { getAuthHeaders } = useAuth();
  const { showToast } = useToast();
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);
  
  // Update audio player state
  useEffect(() => {
    if (audioRef.current) {
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      const handleEnded = () => setIsPlaying(false);
      
      audioRef.current.addEventListener('play', handlePlay);
      audioRef.current.addEventListener('pause', handlePause);
      audioRef.current.addEventListener('ended', handleEnded);
      
      return () => {
        if (audioRef.current) {
          audioRef.current.removeEventListener('play', handlePlay);
          audioRef.current.removeEventListener('pause', handlePause);
          audioRef.current.removeEventListener('ended', handleEnded);
        }
      };
    }
  }, [audioRef.current]);
  
  /**
   * Start recording audio
   */
  const startRecording = async () => {
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      showToast('Your browser does not support required audio recording features.', 'error');
      return;
    }
    try {
      // Reset state
      audioChunksRef.current = [];
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingTime(0);
      setVolume([]);
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Set up audio context for volume visualization
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      
      // Set up media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.addEventListener('dataavailable', event => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      });
      
      mediaRecorder.addEventListener('stop', () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        setAudioBlob(audioBlob);
        setAudioUrl(audioUrl);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      });
      
      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prevTime => prevTime + 1);
        
        // Update volume visualization
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          
          // Calculate volume level (average of frequency data)
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
          const normalizedVolume = average / 256; // Normalize to 0-1
          
          setVolume(prevVolume => {
            const newVolume = [...prevVolume, normalizedVolume];
            // Keep only the last 50 volume samples
            return newVolume.slice(-50);
          });
        }
      }, 100);
    } catch (error) {
      console.error('Error starting recording:', error);
      showToast('Error accessing microphone. Please check permissions.', 'error');
    }
  };
  
  /**
   * Stop recording audio
   */
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };
  
  /**
   * Toggle audio playback
   */
  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };
  
  /**
   * Send the recorded audio for processing
   */
  const sendAudio = async () => {
    if (!audioBlob) {
      showToast('No audio recorded', 'error');
      return;
    }
    
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result.split(',')[1]; // Remove data URL prefix
        
        // Send to backend
        const response = await axios.post(
          '/api/voice/recognize',
          {
            audioData: base64Audio,
            language: 'en-US'
          },
          {
            headers: {
              ...getAuthHeaders(),
              'Content-Type': 'application/json'
            }
          }
        );
        
        // Call the callback with the recognized text
        if (onAudioCaptured && response.data && response.data.text) {
          onAudioCaptured(response.data.text, base64Audio);
        }
      };
    } catch (error) {
      console.error('Error sending audio:', error);
      showToast('Error processing audio', 'error');
    }
  };
  
  /**
   * Format recording time as MM:SS
   */
  const formatTime = (timeInTenths) => {
    const seconds = Math.floor(timeInTenths / 10);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className={`voice-recorder ${className}`}>
      <div className="voice-recorder__controls">
        {!isRecording && !audioUrl && (
          <button
            className="voice-recorder__button voice-recorder__button--record"
            onClick={startRecording}
            aria-label="Start recording"
          >
            <MicrophoneIcon />
            <span>Record</span>
          </button>
        )}
        
        {isRecording && (
          <button
            className="voice-recorder__button voice-recorder__button--stop"
            onClick={stopRecording}
            aria-label="Stop recording"
          >
            <StopIcon />
            <span>Stop</span>
          </button>
        )}
        
        {audioUrl && (
          <>
            <button
              className="voice-recorder__button voice-recorder__button--play"
              onClick={togglePlayback}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>
            
            <button
              className="voice-recorder__button voice-recorder__button--send"
              onClick={sendAudio}
              aria-label="Send"
            >
              <span>Send</span>
            </button>
            
            <button
              className="voice-recorder__button voice-recorder__button--record-new"
              onClick={startRecording}
              aria-label="Record new"
            >
              <MicrophoneIcon />
              <span>Record New</span>
            </button>
          </>
        )}
      </div>
      
      {isRecording && (
        <div className="voice-recorder__status">
          <div className="voice-recorder__time">{formatTime(recordingTime)}</div>
          <div className="voice-recorder__volume-visualization">
            {volume.map((level, index) => (
              <div
                key={index}
                className="voice-recorder__volume-bar"
                style={{ height: `${Math.max(5, level * 50)}px` }}
              />
            ))}
          </div>
          <div className="voice-recorder__recording-indicator">Recording...</div>
        </div>
      )}
      
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} className="voice-recorder__audio" controls={false} />
      )}
      
      <style jsx>{`
        .voice-recorder {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px;
          border-radius: 8px;
          background-color: #f5f5f5;
          width: 100%;
        }
        
        .voice-recorder__controls {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }
        
        .voice-recorder__button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          transition: background-color 0.2s;
        }
        
        .voice-recorder__button--record {
          background-color: #4caf50;
          color: white;
        }
        
        .voice-recorder__button--stop {
          background-color: #f44336;
          color: white;
        }
        
        .voice-recorder__button--play {
          background-color: #2196f3;
          color: white;
        }
        
        .voice-recorder__button--send {
          background-color: #9c27b0;
          color: white;
        }
        
        .voice-recorder__button--record-new {
          background-color: #ff9800;
          color: white;
        }
        
        .voice-recorder__status {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
        }
        
        .voice-recorder__time {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 8px;
        }
        
        .voice-recorder__volume-visualization {
          display: flex;
          align-items: flex-end;
          height: 50px;
          width: 100%;
          gap: 2px;
          margin-bottom: 8px;
        }
        
        .voice-recorder__volume-bar {
          width: 4px;
          background-color: #2196f3;
          border-radius: 2px;
        }
        
        .voice-recorder__recording-indicator {
          color: #f44336;
          font-weight: 500;
          animation: blink 1s infinite;
        }
        
        @keyframes blink {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default VoiceRecorder;
