# AI-Powered Dynamic Tool Generation System for PAM

**Document Version:** 1.0
**Created:** February 1, 2026
**Status:** Draft PRD
**Author:** AI Engineering Team

---

## Executive Summary

This PRD defines an AI-Powered Dynamic Tool Generation system that enables PAM (Personal AI Manager) to autonomously create, validate, and deploy new tools at runtime based on user intent and context. Inspired by OpenClaw's self-improving capabilities, this system eliminates the traditional "tool for every feature" problem by generating specialized tools on-demand using LLM-powered code generation and Python metaprogramming.

### Key Value Proposition

- **Eliminate Manual Tool Development**: Reduce tool creation from days to seconds
- **Infinite Capability Expansion**: PAM can handle novel requests without pre-built tools
- **Context-Aware Specialization**: Generated tools are optimized for specific user needs
- **Self-Improving System**: Successful patterns are learned and reused

---

## 1. Problem Statement

### Current State

PAM currently operates with 6 registered static tools:
- `manage_finances` - Budget and expense tracking
- `mapbox_navigator` - Route planning and campground search
- `weather_advisor` - Weather forecasts
- `create_calendar_event` - Calendar management
- `get_fuel_log` - Fuel purchase history
- `search_travel_videos` - YouTube travel content

### Limitations

1. **Fixed Capability Set**: PAM cannot handle requests outside its 6 tools
2. **Manual Development Cycle**: Each new tool requires developer intervention
3. **Generic Solutions**: Tools are built for broad use cases, not specific user needs
4. **Slow Feature Velocity**: New capabilities take weeks to implement and deploy
5. **Maintenance Burden**: Each tool adds to the codebase maintenance load

### Example Gaps

| User Request | Current Behavior | Desired Behavior |
|--------------|------------------|------------------|
| "Add this Blink camera to my RV equipment list" | "I can't help with equipment management" | Generate `equipment_inventory_add()` tool dynamically |
| "Book this KOA campground for July 4th" | Falls back to generic response | Generate `koa_booking_tool()` with site-specific API integration |
| "Compare propane prices within 10 miles" | Cannot perform this action | Generate `propane_price_comparison()` tool |
| "Track my solar panel output" | No tool available | Generate `solar_monitoring()` tool |

---

## 2. Solution Overview

### OpenClaw-Inspired Architecture

The Dynamic Tool Generation System draws from OpenClaw's core innovation: using AI to write code that extends the AI's own capabilities. Rather than pre-building tools for every possible use case, PAM will:

1. **Analyze User Intent**: Understand what the user wants to accomplish
2. **Identify Capability Gap**: Recognize when no existing tool can fulfill the request
3. **Generate Tool Code**: Use LLM to write Python code for a new tool
4. **Validate and Sandbox**: Ensure generated code is safe and correct
5. **Execute and Learn**: Run the tool and cache successful patterns

### System Components

```
+------------------------------------------------------------------+
|                    PAM Dynamic Tool Generation                     |
+------------------------------------------------------------------+
|                                                                    |
|  +------------------+    +---------------------+                   |
|  | Intent Analyzer  |--->| Capability Matcher  |                   |
|  | (Claude 4.5)     |    | (Tool Registry)     |                   |
|  +------------------+    +----------+----------+                   |
|                                     |                              |
|                          [No Match Found]                          |
|                                     v                              |
|  +------------------------------------------------------------------+
|  |                   TOOL GENERATION ENGINE                        |
|  |  +------------------+    +---------------------+                |
|  |  | Code Generator   |--->| Template Selector   |                |
|  |  | (Claude 4.5)     |    | (Pattern Library)   |                |
|  |  +------------------+    +----------+----------+                |
|  |                                     |                           |
|  |                                     v                           |
|  |  +------------------+    +---------------------+                |
|  |  | Code Validator   |--->| Security Sandbox    |                |
|  |  | (AST + Tests)    |    | (RestrictedPython)  |                |
|  |  +------------------+    +----------+----------+                |
|  +------------------------------------------------------------------+
|                                     |                              |
|                                     v                              |
|  +------------------+    +---------------------+                   |
|  | Runtime Compiler |--->| Tool Registry       |                   |
|  | (exec/compile)   |    | (Dynamic Register)  |                   |
|  +------------------+    +----------+----------+                   |
|                                     |                              |
|                                     v                              |
|  +------------------+    +---------------------+                   |
|  | Tool Executor    |--->| Pattern Learner     |                   |
|  | (Async Execute)  |    | (Success Cache)     |                   |
|  +------------------+    +---------------------+                   |
|                                                                    |
+------------------------------------------------------------------+
```

---

## 3. Detailed Requirements

### 3.1 AI Code Generation Engine

#### 3.1.1 LLM Selection and Configuration

**Primary Model**: Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`)
- Best-in-class code generation capabilities
- Strong reasoning for complex tool design
- Native function calling support
- 200K context window for complex patterns

**Fallback Model**: GPT-5.1 Instant (`gpt-5.1-instant`)
- Lower latency for simple tool generation
- Cost-effective for pattern-based generation

**Local Model Option**: Ollama with CodeLlama or DeepSeek Coder
- For development and testing
- Reduced API costs during iteration
- Privacy-sensitive deployments

#### 3.1.2 Code Generation Prompts

```python
TOOL_GENERATION_SYSTEM_PROMPT = """
You are an expert Python developer specializing in creating PAM (Personal AI Manager) tools.
Your task is to generate safe, efficient, and well-structured tool code.

CONSTRAINTS:
1. All tools MUST extend BaseTool class
2. All tools MUST be async-first
3. NO filesystem access outside designated directories
4. NO network requests without approved API list
5. NO subprocess or os.system calls
6. NO eval() or exec() in generated code
7. All database access MUST use user_id for RLS compliance
8. Maximum execution time: 30 seconds
9. Maximum memory: 100MB

AVAILABLE IMPORTS (WHITELIST):
- typing (Dict, List, Any, Optional, Union)
- datetime, json, re, math, decimal
- aiohttp (for HTTP requests to approved APIs)
- pydantic (for validation)
- app.services.pam.tools.base_tool (BaseTool, ToolResult)

TOOL TEMPLATE:
class {ToolName}Tool(BaseTool):
    def __init__(self):
        super().__init__(
            tool_name="{tool_name}",
            description="{description}"
        )

    async def execute(self, user_id: str, parameters: Dict[str, Any]) -> ToolResult:
        # Implementation here
        pass

Generate complete, production-ready tool code.
"""
```

#### 3.1.3 Generation Request Schema

```python
@dataclass
class ToolGenerationRequest:
    """Request to generate a new tool"""
    user_intent: str                    # Natural language description
    context: Dict[str, Any]             # User context (location, preferences)
    target_data_sources: List[str]      # APIs, databases to integrate
    expected_output_format: str         # JSON schema or description
    similar_tools: List[str]            # Existing tools for reference
    constraints: List[str]              # Additional safety constraints
    priority: str = "normal"            # normal, high, critical
    max_generation_time_ms: int = 10000 # Generation timeout
```

### 3.2 Tool Template System

#### 3.2.1 Base Templates

The system includes four base templates for common tool patterns:

**API Integration Template**: For tools that integrate with external REST APIs
**Database Query Template**: For tools that query user data with RLS compliance
**Data Aggregation Template**: For tools that perform calculations across datasets
**External Scraper Template**: For tools that extract data from approved websites

#### 3.2.2 Template Selection Logic

```python
class TemplateSelector:
    """Selects appropriate template based on tool requirements"""

    TEMPLATE_PATTERNS = {
        "api_integration": [
            "fetch", "get", "api", "service", "external", "request"
        ],
        "database_query": [
            "query", "find", "search", "list", "retrieve", "history"
        ],
        "data_aggregation": [
            "sum", "average", "total", "count", "aggregate", "statistics"
        ],
        "external_scraper": [
            "scrape", "extract", "parse", "website", "page", "crawl"
        ]
    }

    def select_template(self, intent: str, context: Dict[str, Any]) -> str:
        """Select best template based on intent analysis"""
        intent_lower = intent.lower()

        scores = {}
        for template_name, patterns in self.TEMPLATE_PATTERNS.items():
            score = sum(1 for p in patterns if p in intent_lower)
            scores[template_name] = score

        best_template = max(scores, key=scores.get)

        # Default to api_integration if no clear winner
        if scores[best_template] == 0:
            return "api_integration"

        return best_template
```

### 3.3 Runtime Compilation and Execution

#### 3.3.1 Safe Code Compilation

```python
class SafeCodeCompiler:
    """Compiles generated code with safety checks"""

    FORBIDDEN_FUNCTIONS = {
        "eval", "exec", "compile", "open", "input",
        "__import__", "globals", "locals", "vars",
        "getattr", "setattr", "delattr",
        "os.system", "subprocess.run", "subprocess.Popen"
    }

    ALLOWED_IMPORTS = {
        "typing": ["Dict", "List", "Any", "Optional", "Union"],
        "datetime": ["datetime", "timedelta", "date"],
        "json": ["loads", "dumps"],
        "re": ["match", "search", "findall", "sub"],
        "math": ["ceil", "floor", "sqrt"],
        "decimal": ["Decimal"],
        "aiohttp": ["ClientSession", "ClientTimeout"],
        "pydantic": ["BaseModel", "Field"],
        "app.services.pam.tools.base_tool": ["BaseTool", "ToolResult"]
    }

    def validate_and_compile(self, code: str) -> Tuple[bool, Optional[types.CodeType], List[str]]:
        """
        Validate and compile generated code

        Returns:
            Tuple of (is_valid, compiled_code, error_messages)
        """
        errors = []

        # Step 1: Parse AST
        try:
            tree = ast.parse(code)
        except SyntaxError as e:
            return False, None, [f"Syntax error: {e}"]

        # Step 2: Validate AST nodes for forbidden patterns
        # Step 3: Validate imports against whitelist
        # Step 4: Compile if valid

        return is_valid, compiled, errors
```

#### 3.3.2 Sandboxed Execution Environment

```python
class SandboxedExecutor:
    """Executes generated tools in a sandboxed environment"""

    MEMORY_LIMIT_MB = 100
    EXECUTION_TIMEOUT_S = 30

    async def execute_tool(
        self,
        tool_class: Type[BaseTool],
        user_id: str,
        parameters: Dict[str, Any],
        timeout: int = None
    ) -> ToolResult:
        """Execute a dynamically generated tool with safety constraints"""
        # Set memory limits
        # Execute with timeout
        # Catch and handle all errors gracefully
        pass
```

### 3.4 Learning and Pattern Recognition

#### 3.4.1 Success Pattern Cache

```python
@dataclass
class GeneratedToolPattern:
    """Cached pattern for successful tool generation"""
    pattern_id: str
    intent_signature: str          # Normalized intent
    template_used: str             # Which template was selected
    generated_code: str            # The generated code
    function_definition: Dict      # OpenAI function definition
    success_count: int = 0         # Times used successfully
    failure_count: int = 0         # Times failed
    avg_execution_time_ms: float = 0.0
    created_at: datetime = None
    last_used_at: datetime = None

    @property
    def success_rate(self) -> float:
        total = self.success_count + self.failure_count
        return self.success_count / total if total > 0 else 0.0
```

#### 3.4.2 Pattern Database Schema

```sql
-- Generated tool patterns for learning
CREATE TABLE generated_tool_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_id TEXT UNIQUE NOT NULL,
    intent_signature TEXT NOT NULL,
    intent_embedding vector(384),  -- For similarity search
    template_used TEXT NOT NULL,
    generated_code TEXT NOT NULL,
    function_definition JSONB NOT NULL,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    avg_execution_time_ms FLOAT DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true
);

-- Index for similarity search using pgvector
CREATE INDEX idx_pattern_embedding ON generated_tool_patterns
    USING ivfflat (intent_embedding vector_cosine_ops);

-- Tool generation audit log
CREATE TABLE tool_generation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    intent TEXT NOT NULL,
    pattern_id UUID REFERENCES generated_tool_patterns(id),
    was_cached BOOLEAN DEFAULT false,
    generation_time_ms FLOAT,
    execution_time_ms FLOAT,
    success BOOLEAN,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.5 Safety and Security Controls

#### 3.5.1 Multi-Layer Security Architecture

```
+------------------------------------------------------------------+
|                    SECURITY LAYERS                                |
+------------------------------------------------------------------+
|                                                                    |
|  Layer 1: INPUT VALIDATION                                        |
|  - Intent sanitization (remove injection attempts)                |
|  - Parameter validation (type, range, format)                     |
|  - Rate limiting per user (max 10 generations/hour)               |
|                                                                    |
|  Layer 2: CODE GENERATION CONSTRAINTS                             |
|  - System prompt with explicit security rules                     |
|  - Import whitelist enforcement                                   |
|  - Forbidden pattern detection                                    |
|                                                                    |
|  Layer 3: STATIC ANALYSIS                                         |
|  - AST parsing and validation                                     |
|  - Control flow analysis                                          |
|  - Data flow tracking                                             |
|                                                                    |
|  Layer 4: RUNTIME SANDBOXING                                      |
|  - RestrictedPython execution                                     |
|  - Memory limits (100MB)                                          |
|  - Execution timeout (30s)                                        |
|  - Network access control                                         |
|                                                                    |
|  Layer 5: OUTPUT VALIDATION                                       |
|  - Response size limits                                           |
|  - PII detection and redaction                                    |
|  - API key/secret detection                                       |
|                                                                    |
|  Layer 6: AUDIT AND MONITORING                                    |
|  - All generations logged                                         |
|  - Anomaly detection                                              |
|  - Admin review queue for suspicious patterns                     |
+------------------------------------------------------------------+
```

#### 3.5.2 Network Access Control

```python
class NetworkAccessController:
    """Controls which external APIs generated tools can access"""

    # Approved external APIs
    ALLOWED_APIS = {
        "api.open-meteo.com": {"methods": ["GET"], "rate_limit": 100},
        "api.mapbox.com": {"methods": ["GET"], "rate_limit": 50},
        "api.recreation.gov": {"methods": ["GET"], "rate_limit": 30},
        "api.rvparky.com": {"methods": ["GET"], "rate_limit": 30},
        "api.gasbuddy.com": {"methods": ["GET"], "rate_limit": 20},
        "api.exchangerate-api.com": {"methods": ["GET"], "rate_limit": 10},
    }

    # Blocked patterns (even if domain is allowed)
    BLOCKED_PATHS = [
        "/admin", "/internal", "/debug", "/.env", "/config",
    ]
```

#### 3.5.3 Code Injection Prevention

```python
class InjectionPreventer:
    """Prevents code injection in generated tools"""

    INJECTION_PATTERNS = [
        r"__.*__",           # Dunder methods
        r"eval\s*\(",        # eval() calls
        r"exec\s*\(",        # exec() calls
        r"compile\s*\(",     # compile() calls
        r"globals\s*\(",     # globals() access
        r"import\s+os",      # os module
        r"import\s+subprocess",  # subprocess module
        r"open\s*\(",        # file operations
        r"pickle\.",         # pickle (unsafe deserialization)
    ]

    def scan_code(self, code: str) -> Tuple[bool, List[str]]:
        """Scan code for injection patterns"""
        # Returns (is_safe, list_of_violations)
        pass

    def sanitize_intent(self, intent: str) -> str:
        """Sanitize user intent to prevent prompt injection"""
        pass
```

### 3.6 Integration with PAM Architecture

#### 3.6.1 Modified PersonalizedPamAgent

The existing `PersonalizedPamAgent` will be enhanced to:

1. Check if existing tools can handle the request
2. Use Claude to determine if new tool generation is needed
3. Generate or find cached tool if needed
4. Temporarily register generated tool
5. Execute with full tool set including generated tools

```python
class PersonalizedPamAgent:
    """Enhanced PAM agent with dynamic tool generation"""

    async def process_message(
        self,
        user_id: str,
        message: str,
        context: Dict[str, Any]
    ) -> str:
        # Step 1: Check existing tools
        available_tools = self.tool_registry.get_openai_functions()

        # Step 2: Capability check via LLM
        capability_check = await self._check_tool_capability(message, available_tools)

        if capability_check["needs_new_tool"]:
            # Step 3: Generate or find cached tool
            generated_tool = await self._generate_or_find_tool(
                message,
                capability_check["intent_analysis"],
                context
            )

            if generated_tool:
                # Step 4: Register temporarily
                self.tool_registry.register_tool(
                    tool=generated_tool["tool"],
                    function_definition=generated_tool["function_definition"],
                    capability=ToolCapability.GENERATED,
                    priority=10
                )

        # Step 5: Process with all tools
        return await self._process_with_tools(user_id, message, context, available_tools)
```

---

## 4. Performance Specifications

### 4.1 Latency Requirements

| Operation | Target | Maximum |
|-----------|--------|---------|
| Pattern cache lookup | 10ms | 50ms |
| LLM code generation | 2000ms | 5000ms |
| Code validation | 50ms | 200ms |
| Tool compilation | 100ms | 500ms |
| Sandbox execution | varies | 30000ms |
| **Total (cache hit)** | 100ms | 500ms |
| **Total (new generation)** | 3000ms | 8000ms |

### 4.2 Resource Limits

| Resource | Limit | Rationale |
|----------|-------|-----------|
| Memory per tool | 100MB | Prevent DoS |
| Execution time | 30s | User experience |
| Generated code size | 50KB | Prevent abuse |
| API calls per tool | 5 | Rate limiting |
| Concurrent generations | 10 | Server capacity |
| Generations per user/hour | 10 | Cost control |

### 4.3 Caching Strategy

```python
CACHE_CONFIGURATION = {
    "pattern_cache": {
        "backend": "redis",
        "ttl": 86400 * 30,  # 30 days
        "max_entries": 10000,
        "eviction": "lru"
    },
    "embedding_cache": {
        "backend": "redis",
        "ttl": 86400 * 7,   # 7 days
        "max_entries": 50000
    },
    "compiled_tool_cache": {
        "backend": "memory",
        "ttl": 3600,        # 1 hour
        "max_entries": 100
    }
}
```

---

## 5. Success Metrics

### 5.1 Key Performance Indicators

| Metric | Target | Measurement |
|--------|--------|-------------|
| Generation success rate | >90% | Successful generations / total attempts |
| Pattern cache hit rate | >60% | Cache hits / total requests after warmup |
| Tool execution success | >95% | Successful executions / total executions |
| User satisfaction | >4.0/5 | Post-interaction rating |
| Average generation time | <3s | P50 latency |
| Cost per generation | <$0.05 | LLM API costs |

### 5.2 Safety Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Security violations | 0 | Any occurrence |
| Sandbox escapes | 0 | Any occurrence |
| PII leakage | 0 | Any occurrence |
| Rate limit violations | <1% | >5% |
| Failed validations | <10% | >25% |

---

## 6. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-3)

**Week 1: Core Infrastructure**
- [ ] Create `DynamicToolGenerator` service class
- [ ] Implement `SafeCodeCompiler` with AST validation
- [ ] Set up `SandboxedExecutor` with RestrictedPython
- [ ] Create database schema for patterns

**Week 2: Code Generation**
- [ ] Implement template system with 4 base templates
- [ ] Create LLM integration for code generation
- [ ] Build function definition generator
- [ ] Add network access controller

**Week 3: Integration**
- [ ] Integrate with PersonalizedPamAgent
- [ ] Add pattern caching to Redis
- [ ] Implement logging and monitoring
- [ ] Create admin review interface

### Phase 2: Learning System (Weeks 4-5)

**Week 4: Pattern Learning**
- [ ] Implement PatternLearner with embeddings
- [ ] Add similarity search using pgvector
- [ ] Create success/failure tracking
- [ ] Build pattern promotion logic

**Week 5: Optimization**
- [ ] Implement pattern warm-up system
- [ ] Add A/B testing for generated vs static tools
- [ ] Create performance dashboards
- [ ] Optimize cache hit rates

### Phase 3: Production Hardening (Weeks 6-8)

**Week 6: Security Audit**
- [ ] Third-party security review
- [ ] Penetration testing on sandbox
- [ ] Injection attack testing
- [ ] Rate limiting validation

**Week 7: Performance Tuning**
- [ ] Load testing (1000 concurrent users)
- [ ] Latency optimization
- [ ] Memory profiling
- [ ] Cost optimization

**Week 8: Launch Preparation**
- [ ] Feature flags for gradual rollout
- [ ] Monitoring and alerting
- [ ] Documentation completion
- [ ] Team training

### Phase 4: Continuous Improvement (Ongoing)

- Monitor generation success rates
- Analyze failed generation patterns
- Expand template library
- Refine safety constraints
- Optimize LLM prompts

---

## 7. Risk Assessment

### 7.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Sandbox escape | Low | Critical | Multiple security layers, regular audits |
| LLM hallucinations | Medium | High | Strict validation, testing before execution |
| Performance degradation | Medium | Medium | Caching, rate limiting, monitoring |
| Cost overrun | Medium | Medium | Usage caps, cost monitoring, fallback to cached |

### 7.2 Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Low adoption | Low | Medium | Gradual rollout, user feedback |
| User confusion | Medium | Low | Clear communication, fallback behavior |
| Support burden | Medium | Medium | Good logging, admin tools |

---

## 8. Example Generated Tool

```python
# Generated for: "Track my propane tank levels"

class PropaneTankTrackerTool(BaseTool):
    """Tool for tracking RV propane tank levels and estimating refill needs"""

    def __init__(self):
        super().__init__(
            tool_name="propane_tank_tracker",
            description="Track propane tank levels, log usage, and estimate refill dates"
        )

    async def execute(self, user_id: str, params: Dict[str, Any]) -> ToolResult:
        action = params.get("action", "status")

        try:
            if action == "log_level":
                level_percent = params.get("level_percent")
                tank_number = params.get("tank_number", 1)

                if not 0 <= level_percent <= 100:
                    return self._create_error_result("Level must be 0-100%")

                # Store in database with RLS compliance
                from app.core.database import get_supabase_client
                supabase = get_supabase_client()

                result = supabase.table("propane_logs").insert({
                    "user_id": user_id,
                    "tank_number": tank_number,
                    "level_percent": level_percent,
                    "logged_at": datetime.utcnow().isoformat()
                }).execute()

                return self._create_success_result({
                    "logged": True,
                    "tank_number": tank_number,
                    "level_percent": level_percent,
                    "message": f"Tank {tank_number} logged at {level_percent}%"
                })

            elif action == "status":
                # Get latest readings with user isolation
                from app.core.database import get_supabase_client
                supabase = get_supabase_client()

                result = supabase.table("propane_logs") \
                    .select("*") \
                    .eq("user_id", user_id) \
                    .order("logged_at", desc=True) \
                    .limit(10) \
                    .execute()

                return self._create_success_result({
                    "readings": result.data,
                    "latest": result.data[0] if result.data else None
                })

            elif action == "estimate_refill":
                # Calculate usage rate and estimate refill date
                # Implementation with proper error handling
                pass

            return self._create_error_result(f"Unknown action: {action}")

        except Exception as e:
            return self._create_error_result(f"Propane tracking error: {str(e)}")
```

---

## 9. Approved API Domains

| Domain | Purpose | Rate Limit |
|--------|---------|------------|
| api.open-meteo.com | Weather data | 100/hour |
| api.mapbox.com | Mapping, geocoding | 50/hour |
| api.recreation.gov | Federal campground data | 30/hour |
| api.gasbuddy.com | Fuel prices | 20/hour |
| api.rvparky.com | RV park data | 30/hour |
| api.exchangerate-api.com | Currency conversion | 10/hour |

---

## 10. Function Definition Schema Example

```json
{
  "name": "propane_tank_tracker",
  "description": "Track propane tank levels, log usage, and estimate refill dates for RV living",
  "parameters": {
    "type": "object",
    "properties": {
      "action": {
        "type": "string",
        "enum": ["log_level", "status", "estimate_refill"],
        "description": "Action to perform"
      },
      "level_percent": {
        "type": "number",
        "minimum": 0,
        "maximum": 100,
        "description": "Current propane level as percentage (for log_level action)"
      },
      "tank_number": {
        "type": "integer",
        "default": 1,
        "description": "Tank number for multi-tank setups"
      }
    },
    "required": ["action"]
  }
}
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-01 | AI Engineering Team | Initial PRD |

---

**Approval Signatures**

- [ ] Engineering Lead
- [ ] Security Team
- [ ] Product Owner
- [ ] Operations Lead
