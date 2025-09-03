# Health AI Setup Guide

## Quick Setup for Health AI Consultation

The Health AI is fully installed and ready to use. It just needs API keys to be configured in Netlify.

### Step 1: Get an API Key

Choose one of these options:

#### Option A: OpenAI (GPT-4)
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key (starts with `sk-`)

#### Option B: Anthropic (Claude)
1. Go to https://console.anthropic.com/settings/keys
2. Create a new API key
3. Copy the key (starts with `sk-ant-`)

### Step 2: Add to Netlify

1. Go to your Netlify dashboard
2. Select your site (wheels-wins-landing-page)
3. Go to **Site configuration** → **Environment variables**
4. Click **Add a variable**
5. Add one of these:
   - Name: `OPENAI_API_KEY` Value: `your-openai-key`
   - OR
   - Name: `ANTHROPIC_API_KEY` Value: `your-anthropic-key`
6. Click **Save**
7. **Redeploy** your site for changes to take effect

### Step 3: Test the AI

Once configured, the Health AI will work just like ChatGPT and can answer questions like:

- "I have a rash on my elbow"
- "What are the symptoms of dehydration?"
- "How should I store insulin in my RV?"
- "What questions should I ask my doctor about high blood pressure?"

### What the AI Can Do

With proper API keys configured, the AI provides:

✅ **Symptom Information** - Like "I have a rash on my elbow"
- Checks basics (itchy, painful, spreading?)
- Immediate care steps
- When to seek medical care
- Possible causes (without diagnosing)

✅ **Medical Term Explanations**
- Simple language explanations
- Context-aware definitions
- Related information

✅ **Medication Information**
- General drug information
- Storage guidelines for RVs
- Questions for pharmacist
- Side effect information

✅ **Travel Health**
- RV-specific health tips
- Finding doctors on the road
- Prescription management across states
- Climate adaptation

✅ **Emergency Detection**
- Recognizes emergency symptoms
- Provides correct local emergency number
- Urgent care guidance

### Cost Estimates

- **OpenAI GPT-4**: ~$0.01-0.03 per conversation
- **Anthropic Claude**: ~$0.01-0.02 per conversation
- Both offer free credits to start

### Security Notes

- API keys are stored securely in Netlify environment variables
- Never commit API keys to code
- Keys are only used server-side in Netlify Functions
- All health data stays private

### Troubleshooting

If the AI isn't working:

1. **Check API key is set correctly** in Netlify environment variables
2. **Redeploy the site** after adding the key
3. **Check the browser console** for error messages
4. **Verify the API key is valid** by testing it directly with the provider

### Without API Keys

Without API keys configured, the system will show:
"The AI health consultation service is not currently configured."

Once you add the keys, it will work exactly like ChatGPT for health questions, providing comprehensive, helpful responses while maintaining appropriate medical disclaimers.