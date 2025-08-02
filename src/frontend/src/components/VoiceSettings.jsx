import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import VoicePlayback from './VoicePlayback';

/**
 * Voice Settings Component
 * 
 * This component provides a settings interface for voice-related preferences.
 * It allows users to select a voice, adjust playback settings, and test the voice.
 */
const VoiceSettings = ({ className = '' }) => {
  const [voices, setVoices] = useState([]);
  const [settings, setSettings] = useState({
    voiceId: '',
    autoPlay: true,
    volume: 0.8,
    speed: 1.0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [testText, setTestText] = useState('This is a test of the selected voice.');
  const [testAudioData, setTestAudioData] = useState(null);
  
  const { getAuthHeaders } = useAuth();
  const { showToast } = useToast();
  
  // Load voices and settings on mount
  useEffect(() => {
    loadVoicesAndSettings();
  }, []);
  
  /**
   * Load available voices and user settings
   */
  const loadVoicesAndSettings = async () => {
    setIsLoading(true);
    
    try {
      // Load voices
      const voicesResponse = await axios.get('/api/voice/voices', {
        headers: getAuthHeaders()
      });
      
      if (voicesResponse.data && voicesResponse.data.voices) {
        setVoices(voicesResponse.data.voices);
      }
      
      // Load settings
      const settingsResponse = await axios.get('/api/voice/settings', {
        headers: getAuthHeaders()
      });
      
      if (settingsResponse.data) {
        setSettings(settingsResponse.data);
      }
    } catch (error) {
      console.error('Error loading voices and settings:', error);
      showToast('Error loading voice settings', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Handle input change
   */
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setSettings(prevSettings => ({
      ...prevSettings,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  /**
   * Handle range input change
   */
  const handleRangeChange = (e) => {
    const { name, value } = e.target;
    
    setSettings(prevSettings => ({
      ...prevSettings,
      [name]: parseFloat(value)
    }));
  };
  
  /**
   * Save settings
   */
  const saveSettings = async () => {
    setIsSaving(true);
    
    try {
      const response = await axios.put(
        '/api/voice/settings',
        settings,
        {
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data) {
        showToast('Voice settings saved successfully', 'success');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      showToast('Error saving voice settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };
  
  /**
   * Test the selected voice
   */
  const testVoice = async () => {
    if (!settings.voiceId || !testText) return;
    
    try {
      const response = await axios.post(
        '/api/voice/synthesize',
        {
          text: testText,
          voiceId: settings.voiceId,
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
        setTestAudioData(response.data.audio_data);
      } else {
        throw new Error('No audio data received');
      }
    } catch (error) {
      console.error('Error testing voice:', error);
      showToast('Error testing voice', 'error');
    }
  };
  
  /**
   * Group voices by language
   */
  const groupedVoices = voices.reduce((groups, voice) => {
    const language = voice.language || 'Other';
    if (!groups[language]) {
      groups[language] = [];
    }
    groups[language].push(voice);
    return groups;
  }, {});
  
  return (
    <div className={`voice-settings ${className}`}>
      <h2 className="voice-settings__title">Voice Settings</h2>
      
      {isLoading ? (
        <div className="voice-settings__loading">
          <div className="voice-settings__loading-spinner" />
          <div>Loading voice settings...</div>
        </div>
      ) : (
        <div className="voice-settings__content">
          <div className="voice-settings__section">
            <h3 className="voice-settings__section-title">Voice Selection</h3>
            
            <div className="voice-settings__field">
              <label htmlFor="voiceId" className="voice-settings__label">
                Voice
              </label>
              <select
                id="voiceId"
                name="voiceId"
                className="voice-settings__select"
                value={settings.voiceId}
                onChange={handleInputChange}
              >
                <option value="">Select a voice</option>
                {Object.entries(groupedVoices).map(([language, languageVoices]) => (
                  <optgroup key={language} label={language}>
                    {languageVoices.map(voice => (
                      <option key={voice.id} value={voice.id}>
                        {voice.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            
            <div className="voice-settings__field voice-settings__field--test">
              <div className="voice-settings__test-controls">
                <input
                  type="text"
                  className="voice-settings__test-input"
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  placeholder="Enter text to test the voice"
                />
                <button
                  className="voice-settings__button voice-settings__button--test"
                  onClick={testVoice}
                  disabled={!settings.voiceId || !testText}
                >
                  Test Voice
                </button>
              </div>
              
              {testAudioData && (
                <div className="voice-settings__test-playback">
                  <VoicePlayback
                    audioData={testAudioData}
                    autoPlay={true}
                  />
                </div>
              )}
            </div>
          </div>
          
          <div className="voice-settings__section">
            <h3 className="voice-settings__section-title">Playback Settings</h3>
            
            <div className="voice-settings__field voice-settings__field--checkbox">
              <input
                type="checkbox"
                id="autoPlay"
                name="autoPlay"
                checked={settings.autoPlay}
                onChange={handleInputChange}
                className="voice-settings__checkbox"
              />
              <label htmlFor="autoPlay" className="voice-settings__label">
                Auto-play voice responses
              </label>
            </div>
            
            <div className="voice-settings__field">
              <label htmlFor="volume" className="voice-settings__label">
                Volume: {Math.round(settings.volume * 100)}%
              </label>
              <input
                type="range"
                id="volume"
                name="volume"
                min="0"
                max="1"
                step="0.1"
                value={settings.volume}
                onChange={handleRangeChange}
                className="voice-settings__range"
              />
            </div>
            
            <div className="voice-settings__field">
              <label htmlFor="speed" className="voice-settings__label">
                Speed: {settings.speed}x
              </label>
              <input
                type="range"
                id="speed"
                name="speed"
                min="0.5"
                max="2"
                step="0.1"
                value={settings.speed}
                onChange={handleRangeChange}
                className="voice-settings__range"
              />
            </div>
          </div>
          
          <div className="voice-settings__actions">
            <button
              className="voice-settings__button voice-settings__button--save"
              onClick={saveSettings}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .voice-settings {
          padding: 24px;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        
        .voice-settings__title {
          margin-top: 0;
          margin-bottom: 24px;
          font-size: 24px;
          color: #333;
        }
        
        .voice-settings__loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px;
        }
        
        .voice-settings__loading-spinner {
          width: 32px;
          height: 32px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .voice-settings__content {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        
        .voice-settings__section {
          padding: 16px;
          background-color: #f9f9f9;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
        }
        
        .voice-settings__section-title {
          margin-top: 0;
          margin-bottom: 16px;
          font-size: 18px;
          color: #333;
        }
        
        .voice-settings__field {
          margin-bottom: 16px;
        }
        
        .voice-settings__field:last-child {
          margin-bottom: 0;
        }
        
        .voice-settings__label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
        }
        
        .voice-settings__field--checkbox .voice-settings__label {
          display: inline;
          margin-left: 8px;
        }
        
        .voice-settings__select {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 16px;
        }
        
        .voice-settings__checkbox {
          width: 18px;
          height: 18px;
        }
        
        .voice-settings__range {
          width: 100%;
          height: 8px;
          background-color: #e0e0e0;
          border-radius: 4px;
          outline: none;
          -webkit-appearance: none;
        }
        
        .voice-settings__range::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          background-color: #2196f3;
          border-radius: 50%;
          cursor: pointer;
        }
        
        .voice-settings__range::-moz-range-thumb {
          width: 18px;
          height: 18px;
          background-color: #2196f3;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }
        
        .voice-settings__field--test {
          margin-top: 16px;
        }
        
        .voice-settings__test-controls {
          display: flex;
          gap: 8px;
        }
        
        .voice-settings__test-input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 16px;
        }
        
        .voice-settings__test-playback {
          margin-top: 16px;
        }
        
        .voice-settings__actions {
          display: flex;
          justify-content: flex-end;
        }
        
        .voice-settings__button {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .voice-settings__button:disabled {
          background-color: #bdbdbd;
          cursor: not-allowed;
        }
        
        .voice-settings__button--save {
          background-color: #4caf50;
          color: white;
        }
        
        .voice-settings__button--save:hover:not(:disabled) {
          background-color: #388e3c;
        }
        
        .voice-settings__button--test {
          background-color: #2196f3;
          color: white;
        }
        
        .voice-settings__button--test:hover:not(:disabled) {
          background-color: #1976d2;
        }
      `}</style>
    </div>
  );
};

export default VoiceSettings;