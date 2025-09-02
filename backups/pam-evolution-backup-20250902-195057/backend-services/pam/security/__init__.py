"""
PAM Security Module
Provides AI-specific security features including prompt injection protection,
jailbreak prevention, and data exfiltration detection.
"""

from .ai_guardrail import PAMSecurityGuardrail, create_pam_guardrail

__all__ = [
    "PAMSecurityGuardrail",
    "create_pam_guardrail"
]