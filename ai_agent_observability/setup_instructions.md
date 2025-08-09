# 🚀 Setup Instructions for AI Agent Observability

This guide will walk you through setting up the complete observability stack step by step.

## 📋 Prerequisites

- Python 3.8 or higher
- pip package manager
- Git (optional, for cloning)

## 🔑 Step 1: Get API Keys

### OpenAI API Key
1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in to your account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)

### Langfuse Keys
1. Visit [Langfuse Cloud](https://cloud.langfuse.com)
2. Sign up for a free account
3. Create a new project
4. Go to Settings → API Keys
5. Copy both the **Public Key** and **Secret Key**

### AgentOps API Key
1. Visit [AgentOps](https://agentops.ai)
2. Sign up for an account
3. Navigate to API Keys section
4. Generate a new API key
5. Copy the key

## 📁 Step 2: Project Setup

### Option A: Use Existing Project
If you already have the files:

```bash
cd ai_agent_observability
```

### Option B: Create New Project
If starting from scratch:

```bash
mkdir ai_agent_observability
cd ai_agent_observability

# Copy all the Python files from the implementation
# Or download them from your preferred source
```

## 🔧 Step 3: Environment Configuration

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Edit the .env file:**
   ```bash
   nano .env
   # or use your preferred editor: code .env, vim .env, etc.
   ```

3. **Add your API keys:**
   ```env
   # OpenAI Configuration
   OPENAI_API_KEY=sk-your-openai-key-here
   
   # Langfuse Configuration  
   LANGFUSE_SECRET_KEY=sk-lf-your-secret-key-here
   LANGFUSE_PUBLIC_KEY=pk-lf-your-public-key-here
   LANGFUSE_HOST=https://cloud.langfuse.com
   
   # AgentOps Configuration
   AGENTOPS_API_KEY=your-agentops-key-here
   
   # Optional Settings
   ENVIRONMENT=development
   LOG_LEVEL=INFO
   ```

## 📦 Step 4: Install Dependencies

1. **Create a virtual environment (recommended):**
   ```bash
   python -m venv venv
   
   # Activate it:
   # On macOS/Linux:
   source venv/bin/activate
   # On Windows:
   venv\Scripts\activate
   ```

2. **Install required packages:**
   ```bash
   pip install -r requirements.txt
   ```

   If you get errors, try installing individually:
   ```bash
   pip install openai>=1.0.0
   pip install langfuse>=2.0.0
   pip install agentops>=0.3.0
   pip install pandas numpy python-dotenv
   pip install opentelemetry-api opentelemetry-sdk
   ```

## ✅ Step 5: Verify Setup

1. **Test the simple demo:**
   ```bash
   python main_example.py simple
   ```

   You should see:
   ```
   🔍 Starting Simple Analysis Demo
   ========================================
   📊 Created dataset: (500, 7)
   🔍 Running dataset analysis...
   ✅ Analysis completed!
   ```

2. **Check for any errors:**
   - API key authentication errors
   - Missing dependencies
   - Network connectivity issues

## 🎯 Step 6: Run Full Demo

Once the simple demo works:

```bash
python main_example.py full
```

This will:
- Initialize all three observability platforms
- Create a team of AI agents
- Run a comprehensive workflow
- Generate detailed monitoring reports

## 📊 Step 7: View Results

After running the demo, check your dashboards:

### OpenAI Dashboard
1. Visit https://platform.openai.com/usage
2. Log in with your OpenAI account
3. View API usage, token consumption, and costs

### Langfuse Dashboard
1. Visit https://cloud.langfuse.com
2. Log in to your account
3. Select your project
4. View traces, sessions, and custom metrics

### AgentOps Dashboard  
1. Visit https://app.agentops.ai
2. Log in to your account
3. View agent workflows and collaboration patterns

## 🔧 Troubleshooting

### Common Issues and Solutions

#### 1. "No module named 'openai'" Error
```bash
pip install openai --upgrade
```

#### 2. API Key Authentication Errors
- Double-check your API keys in the `.env` file
- Ensure no extra spaces or quotes around the keys
- Verify the keys are active and have proper permissions

#### 3. "Permission denied" Errors
```bash
# Make the script executable
chmod +x main_example.py

# Or run with python explicitly
python main_example.py
```

#### 4. Import Errors
```bash
# Check if you're in the right directory
ls -la

# Should show all the Python files:
# - observability_config.py
# - agents.py
# - tools.py
# - etc.
```

#### 5. Network/Firewall Issues
- Ensure your network allows HTTPS connections
- Check if you're behind a corporate firewall
- Try running from a different network if needed

### Debug Mode

If you encounter issues, enable debug mode:

```bash
export LOG_LEVEL=DEBUG
python main_example.py simple
```

This will show detailed logging information.

## 🎓 Next Steps

Once setup is complete:

1. **Explore the Code**: Look through the different modules to understand the architecture
2. **Customize Agents**: Modify the agents in `agents.py` for your use case
3. **Add Custom Tools**: Create new observable tools in `tools.py`
4. **Configure Monitoring**: Adjust thresholds and alerts in `monitoring.py`
5. **Integration**: Integrate the observability components into your existing AI agent systems

## 📚 Learning Resources

- **OpenAI API**: https://platform.openai.com/docs
- **Langfuse Docs**: https://langfuse.com/docs
- **AgentOps Docs**: https://docs.agentops.ai
- **Python Decorators**: https://realpython.com/primer-on-python-decorators/

## 🆘 Getting Help

If you encounter issues:

1. **Check the logs**: Look for error messages in the console output
2. **Verify API keys**: Double-check all your API keys are correct
3. **Test connectivity**: Ensure you can reach the external APIs
4. **Review requirements**: Make sure all dependencies are installed
5. **Start simple**: Begin with the simple demo before running the full demo

## 🎉 Success Indicators

You'll know everything is working when:

- ✅ The demo runs without errors
- ✅ You see traces in all three dashboards (OpenAI, Langfuse, AgentOps)
- ✅ Cost tracking shows accurate token usage
- ✅ Performance metrics are captured correctly
- ✅ Agent interactions are logged properly

Congratulations! You now have a fully functional AI agent observability stack. 🎊