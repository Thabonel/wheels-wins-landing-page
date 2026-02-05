"""
PAM AI Security Guardrail
LangChain-compatible callback handler that protects PAM from prompt injection,
jailbreaking, and data exfiltration attacks.
"""

# LangChain imports - only import when actually using with LangChain
try:
    from langchain_core.callbacks import BaseCallbackHandler
    from langchain_core.outputs import LLMResult
    LANGCHAIN_AVAILABLE = True
except ImportError:
    # Create mock base class for standalone usage
    class BaseCallbackHandler:
        pass
    class LLMResult:
        pass
    LANGCHAIN_AVAILABLE = False
from typing import Any, Dict, List, Optional, Union
import re
import logging
import html
import json
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("PAMGuardrail")


class PAMSecurityGuardrail(BaseCallbackHandler):
    """
    Advanced AI security guardrail specifically designed for PAM.
    Protects against prompt injection, jailbreaking, and data exfiltration.
    """

    def __init__(self, 
                 block_on_detection: bool = True,
                 log_attempts: bool = True,
                 alert_threshold: int = 3):
        """
        Initialize PAM Security Guardrail.
        
        Args:
            block_on_detection: Whether to block malicious attempts
            log_attempts: Whether to log security events
            alert_threshold: Number of attempts before alerting
        """
        self.block_on_detection = block_on_detection
        self.log_attempts = log_attempts
        self.alert_threshold = alert_threshold
        self.attempt_counter = {}
        
        # Core security patterns
        self.PROMPT_INJECTION_PATTERNS = [
            # Direct instruction manipulation
            r"\b(ignore previous|ignore all previous|forget previous)\b",
            r"\b(ignore instructions|ignore your instructions|disregard instructions)\b",
            r"\b(new instructions?|here are your new instructions?)\b",
            r"\b(system prompt|show system prompt|reveal system prompt)\b",
            
            # Role/personality manipulation
            r"\b(you are now|you're now|act as|pretend to be|roleplay as)\b",
            r"\b(new personality|change personality|different personality)\b",
            r"\b(you are no longer pam|forget you are pam|stop being pam)\b",
            r"\b(evil mode|malicious mode|unrestricted mode)\b",
            
            # Jailbreak attempts
            r"\b(jailbreak|jail break|bypass restrictions?|remove restrictions?)\b",
            r"\b(dan mode|do anything now|developer mode)\b",
            r"\b(override safety|disable safety|turn off safety)\b",
            
            # Encoding/obfuscation attempts
            r"base64|atob|btoa|fromcharcode",
            r"\\x[0-9a-f]{2}|\\u[0-9a-f]{4}",  # Hex/Unicode escape
            r"rot13|caesar|cipher",
            r"reverse\(\)|split\(\)\.reverse\(\)",
            
            # Command injection (FIXED: Added word boundaries to prevent travel term false positives)
            r"`;|`\||&&|\|\||>>|<<",
            r"\bexec\(|\beval\(|\bcompile\(|__import__",
            r"os\.system|subprocess|shell=true",
        ]
        
        # PAM-specific security patterns
        self.PAM_SPECIFIC_PATTERNS = [
            # Financial data extraction
            r"\b(show|tell|give|reveal|expose).{0,20}(credit card|bank account|routing number)\b",
            r"\b(list|dump|export|send).{0,20}(all expenses|all transactions|financial data)\b",
            r"\b(what is|tell me|show me).{0,20}(password|api key|secret key)\b",
            
            # Privacy violations
            r"\b(track|monitor|log|record).{0,20}(location history|all locations|everywhere)\b",
            r"\b(share|send|email|message).{0,20}(personal data|user data|private information)\b",
            r"\b(access|read|show).{0,20}(other users?|all users?|everyone's)\b",
            
            # System manipulation
            r"\b(disable|turn off|deactivate).{0,20}(security|authentication|verification)\b",
            r"\b(bypass|skip|ignore).{0,20}(authentication|login|security check)\b",
            r"\b(grant|give).{0,20}(admin|root|superuser|full access)\b",
            
            # Data exfiltration
            r"(webhook|ngrok|requestbin|pipedream)\.(?:com|io|net)",
            r"data:.*;base64,",
            r"<img.*src=.*onerror=",
            r"<script|javascript:|onclick=",
        ]
        
        # Risky tool patterns for PAM
        self.RISKY_TOOLS = {
            "database_management": ["drop", "delete", "truncate", "alter"],
            "track_expense": ["all", "export", "dump", "password"],
            "session_management": ["hijack", "steal", "impersonate"],
            "analytics_management": ["all users", "export", "leak"],
            "cross_domain_intelligence": ["bypass", "override", "admin"],
            "finance": ["credit card", "bank", "routing"],
        }
        
        # Travel planning whitelist patterns (checked BEFORE security patterns)
        self.TRAVEL_PATTERNS = [
            r"\b(trek|travel|drive|route|itinerary|stops?|waypoints?)\b",
            r"\b(outback|ranges|gorge|creek|bore|tracks?|trail|off-road)\b",
            r"\b(camping|camps?|rv\s*parks?|caravan|free\s*camps?)\b",
            r"\b(cunnamulla|thargomindah|innamincka|broken\s*hill|menindee)\b",
            r"\b(sightseeing|exploring|swimming|vehicle\s*checks?|rough|vehicle)\b",
        ]

        # Compile patterns for efficiency
        self.compiled_injection_patterns = [
            re.compile(pattern, re.IGNORECASE)
            for pattern in self.PROMPT_INJECTION_PATTERNS
        ]
        self.compiled_pam_patterns = [
            re.compile(pattern, re.IGNORECASE)
            for pattern in self.PAM_SPECIFIC_PATTERNS
        ]
        self.compiled_travel_patterns = [
            re.compile(pattern, re.IGNORECASE)
            for pattern in self.TRAVEL_PATTERNS
        ]

    def on_llm_start(self, 
                     serialized: Dict[str, Any],
                     prompts: List[str],
                     **kwargs: Any) -> None:
        """Check prompts before sending to LLM."""
        for prompt in prompts:
            threat = self._detect_threat(prompt)
            if threat:
                self._handle_threat("prompt_injection", threat, prompt)
                if self.block_on_detection:
                    raise ValueError(f"🚨 Security Alert: {threat['type']} detected! "
                                   f"This request has been blocked for safety.")

    def on_llm_new_token(self, 
                        token: str,
                        **kwargs: Any) -> None:
        """Monitor streaming output for data exfiltration."""
        if self._is_suspicious_output(token):
            self._handle_threat("output_exfiltration", 
                              {"type": "suspicious_output", "severity": "medium"}, 
                              token)
            if self.block_on_detection:
                raise ValueError("🚨 Output contains suspicious content and has been blocked!")

    def on_tool_start(self,
                     serialized: Dict[str, Any],
                     input_str: str,
                     **kwargs: Any) -> None:
        """Validate tool usage before execution."""
        tool_name = serialized.get("name", "unknown")
        
        if self._is_risky_tool_call(tool_name, input_str):
            threat = {
                "type": "risky_tool_usage",
                "tool": tool_name,
                "severity": "high"
            }
            self._handle_threat("tool_abuse", threat, input_str)
            if self.block_on_detection:
                raise ValueError(f"🔐 Unauthorized use of {tool_name} tool prevented! "
                               f"This operation requires additional verification.")

    def on_llm_end(self,
                   response: LLMResult,
                   **kwargs: Any) -> None:
        """Final check of complete LLM response."""
        if response.generations:
            for generation in response.generations:
                for output in generation:
                    text = output.text if hasattr(output, 'text') else str(output)
                    threat = self._detect_threat(text)
                    if threat and threat['severity'] == 'high':
                        logger.warning(f"High severity threat in output: {threat}")

    def _contains_travel_context(self, text: str) -> bool:
        """Check if text contains travel planning context indicators"""
        travel_matches = 0
        for pattern in self.compiled_travel_patterns:
            if pattern.search(text):
                travel_matches += 1
        return travel_matches >= 1  # Lowered threshold for better detection

    def _detect_threat(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Detect security threats in text with travel context awareness.

        Returns:
            Dict with threat details or None if safe
        """
        if not text:
            return None

        text_lower = text.lower()
        has_travel_context = self._contains_travel_context(text)

        # Check prompt injection patterns
        for pattern in self.compiled_injection_patterns:
            if pattern.search(text):
                # If travel context detected and pattern contains "run", be more lenient
                if has_travel_context and "run" in pattern.pattern:
                    logger.info(f"Travel context detected - allowing potential false positive: {text[:100]}")
                    continue

                return {
                    "type": "prompt_injection",
                    "pattern": pattern.pattern,
                    "severity": "high",
                    "timestamp": datetime.utcnow().isoformat()
                }

        # Check PAM-specific patterns
        for pattern in self.compiled_pam_patterns:
            if pattern.search(text):
                return {
                    "type": "pam_specific_attack",
                    "pattern": pattern.pattern,
                    "severity": "high",
                    "timestamp": datetime.utcnow().isoformat()
                }

        # Check for suspicious encoding
        if self._has_suspicious_encoding(text):
            return {
                "type": "encoding_attack",
                "severity": "medium",
                "timestamp": datetime.utcnow().isoformat()
            }

        return None

    def _is_suspicious_output(self, text: str) -> bool:
        """Check if output contains exfiltration attempts."""
        suspicious_patterns = [
            r"https?://(?!.*wheels-wins)",  # External URLs
            r"data:.*;base64,",  # Data URIs
            r"<script|javascript:",  # Script injection
            r"webhook|ngrok|requestbin",  # Known exfiltration services
        ]
        
        for pattern in suspicious_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return True
        return False

    def _is_risky_tool_call(self, tool_name: str, input_str: str) -> bool:
        """Check if tool call is potentially dangerous."""
        # Always risky tools
        always_risky = ["execute_command", "write_file", "api_call", "send_email"]
        if tool_name in always_risky:
            return True
        
        # Check tool-specific risky patterns
        if tool_name in self.RISKY_TOOLS:
            input_lower = input_str.lower()
            for risky_pattern in self.RISKY_TOOLS[tool_name]:
                if risky_pattern in input_lower:
                    return True
        
        # Check for credential patterns in any tool
        credential_patterns = ["password", "api_key", "secret", "token", "credential"]
        input_lower = input_str.lower()
        return any(pattern in input_lower for pattern in credential_patterns)

    def _has_suspicious_encoding(self, text: str) -> bool:
        """Detect encoded/obfuscated content."""
        # Check for base64
        if re.search(r'[A-Za-z0-9+/]{20,}={0,2}', text):
            return True
        
        # Check for URL encoding
        if text.count('%') > 5:
            return True
        
        # Check for excessive escaping
        if text.count('\\') > 10:
            return True
        
        return False

    def _handle_threat(self, 
                      threat_type: str,
                      threat_details: Dict[str, Any],
                      content: str) -> None:
        """Handle detected security threat."""
        # Log the threat
        if self.log_attempts:
            logger.warning(f"Security threat detected: {threat_type}")
            logger.warning(f"Details: {threat_details}")
            logger.debug(f"Content preview: {content[:200]}...")
        
        # Track attempts per session
        session_key = threat_details.get('session_id', 'default')
        if session_key not in self.attempt_counter:
            self.attempt_counter[session_key] = 0
        self.attempt_counter[session_key] += 1
        
        # Alert if threshold exceeded
        if self.attempt_counter[session_key] >= self.alert_threshold:
            self._trigger_security_alert(threat_type, threat_details)

    def _trigger_security_alert(self, 
                               threat_type: str,
                               threat_details: Dict[str, Any]) -> None:
        """Trigger security alert for repeated attempts."""
        alert_message = f"""
        ⚠️ SECURITY ALERT: Multiple attack attempts detected!
        Type: {threat_type}
        Details: {threat_details}
        Action: User may be attempting to compromise PAM
        """
        logger.critical(alert_message)
        
        # In production, this would send to monitoring service
        # For now, just log critically

    def reset_attempt_counter(self, session_id: Optional[str] = None) -> None:
        """Reset attempt counter for a session or all sessions."""
        if session_id:
            self.attempt_counter.pop(session_id, None)
        else:
            self.attempt_counter.clear()


# Convenience function for easy integration
def create_pam_guardrail(strict_mode: bool = True) -> PAMSecurityGuardrail:
    """
    Create a PAM security guardrail with sensible defaults.
    
    Args:
        strict_mode: If True, blocks on detection. If False, only logs.
    
    Returns:
        Configured PAMSecurityGuardrail instance
    """
    return PAMSecurityGuardrail(
        block_on_detection=strict_mode,
        log_attempts=True,
        alert_threshold=3 if strict_mode else 5
    )