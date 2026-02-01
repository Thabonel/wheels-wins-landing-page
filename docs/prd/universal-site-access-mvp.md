# Universal Site Access - MVP PRD

**Version:** 4.0 (Final)
**Created:** February 1, 2026
**Status:** Ready for Implementation

---

## Problem Statement

PAM requires a dedicated tool for every site feature. Users can't do simple tasks like "add this item to my equipment checklist" without engineering building a specific tool.

**Triggering Request:**
> "Can you add Blink Sync Module 2 to my equipment list in transition checklist?"

PAM couldn't do it - no tool exists for that action.

## Solution

One universal capability: interact with any visible element on any page using numeric references.

**Core Concept:**
1. Index visible interactive elements with numbers: `[1] Search`, `[2] Add to Cart`
2. PAM references by number: "click 2" or "type 'tent' in 1"
3. Store stable selectors for element recovery after DOM changes

---

## MVP Scope (5 Weeks)

### What We Build

| Feature | Week |
|---------|------|
| Browser session + stable element indexing | 1 |
| PAM tool integration + basic actions | 2 |
| Error handling + auto re-index on failure | 3 |
| Destructive action confirmation + screenshots | 4 |
| Testing + bug fixes | 5 |

### What We DON'T Build

- AI-generated code or tools
- Credential management beyond existing site logins
- Automatic pattern learning
- Multi-step workflow automation
- Payment/checkout automation

---

## Technical Design

### 1. Stable Element References

Elements are indexed with recovery mechanisms for DOM changes.

```python
# backend/app/services/usa/element_ref.py

from dataclasses import dataclass
from typing import Optional, Dict
from playwright.async_api import Page, ElementHandle

class ElementNotFoundError(Exception):
    pass

@dataclass
class ElementRef:
    """
    Stable element reference that survives DOM changes.
    Primary: data-usa-index attribute
    Fallback: text signature + tag matching
    """
    index: int
    tag: str
    text_signature: str
    stable_selector: Optional[str]
    bounding_box: Optional[Dict]

    async def resolve(self, page: Page, session: 'BrowserSession') -> ElementHandle:
        """Resolve element with 3-tier fallback, auto re-index on total failure"""

        # Tier 1: Injected attribute
        try:
            el = await page.locator(f'[data-usa-index="{self.index}"]').first
            if el and await el.is_visible():
                return el
        except Exception:
            pass

        # Tier 2: Stable selector (id, data-testid)
        if self.stable_selector:
            try:
                el = await page.locator(self.stable_selector).first
                if el and await el.is_visible():
                    return el
            except Exception:
                pass

        # Tier 3: Text + tag matching
        try:
            el = await page.locator(
                f'{self.tag}:has-text("{self.text_signature[:30]}")'
            ).first
            if el and await el.is_visible():
                return el
        except Exception:
            pass

        # All fallbacks failed - attempt auto re-index
        from .element_indexer import index_page
        new_elements = await index_page(page)
        session.elements = {e.index: e for e in new_elements}

        # Try one more time with fresh index
        new_ref = session.elements.get(self.index)
        if new_ref and new_ref.text_signature == self.text_signature:
            try:
                el = await page.locator(f'[data-usa-index="{self.index}"]').first
                if el and await el.is_visible():
                    return el
            except Exception:
                pass

        raise ElementNotFoundError(
            f"Element {self.index} ('{self.text_signature}') no longer exists. "
            "The page may have changed - try index_page again."
        )
```

### 2. Element Indexing with Visible-Only Filter

```python
# backend/app/services/usa/element_indexer.py

from typing import List, Optional
from playwright.async_api import Page, ElementHandle

INTERACTIVE_SELECTOR = (
    'a, button, input, select, textarea, '
    '[onclick], [role="button"], [role="link"], [tabindex="0"]'
)

PRIORITY_KEYWORDS = {
    'high': ['add', 'save', 'submit', 'create', 'confirm', 'search'],
    'medium': ['edit', 'update', 'change', 'select', 'choose'],
    'low': ['cancel', 'close', 'back', 'menu', 'more'],
}


async def index_page(page: Page, max_elements: int = 30) -> List[ElementRef]:
    """
    Index visible, interactive elements only.
    Handles main page and iframes.
    """
    all_elements = []

    # Index main page
    main_elements = await page.query_selector_all(INTERACTIVE_SELECTOR)
    all_elements.extend(main_elements)

    # Index iframes (for embedded content)
    for frame in page.frames:
        if frame != page.main_frame:
            try:
                frame_elements = await frame.query_selector_all(INTERACTIVE_SELECTOR)
                all_elements.extend(frame_elements)
            except Exception:
                pass  # Skip inaccessible frames

    # Filter to visible only
    visible_elements = []
    for el in all_elements:
        try:
            if not await el.is_visible():
                continue
            if not await el.is_enabled():
                continue
            bbox = await el.bounding_box()
            if not bbox or bbox['width'] < 10 or bbox['height'] < 10:
                continue
            visible_elements.append(el)
        except Exception:
            continue

    # Sort by priority
    prioritized = await _prioritize_elements(visible_elements)

    # Assign indices and inject markers
    indexed = []
    for i, el in enumerate(prioritized[:max_elements], 1):
        ref = await _create_element_ref(el, i)
        indexed.append(ref)

        # Inject data attribute
        try:
            await el.evaluate(f'e => e.setAttribute("data-usa-index", "{i}")')
            await _inject_label(page, el, i)
        except Exception:
            pass  # Element may have disappeared

    return indexed


async def _prioritize_elements(elements: List[ElementHandle]) -> List[ElementHandle]:
    """Sort elements: inputs first, then by keyword priority"""
    scored = []
    for el in elements:
        try:
            tag = (await el.evaluate("e => e.tagName")).lower()
            text = (await el.text_content() or "").lower()

            score = 0
            if tag in ('input', 'textarea', 'select'):
                score += 100
            elif tag == 'button':
                score += 50

            for kw in PRIORITY_KEYWORDS['high']:
                if kw in text:
                    score += 30
            for kw in PRIORITY_KEYWORDS['medium']:
                if kw in text:
                    score += 15

            scored.append((score, el))
        except Exception:
            scored.append((0, el))

    scored.sort(key=lambda x: -x[0])
    return [el for _, el in scored]


async def _create_element_ref(el: ElementHandle, index: int) -> ElementRef:
    """Create stable reference for element"""
    tag = (await el.evaluate("e => e.tagName")).lower()
    text = (await el.text_content() or "")[:50].strip()
    bbox = await el.bounding_box()

    # Try to find stable selector
    stable = None
    try:
        el_id = await el.get_attribute("id")
        if el_id:
            stable = f"#{el_id}"
        else:
            test_id = await el.get_attribute("data-testid")
            if test_id:
                stable = f'[data-testid="{test_id}"]'
    except Exception:
        pass

    return ElementRef(
        index=index,
        tag=tag,
        text_signature=text,
        stable_selector=stable,
        bounding_box=bbox
    )


async def _inject_label(page: Page, el: ElementHandle, index: int):
    """
    Inject visual label using Shadow DOM (CSP-safe).
    Uses safe DOM methods, handles scrollable containers.
    """
    await page.evaluate('''
        (args) => {
            const [index] = args;
            const el = document.querySelector(`[data-usa-index="${index}"]`);
            if (!el) return;

            // Remove existing label if any
            const existing = document.querySelector(`.usa-label-${index}`);
            if (existing) existing.remove();

            // Create shadow host
            const host = document.createElement('span');
            host.className = `usa-label-host usa-label-${index}`;
            host.style.position = 'absolute';
            host.style.zIndex = '99999';
            host.style.pointerEvents = 'none';

            const shadow = host.attachShadow({mode: 'closed'});

            // Create style safely
            const style = document.createElement('style');
            style.textContent = `.label {
                background: #ffeb3b;
                color: #000;
                font-size: 10px;
                font-family: monospace;
                padding: 1px 4px;
                border-radius: 2px;
                font-weight: bold;
                white-space: nowrap;
            }`;
            shadow.appendChild(style);

            // Create label safely
            const label = document.createElement('span');
            label.className = 'label';
            label.textContent = '[' + index + ']';
            shadow.appendChild(label);

            // Position accounting for scroll
            const rect = el.getBoundingClientRect();
            const scrollX = window.scrollX || window.pageXOffset || 0;
            const scrollY = window.scrollY || window.pageYOffset || 0;
            host.style.top = (rect.top + scrollY - 14) + 'px';
            host.style.left = (rect.left + scrollX) + 'px';

            document.body.appendChild(host);
        }
    ''', [index])
```

### 3. Rate Limiting

```python
# backend/app/services/usa/rate_limiter.py

from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, List

class RateLimitError(Exception):
    def __init__(self, retry_after: int):
        self.retry_after = retry_after
        super().__init__(f"Rate limited. Retry after {retry_after} seconds.")

class RateLimiter:
    """Simple in-memory rate limiter: 60 actions per minute per user"""

    def __init__(self, max_actions: int = 60, window_seconds: int = 60):
        self.max_actions = max_actions
        self.window = timedelta(seconds=window_seconds)
        self.user_actions: Dict[str, List[datetime]] = defaultdict(list)

    def check(self, user_id: str) -> None:
        """Raises RateLimitError if limit exceeded"""
        now = datetime.utcnow()
        cutoff = now - self.window

        # Clean old entries
        recent = [t for t in self.user_actions[user_id] if t > cutoff]
        self.user_actions[user_id] = recent

        if len(recent) >= self.max_actions:
            oldest = min(recent)
            retry_after = int((oldest + self.window - now).total_seconds()) + 1
            raise RateLimitError(retry_after)

        # Record this action
        self.user_actions[user_id].append(now)

rate_limiter = RateLimiter()
```

### 4. PAM Tool Implementation

```python
# backend/app/services/pam/tools/universal_action.py

import time
from typing import Dict, Optional
from fastapi import HTTPException

from ..usa.session_manager import session_manager, BrowserSession
from ..usa.element_indexer import index_page
from ..usa.rate_limiter import rate_limiter, RateLimitError

UNIVERSAL_ACTION_SCHEMA = {
    "name": "universal_action",
    "description": """
    Interact with any element on the current page.

    Workflow:
    1. navigate to URL
    2. index_page to see available elements
    3. click/type/get_text using element numbers

    Always index_page first to see what's available.
    Use 'pause' to let user take over manually.
    """,
    "parameters": {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": [
                    "navigate",
                    "index_page",
                    "click",
                    "type",
                    "get_text",
                    "scroll",
                    "screenshot",
                    "pause",
                    "resume"
                ],
                "description": "Action to perform"
            },
            "element_index": {
                "type": "integer",
                "description": "Element number from index_page (for click, type, get_text)"
            },
            "text": {
                "type": "string",
                "description": "Text to type (for type action)"
            },
            "url": {
                "type": "string",
                "description": "URL to navigate to (for navigate action)"
            }
        },
        "required": ["action"]
    }
}

DESTRUCTIVE_KEYWORDS = [
    'delete', 'remove', 'cancel', 'unsubscribe',
    'pay', 'purchase', 'buy', 'checkout', 'submit order',
    'close account', 'deactivate'
]

BLOCKED_DOMAINS = [
    'stripe.com', 'paypal.com', 'square.com',
    'chase.com', 'wellsfargo.com', 'bankofamerica.com',
    'login.gov', 'irs.gov',
]


async def execute_universal_action(
    user_id: str,
    action: str,
    element_index: Optional[int] = None,
    text: Optional[str] = None,
    url: Optional[str] = None
) -> Dict:
    """Execute universal action with safety checks and rate limiting"""

    # Rate limit check
    try:
        rate_limiter.check(user_id)
    except RateLimitError as e:
        return {
            "status": "rate_limited",
            "message": f"Too many actions. Wait {e.retry_after} seconds.",
            "retry_after": e.retry_after
        }

    # Domain blocklist check
    if action == "navigate" and url:
        if any(blocked in url.lower() for blocked in BLOCKED_DOMAINS):
            return {
                "status": "blocked",
                "message": "Navigation to payment/banking sites is not allowed for safety."
            }

    session = await session_manager.get_or_create(user_id)

    # Check if paused
    if session.paused and action not in ("resume", "screenshot"):
        return {
            "status": "paused",
            "message": "Session is paused. User is in manual control. Use 'resume' to continue."
        }

    try:
        match action:
            case "navigate":
                await session.page.goto(url, wait_until="domcontentloaded", timeout=30000)
                screenshot_url = await _take_screenshot(session, user_id)
                return {
                    "status": "navigated",
                    "url": url,
                    "screenshot": screenshot_url
                }

            case "index_page":
                elements = await index_page(session.page)
                session.elements = {e.index: e for e in elements}
                screenshot_url = await _take_screenshot(session, user_id)
                return {
                    "status": "indexed",
                    "element_count": len(elements),
                    "elements": [
                        {"index": e.index, "tag": e.tag, "text": e.text_signature}
                        for e in elements
                    ],
                    "screenshot": screenshot_url
                }

            case "click":
                if not element_index:
                    return {"status": "error", "message": "element_index required for click"}

                ref = session.elements.get(element_index)
                if not ref:
                    return {
                        "status": "error",
                        "message": f"Element {element_index} not found. Run index_page first."
                    }

                # Destructive action check
                if _is_destructive(ref.text_signature):
                    return {
                        "status": "confirmation_required",
                        "message": f"This will click '{ref.text_signature}' which appears destructive. Ask user to confirm.",
                        "element": element_index,
                        "element_text": ref.text_signature
                    }

                el = await ref.resolve(session.page, session)
                await el.click()
                await session.page.wait_for_load_state("domcontentloaded", timeout=10000)
                screenshot_url = await _take_screenshot(session, user_id)
                return {
                    "status": "clicked",
                    "element": element_index,
                    "screenshot": screenshot_url
                }

            case "type":
                if not element_index:
                    return {"status": "error", "message": "element_index required for type"}
                if not text:
                    return {"status": "error", "message": "text required for type"}

                ref = session.elements.get(element_index)
                if not ref:
                    return {"status": "error", "message": f"Element {element_index} not found"}

                el = await ref.resolve(session.page, session)
                await el.fill(text)
                screenshot_url = await _take_screenshot(session, user_id)
                return {
                    "status": "typed",
                    "element": element_index,
                    "text": text,
                    "screenshot": screenshot_url
                }

            case "get_text":
                if not element_index:
                    return {"status": "error", "message": "element_index required"}

                ref = session.elements.get(element_index)
                if not ref:
                    return {"status": "error", "message": f"Element {element_index} not found"}

                el = await ref.resolve(session.page, session)
                content = await el.text_content()
                content = ' '.join(content.split()) if content else ""
                return {
                    "status": "extracted",
                    "element": element_index,
                    "text": content[:500]
                }

            case "screenshot":
                screenshot_url = await _take_screenshot(session, user_id)
                return {"status": "screenshot", "url": screenshot_url}

            case "scroll":
                await session.page.evaluate("window.scrollBy(0, 500)")
                screenshot_url = await _take_screenshot(session, user_id)
                return {"status": "scrolled", "screenshot": screenshot_url}

            case "pause":
                session.paused = True
                return {
                    "status": "paused",
                    "message": "Session paused. User can now interact manually. Use 'resume' when ready."
                }

            case "resume":
                session.paused = False
                # Re-index after manual interaction
                elements = await index_page(session.page)
                session.elements = {e.index: e for e in elements}
                screenshot_url = await _take_screenshot(session, user_id)
                return {
                    "status": "resumed",
                    "message": "Session resumed. Page has been re-indexed.",
                    "element_count": len(elements),
                    "screenshot": screenshot_url
                }

            case _:
                return {"status": "error", "message": f"Unknown action: {action}"}

    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "action": action
        }


def _is_destructive(text: str) -> bool:
    """Check if element text suggests destructive action"""
    text_lower = text.lower()
    return any(kw in text_lower for kw in DESTRUCTIVE_KEYWORDS)


async def _take_screenshot(session: BrowserSession, user_id: str) -> str:
    """Take screenshot and return authorized URL"""
    timestamp = int(time.time())
    # Include user_id in filename for authorization check
    filename = f"usa_{user_id}_{timestamp}.png"
    path = f"/tmp/{filename}"
    await session.page.screenshot(path=path, full_page=False)
    return f"/api/v1/usa/screenshots/{filename}"
```

### 5. Screenshot Endpoint with Authorization

```python
# backend/app/api/v1/usa.py

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
import os

from app.auth.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/v1/usa", tags=["usa"])


@router.get("/screenshots/{filename}")
async def get_screenshot(
    filename: str,
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve screenshot with user authorization.
    Only the user who created the screenshot can access it.
    """
    # Validate filename format and ownership
    if not filename.startswith(f"usa_{current_user.id}_"):
        raise HTTPException(403, "Access denied")

    path = f"/tmp/{filename}"
    if not os.path.exists(path):
        raise HTTPException(404, "Screenshot not found or expired")

    return FileResponse(path, media_type="image/png")


@router.delete("/session")
async def close_session(current_user: User = Depends(get_current_user)):
    """Close user's browser session"""
    from app.services.usa.session_manager import session_manager
    await session_manager.close_session(str(current_user.id))
    return {"status": "closed"}
```

### 6. Browser Session Manager

```python
# backend/app/services/usa/session_manager.py

from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Optional
from playwright.async_api import async_playwright, Browser, BrowserContext, Page

from .element_ref import ElementRef


@dataclass
class BrowserSession:
    user_id: str
    context: BrowserContext
    page: Page
    elements: Dict[int, ElementRef] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)
    last_activity: datetime = field(default_factory=datetime.utcnow)
    paused: bool = False

    def touch(self):
        self.last_activity = datetime.utcnow()


class BrowserSessionManager:
    """
    Manages Playwright browser sessions.

    Constraints:
    - Max 20 concurrent sessions (Render 16GB plan)
    - 10 minute timeout per session
    - One session per user
    """

    def __init__(self):
        self.sessions: Dict[str, BrowserSession] = {}
        self.max_sessions = 20
        self.timeout_seconds = 600
        self.playwright = None
        self.browser: Optional[Browser] = None

    async def initialize(self):
        """Start Playwright browser - call on app startup"""
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(
            headless=True,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-dev-shm-usage',
            ]
        )

    async def shutdown(self):
        """Clean shutdown - call on app shutdown"""
        for user_id in list(self.sessions.keys()):
            await self.close_session(user_id)
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()

    async def get_or_create(self, user_id: str) -> BrowserSession:
        """Get existing session or create new one"""
        await self._cleanup_expired()

        if user_id in self.sessions:
            session = self.sessions[user_id]
            session.touch()
            return session

        if len(self.sessions) >= self.max_sessions:
            await self._evict_oldest()

        context = await self.browser.new_context(
            viewport={'width': 1280, 'height': 720},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        page = await context.new_page()

        session = BrowserSession(
            user_id=user_id,
            context=context,
            page=page
        )
        self.sessions[user_id] = session
        return session

    async def close_session(self, user_id: str):
        """Close and cleanup session"""
        if user_id in self.sessions:
            session = self.sessions[user_id]
            try:
                await session.context.close()
            except Exception:
                pass
            del self.sessions[user_id]

    async def _cleanup_expired(self):
        """Remove sessions that have timed out"""
        now = datetime.utcnow()
        expired = [
            uid for uid, s in self.sessions.items()
            if (now - s.last_activity).total_seconds() > self.timeout_seconds
        ]
        for uid in expired:
            await self.close_session(uid)

    async def _evict_oldest(self):
        """Evict oldest session when at capacity"""
        if not self.sessions:
            return
        oldest_uid = min(
            self.sessions.keys(),
            key=lambda uid: self.sessions[uid].last_activity
        )
        await self.close_session(oldest_uid)


# Singleton instance
session_manager = BrowserSessionManager()
```

---

## Database Schema

```sql
-- Minimal session tracking for analytics
CREATE TABLE usa_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    current_url TEXT,
    actions_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active'
);

CREATE INDEX idx_usa_sessions_user ON usa_sessions(user_id);
CREATE INDEX idx_usa_sessions_activity ON usa_sessions(last_activity);

-- Enable RLS
ALTER TABLE usa_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
    ON usa_sessions FOR SELECT
    USING (user_id = auth.uid());
```

---

## Conversation Flow Example

```
User: "Can you add Blink Sync Module 2 to my equipment checklist?"

PAM: [navigate to wheelsandwins.com/transition/checklist]
     -> {status: "navigated", screenshot: "..."}

PAM: [index_page]
     -> {element_count: 28, elements: [
          {index: 1, tag: "input", text: "Search items..."},
          {index: 2, tag: "input", text: "Add new item"},
          {index: 3, tag: "button", text: "Add"},
          ...
        ]}

PAM: [type, element_index: 2, text: "Blink Sync Module 2"]
     -> {status: "typed", screenshot: "..."}

PAM: [click, element_index: 3]
     -> {status: "clicked", screenshot: "..."}

PAM: "Done! I've added 'Blink Sync Module 2' to your equipment checklist."
     [Shows screenshot as evidence]
```

**Manual Takeover Flow:**
```
User: "Wait, I need to do something first"

PAM: [pause]
     -> {status: "paused", message: "User can interact manually"}

User: [Does manual actions in their browser]

User: "Ok continue"

PAM: [resume]
     -> {status: "resumed", element_count: 25, message: "Re-indexed"}
```

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/usa/action` | POST | Execute universal action |
| `/api/v1/usa/session` | DELETE | Close browser session |
| `/api/v1/usa/screenshots/{id}` | GET | Retrieve screenshot (authorized) |

---

## Constraints

| Constraint | Value | Reason |
|------------|-------|--------|
| Max concurrent sessions | 20 | Render 16GB RAM |
| Session timeout | 10 min | Free resources |
| Max indexed elements | 30 | LLM context limits |
| Screenshot retention | 1 hour | Storage limits |
| Rate limit | 60 actions/min | Abuse prevention |

---

## Infrastructure Requirements

**Render Plan:** 16GB RAM ($85/month)
- 20 sessions x 512MB = 10GB
- Playwright/Chromium: ~2GB
- Backend + Redis: ~2GB
- Headroom: ~2GB

---

## Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Task completion | 80% | 20 manual test tasks |
| Session creation | <3s | Automated |
| Action execution | <2s | Automated |
| Element stability | 95% | Elements resolve after scroll |

---

## Timeline

| Week | Deliverable | Verification |
|------|-------------|--------------|
| 1 | Browser session + element indexing | Index wheelsandwins.com, survive scroll |
| 2 | PAM tool + basic actions | PAM can navigate, click, type |
| 3 | Error handling + auto re-index | Graceful failures, SPA edge cases |
| 4 | Confirmations + screenshots + auth | Destructive blocked, evidence trail |
| 5 | Testing + bug fixes | 80% task completion |

---

## Configuration

```python
USA_CONFIG = {
    "visual_labels": True,
    "screenshot_on_action": True,
    "require_destructive_confirm": True,
    "max_sessions": 20,
    "session_timeout_seconds": 600,
    "rate_limit_actions": 60,
    "rate_limit_window_seconds": 60,
}
```

---

## Future Phases (NOT MVP)

1. **Phase 2:** Turn off visual labels, use screenshot analysis
2. **Phase 3:** Pattern caching for common sites
3. **Phase 4:** Form auto-fill with saved data

Each requires separate PRD after MVP validation.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Site blocks automation | Graceful error + manual fallback |
| Element changes after index | 3-tier fallback + auto re-index |
| CSP blocks injection | Shadow DOM isolation |
| Memory exhaustion | Hard cap + oldest eviction |
| Screenshot data leak | User ID validation on access |
| SPA re-renders DOM | Auto re-index on resolve failure |
| Rate limiting | 60/min with clear retry_after |

---

*Version 4.0 Final - Ready for Implementation*
