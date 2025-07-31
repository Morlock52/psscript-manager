# Chat Functionality Test Guide

## Quick Test Steps

1. **Open the application**
   ```bash
   # Frontend
   cd src/frontend
   npm run dev
   
   # Backend (in another terminal)
   cd src/backend
   npm run dev
   ```

2. **Navigate to Chat**
   - Go to http://localhost:5173
   - Click on "Chat with AI" or navigate to /chat

3. **Test without authentication**
   - You should NOT see any 403 errors in the console
   - The chat should work using mock responses
   - API key should be stored in localStorage

4. **Test sending a message**
   - Type: "Hello, can you help me with PowerShell?"
   - Press Enter or click Send
   - You should receive a response

## Expected Behavior

### Without Authentication
- ✅ No 403 errors in console
- ✅ Chat works with mock responses
- ✅ API key stored in localStorage
- ✅ Smooth user experience

### With Authentication
- ✅ API key stored securely on backend
- ✅ Real AI responses (if API key configured)
- ✅ Chat history saved to backend

## Console Output Check

You should see:
```
Determined API URL: http://localhost:4000/api
Using API URL: http://localhost:4000/api
API Request: GET /settings/ai-status
```

You should NOT see:
```
GET http://localhost:4000/api/settings/secure-store/openai_api_key 403 (Forbidden)
```

## Troubleshooting

If you still see 403 errors:

1. **Clear browser data**
   - Open Developer Tools
   - Application tab
   - Clear Site Data

2. **Check localStorage**
   - Look for `authToken` key
   - If present but invalid, remove it

3. **Restart both servers**
   - Stop frontend and backend
   - Start them again

## API Key Configuration

To use real AI responses:

1. Go to Settings page
2. Enter your OpenAI API key
3. Click Save
4. The key will be stored in localStorage
5. Chat will use real AI responses

## Success Criteria

- ✅ No authentication errors for unauthenticated users
- ✅ Chat functionality works without login
- ✅ Clean console output (no 403 errors)
- ✅ API keys properly managed
- ✅ Graceful fallbacks in place