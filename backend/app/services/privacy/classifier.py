import re
from dataclasses import dataclass
from typing import List, Tuple


EMAIL_RE = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.IGNORECASE)
PHONE_RE = re.compile(r"\b(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3}[\s-]?\d{3,4}\b")
SSN_RE = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")
CC_RE = re.compile(r"\b(?:\d[ -]*?){13,16}\b")
ACCOUNT_RE = re.compile(r"\b(account|iban|routing|b\s*sb|bsb|sort code|account no\.?|card no\.?)\b", re.IGNORECASE)
ADDRESS_HINT_RE = re.compile(r"\b(st\.?|street|ave\.?|avenue|road|rd\.?|lane|ln\.?|drive|dr\.?|\d{1,5} [A-Za-z]+(?: [A-Za-z]+)*)\b", re.IGNORECASE)

HEALTH_HINT_RE = re.compile(r"\b(diagnos|prescription|medication|allerg|doctor|gp|clinic|medical|health|condition|symptom|treatment)\b", re.IGNORECASE)
FINANCE_HINT_RE = re.compile(r"\b(balance|transaction|account|bank|card|loan|mortgage|salary|income|expense|budget|invoice|receipt)\b", re.IGNORECASE)


@dataclass
class Classification:
    label: str  # 'PHI' | 'FINANCIAL' | 'PII' | 'PUBLIC'
    redactions: List[Tuple[str, str]]  # list of (type, value)


def classify(text: str) -> Classification:
    redactions: List[Tuple[str, str]] = []
    if not text:
        return Classification('PUBLIC', redactions)

    # Collect identifiers
    for regex, rtype in (
        (EMAIL_RE, 'EMAIL'),
        (PHONE_RE, 'PHONE'),
        (SSN_RE, 'SSN'),
        (CC_RE, 'CARD'),
    ):
        for m in regex.findall(text):
            redactions.append((rtype, m))

    # Hints
    has_account = ACCOUNT_RE.search(text) is not None
    has_address = ADDRESS_HINT_RE.search(text) is not None
    has_health = HEALTH_HINT_RE.search(text) is not None
    has_fin = FINANCE_HINT_RE.search(text) is not None

    # Decide label
    if has_health or SSN_RE.search(text):
        label = 'PHI'
    elif has_fin or has_account or CC_RE.search(text):
        label = 'FINANCIAL'
    elif redactions or has_address:
        label = 'PII'
    else:
        label = 'PUBLIC'

    return Classification(label, redactions)


def redact(text: str) -> str:
    if not text:
        return text
    out = text
    # Order matters to avoid overlapping tokens
    patterns = [
        (EMAIL_RE, 'EMAIL'),
        (SSN_RE, 'SSN'),
        (CC_RE, 'CARD'),
        (PHONE_RE, 'PHONE'),
    ]
    for regex, token in patterns:
        out = regex.sub(f"<{token}>", out)

    # Coarse account hints – mask numbers around keywords
    out = ACCOUNT_RE.sub("<ACCOUNT>", out)
    return out

