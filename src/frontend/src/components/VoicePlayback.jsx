import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { PlayIcon, PauseIcon, VolumeUpIcon, VolumeOffIcon } from './Icons';

/**
 * Voice Playback Component
 * 
 * This component provides voice playback functionality.
 * It can play audio from a provided audio data or synthesize speech from text.
 */
const VoicePlayback = ({
  text,
  audioData,
  voiceId,
  autoPlay = false,
  onPlaybackStart,
  onPlaybackEnd,
  className = ''
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [progress, setProgress] = useState(0);
  
  const audioRef = useRef(null);
  const progressIntervalRef = useRef(null);
  
  const { getAuthHeaders } = useAuth();
  const { showToast } = useToast();
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);
  
  // Initialize audio from props
  useEffect(() => {
    if (audioData) {
      setAudioFromData(audioData);
    } else if (text && !audioUrl) {
      synthesizeSpeech();
    }
  }, [text, audioData, voiceId]);
  
  // Auto-play when audio is available
  useEffect(() => {
    if (autoPlay && audioUrl && audioRef.current) {
      playAudio();
    }
  }, [audioUrl, autoPlay]);
  
  // Update audio player state
  useEffect(() => {
    if (audioRef.current) {
      const handlePlay = () => {
        setIsPlaying(true);
        if (onPlaybackStart) onPlaybackStart();
        
        // Start progress tracking
        progressIntervalRef.current = setInterval(() => {
          if (audioRef.current) {
            const currentProgress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
            setProgress(currentProgress);
          }
        }, 100);
      };
      
      const handlePause = () => {
        setIsPlaying(false);
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      };
      
      const handleEnded = () => {
        setIsPlaying(false);
        setProgress(100);
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
        if (onPlaybackEnd) onPlaybackEnd();
      };
      
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
  }, [audioRef.current, onPlaybackStart, onPlaybackEnd]);
  
  /**
   * Set audio from base64 data
   */
  const setAudioFromData = (base64Data) => {
    try {
      // Convert base64 to blob
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'audio/mp3' });
      
      // Create URL for the blob
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    } catch (error) {
      console.error('Error setting audio from data:', error);
      showToast('Error processing audio data', 'error');
    }
  };
  
  /**
   * Synthesize speech from text
   */
  const synthesizeSpeech = async () => {
    if (!text) return;
    
    setIsLoading(true);
    
    try {
      const response = await axios.post(
        '/api/voice/synthesize',
        {
          text,
          voiceId,
          outputFormat: 'mp3'
        },
        {
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data && response.data.audio_data) {
        setAudioFromData(response.data.audio_data);
      } else {
        throw new Error('No audio data received');
      }
    } catch (error) {
      console.error('Error synthesizing speech:', error);
      showToast('Error synthesizing speech', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Play audio
   */
  const playAudio = () => {
    if (audioRef.current) {
      audioRef.current.play();
    }
  };
  
  /**
   * Pause audio
   */
  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };
  
  /**
   * Toggle audio playback
   */
  const togglePlayback = () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  };
  
  /**
   * Toggle mute
   */
  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setIsMuted(!isMuted);
    }
  };
  
  /**
   * Seek to position
   */
  const seekTo = (e) => {
    if (audioRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const position = (e.clientX - rect.left) / rect.width;
      audioRef.current.currentTime = position * audioRef.current.duration;
      setProgress(position * 100);
    }
  };
  
  return (
    <div className={`voice-playback ${className}`}>
      {audioUrl && (
        <>
          <div className="voice-playback__controls">
            <button
              className="voice-playback__button voice-playback__button--play"
              onClick={togglePlayback}
              disabled={isLoading}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            
            <div className="voice-playback__progress-container" onClick={seekTo}>
              <div className="voice-playback__progress-bar">
                <div
                  className="voice-playback__progress"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            
            <button
              className="voice-playback__button voice-playback__button--volume"
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
            </button>
          </div>
          
          <audio ref={audioRef} src={audioUrl} preload="auto" />
        </>
      )}
      
      {isLoading && (
        <div className="voice-playback__loading">
          <div className="voice-playback__loading-spinner" />
          <div className="voice-playback__loading-text">Synthesizing speech...</div>
        </div>
      )}
      
      <style jsx>{`
        .voice-playback {
          display: flex;
          flex-direction: column;
          width: 100%;
          padding: 8px;
          border-radius: 4px;
          background-color: #f5f5f5;
        }
        
        .voice-playback__controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .voice-playback__button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 50%;
          background-color: #2196f3;
          color: white;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .voice-playback__button:hover {
          background-color: #1976d2;
        }
        
        .voice-playback__button:disabled {
          background-color: #bdbdbd;
          cursor: not-allowed;
        }
        
        .voice-playback__progress-container {
          flex: 1;
          height: 20px;
          display: flex;
          align-items: center;
          cursor: pointer;
        }
        
        .voice-playback__progress-bar {
          width: 100%;
          height: 4px;
          background-color: #e0e0e0;
          border-radius: 2px;
          overflow: hidden;
        }
        
        .voice-playback__progress {
          height: 100%;
          background-color: #2196f3;
          border-radius: 2px;
          transition: width 0.1s linear;
        }
        
        .voice-playback__loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        
        .voice-playback__loading-spinner {
          width: 24px;
          height: 24px;
          border: 3px solid #e0e0e0;
          border-top: 3px solid #2196f3;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 8px;
        }
        
        .voice-playback__loading-text {
          font-size: 14px;
          color: #757575;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default VoicePlayback;