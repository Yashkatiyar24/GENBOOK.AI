# Web Speech API Setup Guide

## 🎤 **Voice Command API Configuration**

To enable voice command functionality, you need to configure your Web Speech API key.

### **Step 1: Create Environment File**

Create a `.env` file in your project root (if it doesn't exist) and add your API configuration:

```env
# Speech Recognition API Configuration
VITE_SPEECH_API_KEY=your_api_key_here
VITE_SPEECH_API_ENDPOINT=your_api_endpoint_here
VITE_SPEECH_SERVICE_TYPE=native

# Other existing environment variables
VITE_SUPABASE_URL=https://deddapftymntugxdxnmo.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
```

### **Step 2: API Key Types**

#### **Option A: Native Web Speech API (Recommended)**
```env
VITE_SPEECH_SERVICE_TYPE=native
# No API key needed - uses browser's built-in speech recognition
```

#### **Option B: Google Cloud Speech-to-Text**
```env
VITE_SPEECH_SERVICE_TYPE=google
VITE_SPEECH_API_KEY=your_google_cloud_api_key
```

#### **Option C: Azure Speech Services**
```env
VITE_SPEECH_SERVICE_TYPE=azure
VITE_SPEECH_API_KEY=your_azure_speech_key
VITE_SPEECH_API_ENDPOINT=https://your-region.api.cognitive.microsoft.com/sts/v1.0/issueToken
```

#### **Option D: Amazon Transcribe**
```env
VITE_SPEECH_SERVICE_TYPE=aws
VITE_SPEECH_API_KEY=your_aws_access_key
VITE_SPEECH_API_ENDPOINT=https://transcribe.your-region.amazonaws.com
```

### **Step 3: Get API Keys**

#### **For Google Cloud Speech-to-Text:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Speech-to-Text API
4. Create credentials (API Key)
5. Copy the API key to your `.env` file

#### **For Azure Speech Services:**
1. Go to [Azure Portal](https://portal.azure.com/)
2. Create a Speech resource
3. Get the key and region
4. Add to your `.env` file

#### **For Amazon Transcribe:**
1. Go to [AWS Console](https://aws.amazon.com/)
2. Create an IAM user with Transcribe permissions
3. Get Access Key ID and Secret Access Key
4. Add to your `.env` file

### **Step 4: Test Configuration**

1. **Restart your development server:**
   ```bash
   npm run dev
   ```

2. **Open the app:** `http://localhost:5175`

3. **Click the microphone icon** to open VoiceCommand

4. **Check console logs** for configuration status:
   - Should see "Speech configuration: {...}"
   - Should see "Speech configured: true"
   - Should see "Using speech service: {...}"

### **Step 5: Troubleshooting**

#### **If you see "Speech API not configured":**
- Check that your `.env` file exists in the project root
- Verify your API key is correct
- Restart the development server after adding the `.env` file

#### **If you see "Web Speech API not supported":**
- Use Chrome, Edge, or Safari browser
- Make sure you're on HTTPS or localhost
- Check browser permissions for microphone access

#### **If voice recognition still doesn't work:**
- Check browser console for detailed error messages
- Ensure microphone permissions are granted
- Try the text input fallback option

### **Current Status**

✅ **Configuration System**: Ready to accept your API key
✅ **Native Web Speech API**: Fully supported
🔄 **Cloud Services**: Framework ready (needs implementation)
✅ **Fallback System**: Text input always available
✅ **Error Handling**: Comprehensive error messages

### **Next Steps**

1. **Add your API key** to the `.env` file
2. **Restart the server** to load the configuration
3. **Test voice commands** in the application
4. **Check console logs** for debugging information

Your voice command system is now ready to use with your Web Speech API key! 🎤✨
