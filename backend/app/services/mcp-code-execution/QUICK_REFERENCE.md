# MCP Code Execution - Quick Reference

**For**: Developers integrating MCP into existing PAM system
**Read Time**: 5 minutes

---

## What This Is

A reference implementation of **Anthropic's "Code Execution with MCP" pattern** that reduces token usage by **98.7%** (150K → 2K tokens per conversation).

**Instead of**: Loading 100+ tool definitions into Claude's context
**Do this**: Agent writes Python code, tools loaded on-demand

---

## Directory Structure

```
backend/app/services/mcp-code-execution/
├── client.py               # call_mcp_tool(tool_name, input, type)
├── tool_discovery.py       # search_tools(query, detail_level)
├── servers/                # Tool wrappers (GitHub, filesystem, etc)
│   └── github/
│       ├── create_issue.py
│       ├── get_file_contents.py
│       └── ...
├── skills/                 # Agent-created reusable functions
├── workspace/              # Intermediate data storage
└── examples/               # Demonstration workflows
```

---

## Core Concepts

### Progressive Disclosure
Load tool information in 3 levels to minimize tokens:

**Level 1: Name Only** (~50 tokens for 100 tools)
```python
tools = search_tools(query="github", detail_level="name_only")
# Returns: [{"name": "create_issue", "server": "github"}, ...]
```

**Level 2: With Description** (~500 tokens for 100 tools)
```python
tools = search_tools(query="create_issue", detail_level="with_description")
# Returns: [{"name": "create_issue", "description": "...", "import": "..."}, ...]
```

**Level 3: Full Schema** (~1,500 tokens for 100 tools)
```python
tool = search_tools(query="create_issue", detail_level="full")[0]
# Returns: Complete input/output schemas
```

### Agent Workflow
```
1. Agent: search_tools("github file") → ["get_file_contents", ...]
2. Agent: Get description for relevant tools
3. Agent: Write Python code to accomplish task
4. Sandbox: Execute code, call MCP tools as needed
5. Sandbox: Return only results (not all data) to context
```

---

## Key Files

### client.py - Base MCP Client
```python
from client import call_mcp_tool

# Call any MCP tool
result = await call_mcp_tool(
    'mcp__github__create_issue',
    {'owner': 'myorg', 'repo': 'myrepo', 'title': 'Bug'},
    dict
)
```

### tool_discovery.py - Progressive Disclosure
```python
from tool_discovery import search_tools

# Search for tools
tools = search_tools(
    query="github",
    detail_level="name_only",
    limit=10
)
```

### servers/*/tool.py - Tool Wrapper Pattern
```python
from typing import TypedDict
from ...client import call_mcp_tool

class CreateIssueInput(TypedDict):
    owner: str
    repo: str
    title: str

class CreateIssueResponse(TypedDict):
    number: int
    url: str

async def create_issue(input: CreateIssueInput) -> CreateIssueResponse:
    return await call_mcp_tool(
        'mcp__github__create_issue',
        input,
        CreateIssueResponse
    )
```

---

## Token Savings Comparison

### Traditional MCP Approach
```
System prompt:         5,000 tokens
Tool definitions:    150,000 tokens (100 tools × 1,500 each)
User query:               50 tokens
Claude response:         500 tokens
Tool results:          2,000 tokens
────────────────────────────────────
TOTAL:               157,550 tokens
```

### Code Execution Approach
```
System prompt:         1,000 tokens (explains code execution)
Tool search:              50 tokens (search_tools(...))
Tool imports:            200 tokens (only needed tools)
Agent code:              500 tokens (Python orchestration)
Execution results:     2,000 tokens
────────────────────────────────────
TOTAL:                 3,750 tokens

SAVINGS: 153,800 tokens (97.6%)
COST: $0.46 saved per conversation (at $3/1M input tokens)
```

---

## Use Cases

### ✅ GOOD: Data Filtering
```python
# Get 10,000 rows in sandbox (not context)
all_rows = await get_sheet({'sheetId': 'abc123'})

# Filter in Python (efficient!)
pending = [row for row in all_rows if row["Status"] == "pending"]

# Only return summary (500 tokens vs 50K)
print(f"Found {len(pending)} pending orders")
print(pending[:5])
```

**Traditional MCP**: 50,000+ tokens (loads all 10K rows)
**Code Execution**: 500 tokens (only summary)

### ✅ GOOD: Multi-Step Workflows
```python
# Plan trip → find parks → calculate costs (in one code block)
trip = await plan_trip({'origin': 'Phoenix', 'destination': 'Seattle'})
parks = await find_rv_parks({'locations': trip['waypoints']})
gas_cost = await calculate_gas_cost({'distance': trip['distance']})

print(f"Trip cost: ${gas_cost + sum(p['cost'] for p in parks)}")
```

**Traditional MCP**: 3 separate API calls, 3x context updates
**Code Execution**: 1 code block, 1 result

### ✅ GOOD: Polling Loops
```python
# Wait for deployment (loop in code, not context)
while not found:
    messages = await get_channel_history({'channel': 'C123'})
    found = any('deployment complete' in m['text'] for m in messages)
    if not found:
        await asyncio.sleep(5)

print("Deployment complete!")
```

**Traditional MCP**: 10+ API calls, each loads full context
**Code Execution**: 1 code block, 1 result at end

### ❌ BAD: Simple Single Tool Calls
```python
# Don't use code execution for:
result = await get_weather({'location': 'Sydney'})  # Too simple, use direct tool
```

**When to use direct tools**: Single call, no data processing, <100 rows

---

## Integration with Existing PAM

### Option 1: Add as Enhancement (Recommended)
Keep existing tools, add code execution for data-heavy operations.

```python
# In pam.py system prompt, add:
"""
NEW CAPABILITY: Code Execution

When you need to:
- Filter large datasets (>100 rows)
- Execute multi-step workflows (3+ tool calls)
- Wait for external API results (polling)

Write Python code instead of using tools directly.

Example:
from servers.supabase import get_expenses
expenses = await get_expenses(user_id='{user_id}')
filtered = [e for e in expenses if e['amount'] > 100]
print(f"Found {len(filtered)} expenses over $100")
```

### Option 2: Full Migration (Future)
Replace all 47 existing tools with MCP wrappers.

---

## Example Workflows

### Workflow 1: GitHub Issue from Document
See: `examples/workflow_github_issue.py`

**Token cost**: 3,750 vs 157,550 (97.6% reduction)

### Workflow 2: Data Filtering
See: `examples/workflow_data_filtering.py`

**Token cost**: 3,800 vs 205,000 (98.1% reduction)

---

## Testing

### Run Example Workflows
```bash
cd backend/app/services/mcp-code-execution/examples

# Test token savings demonstration
python workflow_github_issue.py

# Test data filtering demonstration
python workflow_data_filtering.py
```

### Verify Tool Discovery
```python
from tool_discovery import search_tools

# Should return 5 GitHub tools
tools = search_tools(query="github", detail_level="name_only")
assert len(tools) == 5

# Should include descriptions
tools = search_tools(query="create_issue", detail_level="with_description")
assert 'description' in tools[0]
```

---

## Security

### Sandbox Execution (Not Yet Implemented)
```python
# Future: Execute in Docker container with limits
executor = CodeExecutor()
result = await executor.execute(
    code=agent_code,
    timeout=30,
    memory_limit="512M",
    cpu_limit=1.0
)
```

### Current Limitations
- ⚠️ Code runs on main backend (not isolated)
- ⚠️ No resource limits enforced
- ⚠️ No malicious code detection

**Status**: Demonstration/reference implementation only
**Before production**: Add Docker sandbox + security scanning

---

## Performance

### Metrics to Track
- **Token usage**: Before/after per conversation
- **Cost savings**: $3/1M input + $15/1M output tokens
- **Latency**: Code execution time (<2s target)
- **Error rate**: Tool call failures (<1% target)

### Expected Improvements
- **95%+ token reduction** for data-heavy queries
- **50%+ latency reduction** (fewer context switches)
- **90%+ cost reduction** ($0.46 saved per conversation)

---

## Troubleshooting

### Issue: Tool not found
```python
# Check tool exists
tools = search_tools(query="tool_name", detail_level="name_only")
print(tools)

# Check server directory
ls backend/app/services/mcp-code-execution/servers/
```

### Issue: Import error
```python
# Verify tool wrapper syntax
python -m py_compile servers/github/create_issue.py
```

### Issue: MCP call fails
```python
# Check tool name matches MCP server
# Format: mcp__<server>__<tool>
await call_mcp_tool('mcp__github__create_issue', ...)
```

---

## Next Steps

1. **Read**: [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) for detailed integration plan
2. **Review**: [README.md](README.md) for complete architecture documentation
3. **Test**: Run example workflows to see token savings
4. **Integrate**: Follow hybrid approach (Option 1) for safe rollout

---

## Resources

- **Anthropic Blog**: [Code Execution with MCP](https://www.anthropic.com/news/code-execution-with-mcp)
- **MCP Protocol**: [modelcontextprotocol.io](https://modelcontextprotocol.io)
- **Claude API**: [docs.anthropic.com](https://docs.anthropic.com)

---

**Questions?** See [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) or ask the team.

**Status**: ✅ Reference implementation complete
**Ready for**: Testing and integration planning
