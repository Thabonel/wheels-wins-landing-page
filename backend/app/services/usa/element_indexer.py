"""
Element Indexer for Universal Site Access

Finds and indexes interactive elements on a page with:
- Visibility filtering (only visible, enabled elements)
- Priority scoring (inputs > buttons > links)
- Shadow DOM label injection (CSP-safe)
- iframe support
"""

from typing import List, Optional, TYPE_CHECKING
import logging

from .element_ref import ElementRef

if TYPE_CHECKING:
    from playwright.async_api import Page, ElementHandle

logger = logging.getLogger(__name__)

# CSS selector for interactive elements
INTERACTIVE_SELECTOR = (
    'a, button, input, select, textarea, '
    '[onclick], [role="button"], [role="link"], [tabindex="0"]'
)

# Keywords for priority scoring
PRIORITY_KEYWORDS = {
    'high': ['add', 'save', 'submit', 'create', 'confirm', 'search', 'next', 'continue'],
    'medium': ['edit', 'update', 'change', 'select', 'choose', 'open', 'view'],
    'low': ['cancel', 'close', 'back', 'menu', 'more', 'skip'],
}


async def index_page(page: 'Page', max_elements: int = 30) -> List[ElementRef]:
    """
    Index visible, interactive elements on the page.

    Handles main page and iframes. Prioritizes form inputs and action buttons.

    Args:
        page: Playwright page instance
        max_elements: Maximum elements to index (default 30 for LLM context)

    Returns:
        List of ElementRef objects for indexed elements
    """
    logger.info("Starting page indexing")

    # Clear any existing labels
    await _clear_existing_labels(page)

    all_elements: List['ElementHandle'] = []

    # Index main page
    try:
        main_elements = await page.query_selector_all(INTERACTIVE_SELECTOR)
        all_elements.extend(main_elements)
        logger.debug(f"Found {len(main_elements)} elements in main page")
    except Exception as e:
        logger.error(f"Error indexing main page: {e}")

    # Index iframes (for embedded content)
    for frame in page.frames:
        if frame != page.main_frame:
            try:
                frame_elements = await frame.query_selector_all(INTERACTIVE_SELECTOR)
                all_elements.extend(frame_elements)
                logger.debug(f"Found {len(frame_elements)} elements in iframe")
            except Exception:
                pass  # Skip inaccessible frames

    # Filter to visible only
    visible_elements = []
    for el in all_elements:
        try:
            is_visible = await el.is_visible()
            if not is_visible:
                continue

            is_enabled = await el.is_enabled()
            if not is_enabled:
                continue

            bbox = await el.bounding_box()
            if not bbox or bbox['width'] < 10 or bbox['height'] < 10:
                continue

            visible_elements.append(el)
        except Exception:
            continue

    logger.debug(f"Filtered to {len(visible_elements)} visible elements")

    # Sort by priority
    prioritized = await _prioritize_elements(visible_elements)

    # Assign indices and inject markers
    indexed: List[ElementRef] = []
    for i, el in enumerate(prioritized[:max_elements], 1):
        try:
            ref = await _create_element_ref(el, i)
            indexed.append(ref)

            # Inject data attribute for stable reference
            await el.evaluate(f'e => e.setAttribute("data-usa-index", "{i}")')

            # Inject visual label
            await _inject_label(page, i)
        except Exception as e:
            logger.debug(f"Failed to index element {i}: {e}")
            continue

    logger.info(f"Indexed {len(indexed)} elements")
    return indexed


async def _prioritize_elements(elements: List['ElementHandle']) -> List['ElementHandle']:
    """Sort elements by priority: inputs first, then by keyword scoring"""
    scored = []

    for el in elements:
        try:
            tag = (await el.evaluate("e => e.tagName")).lower()
            text = (await el.text_content() or "").lower()
            placeholder = (await el.get_attribute("placeholder") or "").lower()
            aria_label = (await el.get_attribute("aria-label") or "").lower()

            # Combine text sources
            all_text = f"{text} {placeholder} {aria_label}"

            # Calculate score
            score = 0

            # Tag-based scoring
            if tag in ('input', 'textarea', 'select'):
                score += 100  # Form inputs highest priority
            elif tag == 'button':
                score += 50
            elif tag == 'a':
                score += 20

            # Keyword scoring
            for kw in PRIORITY_KEYWORDS['high']:
                if kw in all_text:
                    score += 30
            for kw in PRIORITY_KEYWORDS['medium']:
                if kw in all_text:
                    score += 15

            scored.append((score, el))
        except Exception:
            scored.append((0, el))

    # Sort by score descending
    scored.sort(key=lambda x: -x[0])
    return [el for _, el in scored]


async def _create_element_ref(el: 'ElementHandle', index: int) -> ElementRef:
    """Create stable reference for element"""
    tag = (await el.evaluate("e => e.tagName")).lower()

    # Get text content, prioritizing specific attributes
    text = ""
    try:
        # Try aria-label first (most descriptive)
        aria_label = await el.get_attribute("aria-label")
        if aria_label:
            text = aria_label
        else:
            # Try placeholder for inputs
            placeholder = await el.get_attribute("placeholder")
            if placeholder:
                text = placeholder
            else:
                # Fall back to text content
                text_content = await el.text_content()
                if text_content:
                    text = text_content
    except Exception:
        pass

    # Clean and truncate text
    text = ' '.join(text.split())[:50].strip()

    # Get bounding box
    bbox = await el.bounding_box()

    # Try to find stable selector
    stable_selector = None
    try:
        # Prefer id
        el_id = await el.get_attribute("id")
        if el_id and not el_id.startswith("usa-"):
            stable_selector = f"#{el_id}"
        else:
            # Try data-testid
            test_id = await el.get_attribute("data-testid")
            if test_id:
                stable_selector = f'[data-testid="{test_id}"]'
            else:
                # Try name attribute for form elements
                name = await el.get_attribute("name")
                if name and tag in ('input', 'select', 'textarea'):
                    stable_selector = f'{tag}[name="{name}"]'
    except Exception:
        pass

    return ElementRef(
        index=index,
        tag=tag,
        text_signature=text,
        stable_selector=stable_selector,
        bounding_box=bbox
    )


async def _clear_existing_labels(page: 'Page') -> None:
    """Remove any existing USA labels from the page"""
    try:
        await page.evaluate('''
            () => {
                document.querySelectorAll('.usa-label-host').forEach(el => el.remove());
            }
        ''')
    except Exception:
        pass


async def _inject_label(page: 'Page', index: int) -> None:
    """
    Inject visual label using Shadow DOM (CSP-safe).

    Uses safe DOM methods instead of innerHTML.
    Handles scroll position correctly.
    """
    await page.evaluate('''
        (args) => {
            const [index] = args;
            const el = document.querySelector(`[data-usa-index="${index}"]`);
            if (!el) return;

            // Remove existing label for this index if any
            const existing = document.querySelector(`.usa-label-${index}`);
            if (existing) existing.remove();

            // Create shadow host for CSP isolation
            const host = document.createElement('span');
            host.className = `usa-label-host usa-label-${index}`;
            host.style.position = 'absolute';
            host.style.zIndex = '99999';
            host.style.pointerEvents = 'none';

            const shadow = host.attachShadow({mode: 'closed'});

            // Create style element safely
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
                box-shadow: 0 1px 2px rgba(0,0,0,0.3);
            }`;
            shadow.appendChild(style);

            // Create label element safely using textContent
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
