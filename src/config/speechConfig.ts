// Speech Recognition Configuration
export const SPEECH_CONFIG = {
  // Add your Web Speech API key here
  API_KEY: import.meta.env.VITE_SPEECH_API_KEY || '',
  
  // API endpoint (if using a custom service)
  API_ENDPOINT: import.meta.env.VITE_SPEECH_API_ENDPOINT || '',
  
  // Language settings
  LANGUAGE: 'en-US',
  
  // Recognition settings
  CONTINUOUS: false,
  INTERIM_RESULTS: true,
  MAX_ALTERNATIVES: 1,
  
  // Timeout settings
  TIMEOUT_MS: 10000,
  
  // Service type
  SERVICE_TYPE: import.meta.env.VITE_SPEECH_SERVICE_TYPE || 'native', // 'native', 'google', 'azure', 'aws'
};

// Check if speech API is properly configured
export const isSpeechConfigured = () => {
  if (SPEECH_CONFIG.SERVICE_TYPE === 'native') {
    return true; // Native Web Speech API doesn't need a key
  }
  return !!SPEECH_CONFIG.API_KEY;
};

// Get speech service configuration
export const getSpeechServiceConfig = () => {
  switch (SPEECH_CONFIG.SERVICE_TYPE) {
    case 'google':
      return {
        type: 'google',
        apiKey: SPEECH_CONFIG.API_KEY,
        endpoint: 'https://speech.googleapis.com/v1/speech:recognize',
      };
    case 'azure':
      return {
        type: 'azure',
        apiKey: SPEECH_CONFIG.API_KEY,
        endpoint: SPEECH_CONFIG.API_ENDPOINT,
      };
    case 'aws':
      return {
        type: 'aws',
        apiKey: SPEECH_CONFIG.API_KEY,
        endpoint: SPEECH_CONFIG.API_ENDPOINT,
      };
    default:
      return {
        type: 'native',
        apiKey: null,
        endpoint: null,
      };
  }
};
