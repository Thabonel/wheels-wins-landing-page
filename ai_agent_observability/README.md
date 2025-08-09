# 🔍 AI Agent Observability Stack

A comprehensive observability solution for AI agents integrating **OpenAI Tracing**, **Langfuse**, and **AgentOps** for complete visibility into agent workflows, performance, and costs.

## 🚀 Features

### 🎯 Full Observability Stack
- **OpenAI Tracing**: Direct LLM call monitoring and token usage tracking
- **Langfuse**: Advanced LLM observability with custom dashboards and evaluations
- **AgentOps**: Agent workflow tracking and collaboration monitoring
- **Custom Monitoring**: Error tracking, cost analysis, and performance metrics

### 🤖 Multi-Agent System
- **CEO Agent**: Task delegation and workflow oversight
- **Developer Agent**: Code generation and review capabilities
- **Data Analyst Agent**: Comprehensive dataset analysis and insights

### 🛠️ Advanced Tools
- **Dataset Analysis Tool**: Full observability for data processing workflows
- **Cost Tracking**: Real-time cost estimation and budget alerts
- **Error Monitoring**: Comprehensive error tracking and alerting
- **Performance Analytics**: Response time and success rate monitoring

## 📋 Quick Start

### 1. Installation

```bash
# Clone or download the project
cd ai_agent_observability

# Install dependencies
pip install -r requirements.txt
```

### 2. Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your API keys
nano .env
```

Required API keys:
- `OPENAI_API_KEY`: Your OpenAI API key
- `LANGFUSE_SECRET_KEY`: Langfuse secret key
- `LANGFUSE_PUBLIC_KEY`: Langfuse public key  
- `AGENTOPS_API_KEY`: AgentOps API key

### 3. Run the Demo

```bash
# Full multi-agent demo
python main_example.py full

# Simple analysis demo
python main_example.py simple

# Show help
python main_example.py help
```

## 🔧 Architecture

### Core Components

```
observability_config.py    # Central configuration for all platforms
├── OpenAI Integration     # Direct API tracing and token monitoring
├── Langfuse Integration   # LLM observability and evaluation
└── AgentOps Integration   # Workflow and collaboration tracking

langfuse_utils.py          # Enhanced Langfuse decorators and monitoring
├── @observe_agent()       # Agent function monitoring
├── @observe_tool()        # Tool usage tracking
└── @observe_llm_call()    # LLM call observation

agentops_utils.py          # AgentOps workflow tracking
├── @track_agent_action()  # Individual agent actions
├── @track_llm_call()      # LLM usage via AgentOps
└── @track_tool_usage()    # Tool usage monitoring

monitoring.py              # Advanced monitoring and alerting
├── Cost Tracking          # Token usage and cost estimation
├── Error Monitoring       # Comprehensive error tracking
├── Performance Metrics    # Response time and success rates
└── Alert System           # Threshold-based alerting

agents.py                  # Sample AI agents with full observability
├── CEOAgent              # Task delegation and oversight
├── DeveloperAgent        # Code generation and review
└── DataAnalystAgent      # Data analysis and insights

tools.py                  # Observable tools and utilities
└── AnalyzeDatasetTool    # Comprehensive dataset analysis
```

## 📊 Dashboard Views

After running the demo, view results in:

### OpenAI Dashboard
- **URL**: https://platform.openai.com/usage
- **Shows**: Token usage, API calls, costs per model
- **Features**: Real-time usage tracking, billing information

### Langfuse Dashboard  
- **URL**: https://cloud.langfuse.com
- **Shows**: LLM traces, custom metrics, evaluation scores
- **Features**: Custom dashboards, trace analysis, performance optimization

### AgentOps Dashboard
- **URL**: https://app.agentops.ai  
- **Shows**: Agent workflows, collaboration patterns, session analytics
- **Features**: Workflow visualization, agent performance, collaboration tracking

## 🎯 Usage Examples

### Basic Agent Usage

```python
from observability_config import observability
from agents import create_agent_team

# Initialize observability
observability.initialize_all()

# Create agent team
agents = create_agent_team()

# Use agents with automatic observability
ceo = agents['ceo']
analyst = agents['analyst']

# Delegate task (automatically tracked)
result = ceo.delegate_task(analyst, "Analyze customer data")

# Perform analysis (fully observable)
analysis = analyst.analyze_dataset(dataframe)
```

### Custom Tool with Observability

```python
from langfuse_utils import langfuse_monitor
from agentops_utils import agentops_monitor

@langfuse_monitor.observe_tool(tool_name="custom_tool", version="1.0")
@agentops_monitor.track_tool_usage(tool_name="custom_tool")
def my_custom_tool(data):
    # Your tool logic here
    return processed_data
```

### Cost and Performance Monitoring

```python
from monitoring import global_monitor, monitor_function

@monitor_function(global_monitor)
def my_function():
    # Function automatically monitored for:
    # - Execution time
    # - Success/failure rate  
    # - Error tracking
    # - Cost estimation
    pass

# Get comprehensive metrics
dashboard_data = global_monitor.get_dashboard_data()
report = global_monitor.generate_report()
```

## 📈 Monitoring Features

### Cost Tracking
- Real-time token usage monitoring
- Cost estimation per model type
- Budget threshold alerts
- Cost per operation analysis

### Error Monitoring  
- Comprehensive error categorization
- Error rate tracking and alerting
- Error history and patterns
- Context-aware error logging

### Performance Analytics
- Response time distribution
- Success rate monitoring
- Performance threshold alerts  
- Throughput analysis

### Agent Collaboration
- Inter-agent communication tracking
- Task delegation monitoring
- Workflow visualization
- Collaboration pattern analysis

## 🔧 Configuration Options

### Alert Thresholds

```python
# Customize in monitoring.py
cost_alert_threshold = 10.0      # USD
error_rate_threshold = 0.1       # 10%  
response_time_threshold = 30.0   # seconds
```

### Model Cost Configuration

```python
# Update model costs in monitoring.py
model_costs = {
    "gpt-4": {"input": 0.03, "output": 0.06},
    "gpt-4-turbo": {"input": 0.01, "output": 0.03},
    "custom-model": {"input": 0.02, "output": 0.04}
}
```

## 🚨 Alerting

The system includes built-in alerting for:

- **Cost Overruns**: When estimated costs exceed thresholds
- **Error Rates**: When error rates exceed acceptable levels  
- **Performance Issues**: When response times are too slow
- **Token Usage**: When token consumption is high

Alerts are logged and can be extended to integrate with:
- Slack notifications
- Email alerts  
- PagerDuty integration
- Custom webhook endpoints

## 🔬 Advanced Features

### Human-in-the-Loop Evaluation

```python
# Add evaluation scores via Langfuse
from langfuse_utils import langfuse_monitor

langfuse_monitor.log_evaluation(
    trace_id="trace_123",
    name="response_quality", 
    value=0.95,
    comment="Excellent analysis quality"
)
```

### Dataset Management

```python
# Create evaluation datasets
dataset = langfuse_monitor.create_dataset(
    name="agent_evaluations",
    description="Dataset for agent performance evaluation"
)
```

### Custom Metrics

```python
# Track custom business metrics
from langfuse.decorators import langfuse_context

langfuse_context.update_current_observation(
    metadata={
        "business_metric": "customer_satisfaction",
        "value": 4.2,
        "improvement": "+0.3"
    }
)
```

## 🐛 Troubleshooting

### Common Issues

1. **API Key Errors**
   - Verify all API keys in `.env` file
   - Check key permissions and usage limits

2. **Import Errors**  
   - Ensure all dependencies are installed: `pip install -r requirements.txt`
   - Check Python version compatibility (3.8+)

3. **Dashboard Access**
   - Verify account access to each platform
   - Check if data is appearing with some delay

4. **Cost Tracking Issues**
   - Ensure token usage is being captured correctly
   - Update model cost configurations if using custom models

### Debug Mode

```python
# Enable debug logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Or set in environment
export LOG_LEVEL=DEBUG
```

## 🤝 Contributing

Contributions welcome! Areas for improvement:

- Additional agent types and tools
- Enhanced visualization capabilities  
- Integration with more observability platforms
- Advanced alerting and automation features
- Performance optimizations

## 📄 License

This project is provided as an educational example. Check individual platform terms for production usage.

## 🔗 Resources

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Langfuse Documentation](https://langfuse.com/docs) 
- [AgentOps Documentation](https://docs.agentops.ai)
- [Agency Swarm Framework](https://github.com/VRSEN/agency-swarm)

---

**Built with ❤️ for the AI observability community**