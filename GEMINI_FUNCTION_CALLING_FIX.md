# Gemini Function Calling Implementation

## 🚨 Problem Identified

The PAM AI system was configured to use **Google Gemini as the primary AI provider**, but:

- ❌ **Gemini provider had no function calling implementation**
- ❌ **Tool registry was OpenAI-format only**
- ❌ **No conversion between OpenAI tools and Gemini function_declarations**
- ❌ **PAM tools were not available when using Gemini**

This meant users couldn't access financial data, trip planning, or other tools through PAM.

## 🔧 Solution Implemented

### **1. New Function Calling Handler (`gemini_function_calling.py`)**

**Key Features:**
- **OpenAI → Gemini Conversion**: Converts OpenAI tool format to Gemini `function_declarations`
- **Function Execution**: Executes called functions through tool registry
- **Response Handling**: Processes function results and continues conversation
- **Error Handling**: Graceful fallback if function calling fails

**Core Classes:**
```python
class GeminiFunctionCallHandler:
    - convert_openai_tools_to_gemini()  # Format conversion
    - extract_function_calls()          # Parse Gemini responses
    - execute_function_call()           # Run functions via tool registry
    - handle_function_calling_conversation()  # Full conversation flow
```

### **2. Enhanced Gemini Provider (`gemini_provider.py`)**

**Added Function Calling Support:**
- **Tools Parameter**: `complete()` method now accepts `tools` and `user_id`
- **Automatic Conversion**: Converts OpenAI tools to Gemini format
- **Function Execution**: Handles multi-turn function calling conversations
- **Response Integration**: Returns function call results in AIResponse

**Integration Points:**
```python
async def complete(
    self,
    messages: List[AIMessage],
    tools: Optional[List[Dict[str, Any]]] = None,  # ✅ NEW
    user_id: Optional[str] = None,                 # ✅ NEW
    **kwargs
) -> AIResponse:
```

### **3. Tool Registry Integration**

**Setup Method:**
```python
def set_tool_registry(self, tool_registry):
    """Set up function calling with tool registry"""
    self.function_handler = get_gemini_function_handler(tool_registry=tool_registry)
```

## 🔄 How It Works

### **1. Tool Conversion Flow**
```
OpenAI Tool Format → Gemini function_declarations → Gemini Tools
{                    {                              [Tool(
  "name": "weather", "name": "weather",             function_declarations=[
  "parameters": {    "parameters": {                 FunctionDeclaration(...)
    "type": "object"   "type": "object"             ])]
  }                  }
}                    }
```

### **2. Function Calling Flow**
```
User Query → Gemini Model → Function Call → Tool Registry → Function Execution → Result → Gemini Model → Final Response
```

### **3. Integration with PAM System**
1. **AI Orchestrator** initializes Gemini provider as primary
2. **Tool Registry** provides available PAM tools (finance, navigation, etc.)
3. **Function Handler** converts tools to Gemini format
4. **Gemini Model** can now call PAM tools seamlessly
5. **User** gets responses with executed tool results

## 📋 Available Tools Now Working with Gemini

✅ **Financial Tools**: `manage_finances` - expense tracking, budgets, savings attribution
✅ **Navigation Tools**: `mapbox_navigator` - route planning, campgrounds, fuel costs
✅ **Media Search**: `search_travel_videos` - YouTube travel content
✅ **Profile Tools**: User data loading and context
✅ **Memory Tools**: Conversation history and context

## 🚀 Deployment Instructions

### **1. Install Dependencies**
```bash
cd backend
pip install google-generativeai>=0.8.0
```

### **2. Verify Environment Variables**
```bash
# Ensure GEMINI_API_KEY is set in backend/.env
GEMINI_API_KEY=your_gemini_api_key_here
```

### **3. Test Function Calling**
```bash
# Install missing package
pip install google-generativeai

# Run test
cd backend
python test_gemini_simple.py
```

### **4. Deploy to Staging**
```bash
git push origin staging
```

### **5. Verify on Staging**
1. Visit https://wheels-wins-backend-staging.onrender.com/api/health
2. Test PAM conversation with tool usage (e.g., "Show me my expenses")
3. Check logs for function calling activity

## 🔍 Key Implementation Details

### **Parameter Conversion**
```python
# OpenAI format
"parameters": {
    "type": "object",
    "properties": {
        "location": {"type": "string", "enum": ["metric", "imperial"]}
    },
    "required": ["location"]
}

# Converts to Gemini format (same structure, validated)
```

### **Function Call Extraction**
```python
# Extracts from Gemini response.candidates[0].content.parts[0].function_call
function_calls = [
    {
        "name": "get_weather",
        "arguments": {"location": "Sydney", "units": "metric"}
    }
]
```

### **Tool Registry Integration**
```python
# Executes through existing PAM tool registry
result = await self.tool_registry.execute_tool(
    tool_name=function_name,
    user_id=user_id,
    parameters=arguments
)
```

## ✅ Expected Results

After deployment:
- **PAM AI responses include tool execution** (financial data, trip planning, etc.)
- **Gemini Flash provides fast, cost-effective responses** with tool access
- **Error fallback** to regular chat if tools fail
- **Comprehensive logging** of function calls and execution
- **User context preserved** through function calls

## 🔧 Troubleshooting

### **Common Issues:**

1. **"Function calling handler failed to initialize"**
   - Install: `pip install google-generativeai>=0.8.0`

2. **"Tool registry not available"**
   - Ensure PersonalizedPamAgent initializes tool registry
   - Check that `set_tool_registry()` is called

3. **"No function calls extracted"**
   - Verify tools are being passed to `complete()` method
   - Check Gemini model supports function calling (Flash, Pro models)

4. **"Function execution failed"**
   - Verify user_id is provided for database context
   - Check tool registry has required tools registered

### **Debug Logging:**
```python
# Enable debug logging to see function calling flow
import logging
logging.getLogger('app.services.ai.gemini_function_calling').setLevel(logging.DEBUG)
```

## 🎯 Benefits

✅ **Cost Effective**: Gemini Flash is 25x cheaper than Claude
✅ **Fast Response**: Optimized for sub-second responses
✅ **Large Context**: 1M token context window
✅ **Tool Compatible**: Full PAM tool access
✅ **Fallback Safe**: Graceful degradation if tools fail
✅ **Multimodal**: Supports vision, audio, documents

This implementation enables PAM to leverage Gemini's speed and cost benefits while maintaining full tool functionality.