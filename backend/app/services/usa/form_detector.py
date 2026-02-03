"""
Form Field Detector for Universal Site Access

Smart detection of form fields and their types using multiple heuristics:
placeholder text, labels, aria attributes, input types, and nearby text.
"""

import logging
import re
from typing import List, Dict, Optional, TYPE_CHECKING

from .models import FormField, FieldType
from .element_indexer import index_page

if TYPE_CHECKING:
    from playwright.async_api import Page

logger = logging.getLogger(__name__)


# Patterns for field type detection
FIELD_PATTERNS = {
    FieldType.EMAIL: [
        r'email', r'e-mail', r'correo', r'mail'
    ],
    FieldType.PHONE: [
        r'phone', r'tel', r'mobile', r'cell', r'telefono', r'number.*phone'
    ],
    FieldType.FIRST_NAME: [
        r'first.?name', r'fname', r'given.?name', r'nombre'
    ],
    FieldType.LAST_NAME: [
        r'last.?name', r'lname', r'surname', r'family.?name', r'apellido'
    ],
    FieldType.NAME: [
        r'^name$', r'full.?name', r'your.?name', r'guest.?name'
    ],
    FieldType.ADDRESS: [
        r'address', r'street', r'direccion', r'addr'
    ],
    FieldType.CITY: [
        r'city', r'ciudad', r'town'
    ],
    FieldType.STATE: [
        r'state', r'province', r'region', r'estado'
    ],
    FieldType.ZIP_CODE: [
        r'zip', r'postal', r'postcode', r'codigo.?postal'
    ],
    FieldType.COUNTRY: [
        r'country', r'pais', r'nation'
    ],
    FieldType.DATE: [
        r'^date$', r'fecha'
    ],
    FieldType.DATE_CHECKIN: [
        r'check.?in', r'arrival', r'start.?date', r'from.?date', r'llegada'
    ],
    FieldType.DATE_CHECKOUT: [
        r'check.?out', r'departure', r'end.?date', r'to.?date', r'salida'
    ],
    FieldType.GUESTS: [
        r'guests?', r'people', r'visitors', r'party.?size', r'huespedes'
    ],
    FieldType.ADULTS: [
        r'adults?', r'adultos'
    ],
    FieldType.CHILDREN: [
        r'child(?:ren)?', r'kids?', r'ninos'
    ],
    FieldType.PASSWORD: [
        r'password', r'pass', r'pwd', r'contrasena'
    ],
    FieldType.CREDIT_CARD: [
        r'card.?number', r'credit.?card', r'cc.?number', r'tarjeta'
    ],
    FieldType.CVV: [
        r'cvv', r'cvc', r'security.?code', r'card.?code'
    ],
    FieldType.EXPIRY: [
        r'expir', r'valid', r'mm.?yy', r'exp.?date', r'vencimiento'
    ],
    FieldType.SEARCH: [
        r'search', r'buscar', r'find', r'query', r'q$'
    ],
    FieldType.MESSAGE: [
        r'message', r'comment', r'note', r'description', r'mensaje', r'inquiry'
    ],
    FieldType.NUMBER: [
        r'number', r'count', r'quantity', r'amount'
    ],
}


class FormDetector:
    """
    Detects and classifies form fields on a page.

    Uses multiple heuristics including:
    - Input type attribute (email, tel, date, etc.)
    - Name and ID attributes
    - Placeholder text
    - Associated labels (via for attribute or wrapping)
    - aria-label and aria-describedby
    - Nearby text content
    """

    async def detect_form_fields(
        self,
        page: 'Page',
        elements: Optional[List] = None,
    ) -> List[FormField]:
        """
        Detect and classify all form fields on the page.

        Args:
            page: Playwright page instance
            elements: Optional pre-indexed elements; will index if not provided

        Returns:
            List of FormField objects with classification
        """
        logger.info("Detecting form fields")

        # Index page if elements not provided
        if not elements:
            elements = await index_page(page)

        form_fields: List[FormField] = []

        for element_ref in elements:
            # Only process form elements
            if element_ref.tag not in ('input', 'select', 'textarea'):
                continue

            try:
                field = await self._analyze_field(page, element_ref)
                if field:
                    form_fields.append(field)
            except Exception as e:
                logger.debug(f"Failed to analyze field [{element_ref.index}]: {e}")

        logger.info(f"Detected {len(form_fields)} form fields")
        return form_fields

    async def _analyze_field(
        self,
        page: 'Page',
        element_ref,
    ) -> Optional[FormField]:
        """Analyze a single element and create FormField if applicable"""

        index = element_ref.index
        selector = f'[data-usa-index="{index}"]'

        try:
            locator = page.locator(selector).first

            # Get all relevant attributes
            attrs = await locator.evaluate('''el => ({
                type: el.type || '',
                name: el.name || '',
                id: el.id || '',
                placeholder: el.placeholder || '',
                ariaLabel: el.getAttribute('aria-label') || '',
                ariaDescribedBy: el.getAttribute('aria-describedby') || '',
                required: el.required || el.getAttribute('aria-required') === 'true',
                value: el.value || '',
                autocomplete: el.getAttribute('autocomplete') || '',
            })''')

            # Get associated label
            label_text = await self._get_label_text(page, attrs['id'], locator)

            # Classify field type
            field_type = self._classify_field_type(
                element_ref.tag,
                attrs['type'],
                attrs['name'],
                attrs['id'],
                attrs['placeholder'],
                attrs['ariaLabel'],
                attrs['autocomplete'],
                label_text,
            )

            # Get options for select elements
            options = []
            if element_ref.tag == 'select':
                options = await self._get_select_options(locator)

            return FormField(
                index=index,
                field_type=field_type,
                label=label_text,
                placeholder=attrs['placeholder'],
                name_attr=attrs['name'],
                id_attr=attrs['id'],
                is_required=attrs['required'],
                current_value=attrs['value'],
                options=options,
            )

        except Exception as e:
            logger.debug(f"Field analysis error for [{index}]: {e}")
            return None

    async def _get_label_text(
        self,
        page: 'Page',
        element_id: str,
        locator,
    ) -> str:
        """Get label text for a form element"""

        label_text = ""

        # Try explicit label via for attribute
        if element_id:
            try:
                label = page.locator(f'label[for="{element_id}"]').first
                label_text = await label.text_content() or ""
            except Exception:
                pass

        # Try parent label (wrapping label)
        if not label_text:
            try:
                label_text = await locator.evaluate('''el => {
                    const label = el.closest('label');
                    if (label) {
                        return label.textContent || '';
                    }
                    return '';
                }''')
            except Exception:
                pass

        # Try nearby text (preceding sibling or parent div)
        if not label_text:
            try:
                label_text = await locator.evaluate('''el => {
                    const prev = el.previousElementSibling;
                    if (prev && prev.textContent) {
                        return prev.textContent.trim();
                    }
                    const parent = el.parentElement;
                    if (parent) {
                        const text = parent.textContent || '';
                        return text.split(/[\\n\\r]+/)[0].trim();
                    }
                    return '';
                }''')
            except Exception:
                pass

        return " ".join(label_text.split())[:100]

    async def _get_select_options(self, locator) -> List[str]:
        """Get all option values/labels from a select element"""
        try:
            options = await locator.evaluate('''el => {
                return Array.from(el.options).map(opt => opt.text || opt.value);
            }''')
            return options[:50]  # Limit to prevent overflow
        except Exception:
            return []

    def _classify_field_type(
        self,
        tag: str,
        input_type: str,
        name: str,
        element_id: str,
        placeholder: str,
        aria_label: str,
        autocomplete: str,
        label: str,
    ) -> FieldType:
        """Classify field type using multiple signals"""

        # Combine all text signals for pattern matching
        combined_text = f"{name} {element_id} {placeholder} {aria_label} {label}".lower()

        # Check input type first (most reliable for standard types)
        type_mapping = {
            'email': FieldType.EMAIL,
            'tel': FieldType.PHONE,
            'password': FieldType.PASSWORD,
            'date': FieldType.DATE,
            'datetime-local': FieldType.DATE,
            'search': FieldType.SEARCH,
            'number': FieldType.NUMBER,
        }

        if input_type in type_mapping:
            return type_mapping[input_type]

        # Check autocomplete attribute (browser standard)
        autocomplete_mapping = {
            'email': FieldType.EMAIL,
            'tel': FieldType.PHONE,
            'given-name': FieldType.FIRST_NAME,
            'family-name': FieldType.LAST_NAME,
            'name': FieldType.NAME,
            'street-address': FieldType.ADDRESS,
            'address-line1': FieldType.ADDRESS,
            'address-level2': FieldType.CITY,
            'address-level1': FieldType.STATE,
            'postal-code': FieldType.ZIP_CODE,
            'country': FieldType.COUNTRY,
            'cc-number': FieldType.CREDIT_CARD,
            'cc-csc': FieldType.CVV,
            'cc-exp': FieldType.EXPIRY,
        }

        if autocomplete in autocomplete_mapping:
            return autocomplete_mapping[autocomplete]

        # Pattern matching on combined text
        for field_type, patterns in FIELD_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, combined_text, re.IGNORECASE):
                    return field_type

        # Default to unknown
        return FieldType.UNKNOWN

    def classify_field_type(self, element_ref) -> FieldType:
        """
        Classify field type from an ElementRef (synchronous version).

        Args:
            element_ref: ElementRef from element_indexer

        Returns:
            Detected FieldType
        """
        text = (element_ref.text_signature or "").lower()

        for field_type, patterns in FIELD_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, text, re.IGNORECASE):
                    return field_type

        return FieldType.UNKNOWN

    def map_user_data_to_fields(
        self,
        user_data: Dict[str, str],
        fields: List[FormField],
    ) -> Dict[int, str]:
        """
        Map user profile data to detected form fields.

        Args:
            user_data: Dict with user profile data (email, name, phone, etc.)
            fields: List of detected FormFields

        Returns:
            Dict mapping element_index -> value to fill
        """
        logger.info(f"Mapping user data to {len(fields)} fields")

        # Define mapping from user_data keys to field types
        data_to_field_type = {
            'email': [FieldType.EMAIL],
            'phone': [FieldType.PHONE],
            'name': [FieldType.NAME],
            'first_name': [FieldType.FIRST_NAME, FieldType.NAME],
            'last_name': [FieldType.LAST_NAME],
            'full_name': [FieldType.NAME],
            'address': [FieldType.ADDRESS],
            'city': [FieldType.CITY],
            'state': [FieldType.STATE],
            'zip': [FieldType.ZIP_CODE],
            'zip_code': [FieldType.ZIP_CODE],
            'postal_code': [FieldType.ZIP_CODE],
            'country': [FieldType.COUNTRY],
            'checkin': [FieldType.DATE_CHECKIN, FieldType.DATE],
            'checkout': [FieldType.DATE_CHECKOUT, FieldType.DATE],
            'check_in': [FieldType.DATE_CHECKIN, FieldType.DATE],
            'check_out': [FieldType.DATE_CHECKOUT, FieldType.DATE],
            'guests': [FieldType.GUESTS, FieldType.NUMBER],
            'adults': [FieldType.ADULTS, FieldType.NUMBER],
            'children': [FieldType.CHILDREN, FieldType.NUMBER],
        }

        field_mapping: Dict[int, str] = {}
        used_indices = set()

        for data_key, value in user_data.items():
            if not value:
                continue

            target_types = data_to_field_type.get(data_key.lower(), [])
            if not target_types:
                continue

            # Find matching field
            for field in fields:
                if field.index in used_indices:
                    continue

                if field.field_type in target_types:
                    field_mapping[field.index] = str(value)
                    used_indices.add(field.index)
                    logger.debug(f"Mapped {data_key}={value[:20]} to field [{field.index}]")
                    break

        logger.info(f"Mapped {len(field_mapping)} fields from user data")
        return field_mapping
