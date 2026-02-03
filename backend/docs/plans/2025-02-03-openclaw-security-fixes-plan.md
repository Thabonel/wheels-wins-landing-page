# OpenClaw Security & Quality Fixes Plan

**Date**: February 3, 2025
**Status**: Ready for Implementation
**Modules Affected**: extraction, dynamic_tools, usa, pam/tools

---

## Executive Summary

Code review agents identified **38+ issues** across the OpenClaw implementation. This plan prioritizes fixes by severity and groups them into logical implementation phases.

---

## Phase 1: Critical Security Fixes (MUST DO FIRST)

### 1.1 Dynamic Tools - Sandbox Bypass Prevention
**File**: `backend/app/services/dynamic_tools/sandbox_executor.py`
**Risk**: Critical - Arbitrary code execution possible

**Current Problem** (lines 77-115):
The sandbox allows access to `__class__.__mro__` which enables escape.

**Fix**: Add attribute blocklist to restricted builtins:
```python
BLOCKED_ATTRS = {'__class__', '__mro__', '__bases__', '__subclasses__',
                 '__globals__', '__code__', '__reduce__', '__reduce_ex__',
                 '__getattribute__', '__setattr__', '__delattr__'}

def safe_getattr(obj, name, *default):
    if name in BLOCKED_ATTRS:
        raise SecurityError(f"Access to '{name}' is blocked")
    if name.startswith('_') and not name.startswith('__') and name.endswith('__'):
        raise SecurityError(f"Access to dunder '{name}' is blocked")
    return original_getattr(obj, name, *default)
```

### 1.2 Dynamic Tools - Code Execution Hardening
**File**: `backend/app/services/dynamic_tools/sandbox_executor.py`
**Risk**: Critical - User-controlled code execution

**Fix**:
1. Pre-compile code with `compile()` and validate AST before execution
2. Use RestrictedPython library instead of raw code execution
3. Add execution time limits with signal handlers

```python
import signal
from RestrictedPython import compile_restricted, safe_globals

def execute_sandboxed(code: str, timeout: int = 30):
    # Validate with AST first
    tree = ast.parse(code)
    validator = ASTValidator()
    validator.visit(tree)

    # Compile with RestrictedPython
    byte_code = compile_restricted(code, '<sandbox>', 'exec')

    # Execute with timeout using signal.alarm
    def timeout_handler(signum, frame):
        raise TimeoutError("Execution timeout")

    signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(timeout)
    try:
        # Execute in restricted namespace (see RestrictedPython docs)
        run_code(byte_code, safe_globals.copy())
    finally:
        signal.alarm(0)
```

### 1.3 USA Module - Credential Encryption
**File**: `backend/app/services/usa/models.py`
**Risk**: Critical - Plain text passwords in memory/logs

**Current Problem** (line 86):
```python
class FormField:
    value: Optional[str] = None  # Passwords stored in plain text!
```

**Fix**:
```python
from cryptography.fernet import Fernet
from pydantic import SecretStr

class FormField(BaseModel):
    value: Optional[str] = None
    sensitive: bool = False
    _encrypted_value: Optional[bytes] = None

    def set_sensitive_value(self, value: str, key: bytes):
        """Encrypt sensitive values before storage"""
        if self.sensitive:
            f = Fernet(key)
            self._encrypted_value = f.encrypt(value.encode())
            self.value = "***ENCRYPTED***"
        else:
            self.value = value

    def get_value(self, key: bytes) -> str:
        """Decrypt sensitive values for use"""
        if self._encrypted_value:
            f = Fernet(key)
            return f.decrypt(self._encrypted_value).decode()
        return self.value or ""

    def __repr__(self):
        if self.sensitive:
            return f"FormField(name={self.name}, value=***REDACTED***)"
        return f"FormField(name={self.name}, value={self.value})"
```

### 1.4 USA Module - Credential Injection Prevention
**File**: `backend/app/services/usa/action_executor.py`
**Risk**: Critical - JavaScript injection via credentials

**Current Problem** (lines 55-60): Vulnerable to injection if credentials contain JS

**Fix**:
```python
import re

def sanitize_input(value: str) -> str:
    """Sanitize input to prevent injection attacks"""
    dangerous_patterns = [
        r'<script[^>]*>.*?</script>',
        r'javascript:',
        r'on\w+\s*=',
        r'data:text/html',
    ]
    sanitized = value
    for pattern in dangerous_patterns:
        sanitized = re.sub(pattern, '', sanitized, flags=re.IGNORECASE)
    return sanitized

async def fill_field(self, page: Page, selector: str, value: str, sensitive: bool = False):
    """Safely fill form field with sanitization"""
    sanitized = sanitize_input(value)
    await page.fill(selector, sanitized)
    if sensitive:
        logger.info(f"Filled sensitive field: {selector}")
    else:
        logger.debug(f"Filled field {selector} with value length {len(sanitized)}")
```

### 1.5 SSRF Protection - All Modules
**Files**:
- `backend/app/services/extraction/browser_engine.py`
- `backend/app/services/usa/action_executor.py`
- `backend/app/services/pam/tools/universal_browser_tool.py`

**Risk**: Critical - Server-Side Request Forgery

**Fix**: Create shared URL validator (`backend/app/core/url_validator.py`):
```python
import ipaddress
import socket
from urllib.parse import urlparse

BLOCKED_HOSTS = {'localhost', '127.0.0.1', '0.0.0.0', '::1'}
BLOCKED_NETWORKS = [
    ipaddress.ip_network('10.0.0.0/8'),
    ipaddress.ip_network('172.16.0.0/12'),
    ipaddress.ip_network('192.168.0.0/16'),
    ipaddress.ip_network('169.254.0.0/16'),
    ipaddress.ip_network('127.0.0.0/8'),
    ipaddress.ip_network('fc00::/7'),
]

class SSRFProtectionError(Exception):
    pass

def validate_url_safe(url: str) -> bool:
    """Validate URL is safe from SSRF attacks"""
    parsed = urlparse(url)

    if parsed.scheme not in ('http', 'https'):
        raise SSRFProtectionError(f"Invalid scheme: {parsed.scheme}")

    host = parsed.hostname
    if not host:
        raise SSRFProtectionError("No hostname in URL")

    if host.lower() in BLOCKED_HOSTS:
        raise SSRFProtectionError(f"Blocked host: {host}")

    try:
        ip_str = socket.gethostbyname(host)
        ip = ipaddress.ip_address(ip_str)

        for network in BLOCKED_NETWORKS:
            if ip in network:
                raise SSRFProtectionError(f"IP {ip} in blocked network {network}")
    except socket.gaierror:
        raise SSRFProtectionError(f"Cannot resolve host: {host}")

    return True
```

### 1.6 USA Module - Path Traversal Prevention
**File**: `backend/app/services/usa/pattern_store.py`
**Risk**: Critical - Arbitrary file read/write

**Fix**:
```python
import os
import re

def safe_pattern_path(self, pattern_id: str) -> str:
    """Generate safe file path for pattern storage"""
    if not re.match(r'^[a-zA-Z0-9_-]+$', pattern_id):
        raise ValueError(f"Invalid pattern_id format: {pattern_id}")

    filepath = os.path.join(self.base_dir, f"{pattern_id}.json")
    real_base = os.path.realpath(self.base_dir)
    real_path = os.path.realpath(filepath)

    if not real_path.startswith(real_base):
        raise SecurityError(f"Path traversal attempt detected: {pattern_id}")

    return filepath
```

### 1.7 USA Module - Unbounded Retry Fix
**File**: `backend/app/services/usa/workflow_engine.py`
**Risk**: Critical - Infinite loop / DoS

**Fix**:
```python
MAX_RETRIES = 3
RETRY_BACKOFF = [1, 2, 5]

async def execute_with_retry(self, step: WorkflowStep) -> StepResult:
    """Execute step with bounded retries and exponential backoff"""
    last_error = None

    for attempt in range(MAX_RETRIES):
        try:
            result = await self.execute_step(step)
            if result.success:
                return result
            last_error = result.error
        except Exception as e:
            last_error = str(e)

        if attempt < MAX_RETRIES - 1:
            backoff = RETRY_BACKOFF[min(attempt, len(RETRY_BACKOFF) - 1)]
            logger.warning(f"Step {step.name} failed, retrying in {backoff}s: {last_error}")
            await asyncio.sleep(backoff)

    return StepResult(
        success=False,
        error=f"Failed after {MAX_RETRIES} attempts: {last_error}"
    )
```

---

## Phase 2: Critical Functionality Fixes

### 2.1 Add Missing Dependencies
**File**: `backend/requirements.txt`

**Add**:
```
# Browser automation
playwright>=1.40.0
playwright-stealth>=1.0.6

# HTML parsing
beautifulsoup4>=4.12.0
lxml>=5.0.0

# Security
cryptography>=41.0.0
RestrictedPython>=6.0

# Already present but verify versions
anthropic>=0.18.0
redis>=5.0.0
```

**Post-install**: Run `playwright install chromium`

### 2.2 Browser Instance Pooling
**File**: `backend/app/services/extraction/browser_engine.py`
**Risk**: Critical - Performance disaster (new browser per request)

**Fix**: Create browser pool (`backend/app/services/extraction/browser_pool.py`):
```python
import asyncio
from contextlib import asynccontextmanager

class BrowserPool:
    """Pool of reusable browser instances"""

    def __init__(self, max_browsers: int = 5):
        self.max_browsers = max_browsers
        self._pool: asyncio.Queue = asyncio.Queue(maxsize=max_browsers)
        self._created = 0
        self._lock = asyncio.Lock()
        self._playwright = None

    async def initialize(self):
        from playwright.async_api import async_playwright
        self._playwright = await async_playwright().start()

    @asynccontextmanager
    async def acquire(self):
        """Acquire a browser from the pool"""
        browser = None
        try:
            browser = self._pool.get_nowait()
        except asyncio.QueueEmpty:
            async with self._lock:
                if self._created < self.max_browsers:
                    browser = await self._playwright.chromium.launch(headless=True)
                    self._created += 1

        if browser is None:
            browser = await self._pool.get()

        try:
            yield browser
        finally:
            try:
                self._pool.put_nowait(browser)
            except asyncio.QueueFull:
                await browser.close()
                async with self._lock:
                    self._created -= 1

    async def close(self):
        while not self._pool.empty():
            browser = await self._pool.get()
            await browser.close()
        if self._playwright:
            await self._playwright.stop()
```

### 2.3 Silent Exception Fix
**File**: `backend/app/services/extraction/browser_engine.py`
**Risk**: Critical - Debugging impossible

**Current Problem**: `except Exception: pass`

**Fix**:
```python
except PlaywrightError as e:
    logger.error(f"Playwright error during page load: {e}", exc_info=True)
    raise BrowserError(f"Failed to load page: {e}") from e
except asyncio.TimeoutError:
    logger.error(f"Timeout loading page: {url}")
    raise BrowserError(f"Timeout loading page after {timeout}s")
except Exception as e:
    logger.error(f"Unexpected error loading {url}: {e}", exc_info=True)
    raise BrowserError(f"Unexpected browser error: {e}") from e
```

---

## Phase 3: High Priority Fixes

### 3.1 Thread-Safe Pattern Cache
**File**: `backend/app/services/extraction/pattern_cache.py`

```python
import asyncio

class PatternCache:
    def __init__(self):
        self._cache: Dict[str, Any] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[Any]:
        async with self._lock:
            return self._cache.get(key)

    async def set(self, key: str, value: Any, ttl: int = 3600):
        async with self._lock:
            self._cache[key] = {'value': value, 'expires': time.time() + ttl}
```

### 3.2 Regex Group Validation
**File**: `backend/app/services/extraction/semantic_extractor.py`

```python
match = re.search(pattern, text)
if match and match.lastindex and match.lastindex >= 1:
    value = match.group(1)
else:
    value = None
    logger.debug(f"Pattern {pattern} did not capture group in text")
```

### 3.3 DNS Rebinding Protection
**File**: `backend/app/services/dynamic_tools/network_controller.py`

```python
class DNSRebindingProtection:
    def __init__(self, cache_ttl: int = 60):
        self._cache: Dict[str, tuple] = {}
        self._ttl = cache_ttl

    def resolve_and_validate(self, host: str) -> str:
        now = time.time()
        if host in self._cache:
            ip, timestamp = self._cache[host]
            if now - timestamp < self._ttl:
                return ip
        ip = socket.gethostbyname(host)
        validate_not_internal(ip)
        self._cache[host] = (ip, now)
        return ip
```

### 3.4 Rate Limiting for Tool Generation
**File**: `backend/app/services/dynamic_tools/generator.py`

```python
class RateLimiter:
    def __init__(self, max_per_hour: int = 10, max_per_minute: int = 2):
        self.max_per_hour = max_per_hour
        self.max_per_minute = max_per_minute
        self._requests: Dict[str, List[datetime]] = defaultdict(list)

    def check_and_record(self, user_id: str) -> tuple[bool, str]:
        now = datetime.utcnow()
        hour_ago = now - timedelta(hours=1)
        minute_ago = now - timedelta(minutes=1)

        self._requests[user_id] = [t for t in self._requests[user_id] if t > hour_ago]
        recent = [t for t in self._requests[user_id] if t > minute_ago]

        if len(recent) >= self.max_per_minute:
            return False, f"Rate limit: max {self.max_per_minute} requests per minute"
        if len(self._requests[user_id]) >= self.max_per_hour:
            return False, f"Rate limit: max {self.max_per_hour} requests per hour"

        self._requests[user_id].append(now)
        return True, ""
```

### 3.5 XPath Injection Prevention
**File**: `backend/app/services/usa/data_extractor.py`

```python
def sanitize_xpath(xpath: str) -> str:
    if not re.match(r'^[a-zA-Z0-9\[\]@=\'"\/\.\-_\s\(\)]+$', xpath):
        raise ValueError(f"Invalid XPath characters detected")

    dangerous = ['document', 'evaluate', 'concat(', 'string(', 'normalize-space(']
    xpath_lower = xpath.lower()
    for func in dangerous:
        if func in xpath_lower:
            raise ValueError(f"Dangerous XPath function not allowed: {func}")
    return xpath
```

### 3.6 Screenshot Path Traversal
**File**: `backend/app/services/usa/action_executor.py`

```python
SCREENSHOT_DIR = "/app/data/screenshots"

def safe_screenshot_path(user_id: str) -> str:
    if not re.match(r'^[a-zA-Z0-9_-]+$', user_id):
        raise ValueError("Invalid user_id format")

    filename = f"{user_id}_{uuid.uuid4().hex[:8]}.png"
    filepath = os.path.join(SCREENSHOT_DIR, filename)
    real_dir = os.path.realpath(SCREENSHOT_DIR)
    real_path = os.path.realpath(filepath)

    if not real_path.startswith(real_dir):
        raise SecurityError("Path traversal attempt")
    return filepath
```

---

## Phase 4: Medium Priority Fixes

### 4.1 Schema Deduplication
Create `backend/app/services/pam/tools/schemas/extraction_schemas.py`:
```python
UNIVERSAL_EXTRACT_SCHEMA = {
    "name": "universal_extract",
    "description": "Extract structured data from any website",
    "parameters": {...}
}
```

### 4.2 Thread-Safe Singleton
**File**: `backend/app/services/pam/tools/dynamic_tool_manager.py`

```python
import threading

_manager_instance: Optional[DynamicToolManager] = None
_manager_lock = threading.Lock()

def get_dynamic_tool_manager() -> DynamicToolManager:
    global _manager_instance
    if _manager_instance is None:
        with _manager_lock:
            if _manager_instance is None:
                _manager_instance = DynamicToolManager()
    return _manager_instance
```

### 4.3 Proper Exception Handling in Hooks
**File**: `backend/app/services/pam/tools/universal_browser_tool.py`

```python
async def _execute_with_hooks(self, action: str, **kwargs):
    try:
        await self._pre_action_hook(action, kwargs)
    except Exception as e:
        logger.warning(f"Pre-action hook failed for {action}: {e}")

    result = await self._execute_action(action, **kwargs)

    try:
        await self._post_action_hook(action, result)
    except Exception as e:
        logger.warning(f"Post-action hook failed for {action}: {e}")

    return result
```

---

## Phase 5: Low Priority (AI Slop Cleanup)

- Remove verbose docstrings
- Remove unused imports
- Consolidate duplicate constants

---

## Implementation Order

```
Week 1: Critical Security (Phase 1)
- Day 1-2: Sandbox hardening (1.1, 1.2)
- Day 2-3: Credential security (1.3, 1.4)
- Day 3-4: SSRF protection (1.5)
- Day 4-5: Path traversal & retry fixes (1.6, 1.7)

Week 2: Functionality & High Priority (Phase 2-3)
- Day 1: Dependencies (2.1)
- Day 2: Browser pooling (2.2)
- Day 3: Error handling (2.3)
- Day 4: Thread safety (3.1, 3.4)
- Day 5: Input validation (3.2, 3.5, 3.6)

Week 3: Polish (Phase 4-5)
- Day 1-2: Schema deduplication (4.1)
- Day 3: Singleton fixes (4.2)
- Day 4: Hook handling (4.3)
- Day 5: Code cleanup (5.1-5.3)
```

---

## Files to Create

1. `backend/app/core/url_validator.py` - SSRF protection
2. `backend/app/core/security.py` - Credential encryption
3. `backend/app/services/extraction/browser_pool.py` - Browser pooling
4. `backend/app/services/pam/tools/schemas/` - Shared schemas

## Files to Modify

| File | Phases |
|------|--------|
| `sandbox_executor.py` | 1.1, 1.2 |
| `usa/models.py` | 1.3 |
| `usa/action_executor.py` | 1.4, 3.6 |
| `browser_engine.py` | 1.5, 2.2, 2.3 |
| `usa/pattern_store.py` | 1.6 |
| `usa/workflow_engine.py` | 1.7 |
| `requirements.txt` | 2.1 |
| `pattern_cache.py` | 3.1 |
| `semantic_extractor.py` | 3.2 |
| `network_controller.py` | 3.3 |
| `generator.py` | 3.4 |
| `usa/data_extractor.py` | 3.5 |
| `dynamic_tool_manager.py` | 4.2 |

---

## Success Criteria

- [ ] All critical security vulnerabilities patched
- [ ] No silent exception swallowing
- [ ] All dependencies in requirements.txt
- [ ] Browser pool reduces avg response time by 50%+
- [ ] Thread-safe operations verified under load
- [ ] Input validation on all user-controlled data
- [ ] Security scan passes with no high/critical findings
- [ ] Test coverage > 80% on new code
