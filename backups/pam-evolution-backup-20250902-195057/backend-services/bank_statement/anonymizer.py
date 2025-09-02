"""
Server-side Data Anonymization Service
Advanced anonymization for bank statements with GDPR compliance
"""

import re
import hashlib
import asyncio
from typing import Dict, List, Any, Set, Tuple
from datetime import datetime
from cryptography.fernet import Fernet

from app.core.logging import get_logger

logger = get_logger(__name__)

class ServerSideAnonymizer:
    """
    Advanced server-side anonymization service
    Provides more sophisticated pattern matching and context-aware redaction
    """
    
    def __init__(self):
        # Advanced patterns with context awareness
        self.sensitive_patterns = {
            'account_number': {
                'patterns': [
                    r'\b(?:account|acct|ac)[\s\#:]?\s*(\d{8,20})\b',
                    r'\b(\d{4}[\s\-]*\d{4}[\s\-]*\d{4}[\s\-]*\d{4})\b',  # Credit card
                    r'\b(\d{10,17})\b',  # Generic account numbers
                ],
                'priority': 100,
                'replacement': lambda m: self._mask_account_number(m.group(1))
            },
            
            'ssn': {
                'patterns': [
                    r'\b(\d{3}[-\s]?\d{2}[-\s]?\d{4})\b',
                    r'\b(?:ssn|social)[\s\#:]?\s*(\d{3}[-\s]?\d{2}[-\s]?\d{4})\b',
                ],
                'priority': 95,
                'replacement': lambda m: 'XXX-XX-' + m.group(1)[-4:]
            },
            
            'routing_number': {
                'patterns': [
                    r'\b(?:routing|aba|rtn)[\s\#:]?\s*(\d{9})\b',
                    r'\b(\d{9})\b(?=.*routing|.*aba)',
                ],
                'priority': 90,
                'replacement': lambda m: 'XXXXX' + m.group(1)[-4:]
            },
            
            'phone': {
                'patterns': [
                    r'\b(\+?1?[-\s]?\(?(\d{3})\)?[-\s]?(\d{3})[-\s]?(\d{4}))\b',
                    r'\b(\d{3}[-\.\s]?\d{3}[-\.\s]?\d{4})\b',
                ],
                'priority': 80,
                'replacement': lambda m: 'XXX-XXX-' + m.group(1)[-4:]
            },
            
            'email': {
                'patterns': [
                    r'\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b',
                ],
                'priority': 75,
                'replacement': lambda m: '[email]'
            },
            
            'address': {
                'patterns': [
                    r'\b(\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir|Plaza|Pl|Way|Parkway|Pkwy)(?:\s+(?:Apt|Suite|Unit|#)\s*\d+)?)\b',
                    r'\b(\d{5}(?:-\d{4})?)\b',  # ZIP codes
                ],
                'priority': 70,
                'replacement': lambda m: '[address]'
            },
            
            'personal_name': {
                'patterns': [
                    r'\b(?:Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)\b',
                    r'\b([A-Z][a-z]+\s+[A-Z]\.\s+[A-Z][a-z]+)\b',
                    r'\b([A-Z][A-Z]+,\s*[A-Z][a-z]+)\b',  # LAST, First format
                ],
                'priority': 65,
                'replacement': lambda m: '[name]'
            },
            
            'ip_address': {
                'patterns': [
                    r'\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b',
                ],
                'priority': 60,
                'replacement': lambda m: 'XXX.XXX.XXX.XXX'
            },
            
            'transaction_ref': {
                'patterns': [
                    r'\b(?:ref|reference|confirmation|conf)[\s\#:]?\s*([A-Z0-9]{10,})\b',
                    r'\b([A-Z0-9]{15,})\b',  # Long alphanumeric sequences
                ],
                'priority': 50,
                'replacement': lambda m: '[ref]'
            }
        }
        
        # Merchant extraction patterns
        self.merchant_patterns = [
            r'^(?:POS|DEBIT|PURCHASE|PAYMENT)\s+(.+?)(?:\s+\d{2}/\d{2}|\s+\#\d+|$)',
            r'^(.+?)\s+(?:\*{4,}\d{4}|XXXX\d{4})(?:\s|$)',
            r'^([^*#]+?)(?:\s*[*#]+\d{4})?$',
            r'^(.+?)(?:\s+\d{2}/\d{2}/\d{2,4})?$',
        ]
        
        # Recurring transaction indicators
        self.recurring_keywords = {
            'subscription', 'recurring', 'monthly', 'annual', 'membership',
            'netflix', 'spotify', 'amazon prime', 'hulu', 'disney',
            'insurance', 'mortgage', 'rent', 'utilities', 'phone bill',
            'internet', 'gym', 'storage', 'autopay', 'automatic'
        }
    
    async def anonymize_transactions(self, transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Anonymize a list of transactions
        
        Args:
            transactions: List of transaction dictionaries
            
        Returns:
            Dictionary with anonymized transactions and metadata
        """
        start_time = datetime.now()
        anonymized = []
        all_redacted_fields = set()
        
        for transaction in transactions:
            anonymized_tx, redacted = await self._anonymize_single_transaction(transaction)
            anonymized.append(anonymized_tx)
            all_redacted_fields.update(redacted)
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        return {
            'transactions': anonymized,
            'redacted_fields': list(all_redacted_fields),
            'processing_time_ms': processing_time,
            'anonymization_level': 'high',
            'total_transactions': len(anonymized)
        }
    
    async def _anonymize_single_transaction(self, transaction: Dict[str, Any]) -> Tuple[Dict[str, Any], Set[str]]:
        """Anonymize a single transaction"""
        anonymized = transaction.copy()
        redacted_fields = set()
        
        # Anonymize description
        if 'description' in anonymized:
            anonymized['description'], desc_redacted = self._anonymize_text(anonymized['description'])
            redacted_fields.update(desc_redacted)
        
        # Extract and clean merchant name
        if 'description' in anonymized:
            anonymized['merchantName'] = self._extract_merchant_name(anonymized['description'])
        
        # Detect recurring transactions
        anonymized['isRecurring'] = self._is_recurring_transaction(anonymized.get('description', ''))
        
        # Generate hash for duplicate detection
        anonymized['hash_signature'] = self._generate_transaction_hash(anonymized)
        
        # Add confidence score
        anonymized['confidence_score'] = self._calculate_confidence_score(anonymized)
        
        # Store redacted fields in transaction
        anonymized['redacted_fields'] = list(redacted_fields)
        
        # Remove any remaining sensitive data
        sensitive_keys = ['raw_line', 'originalData', 'raw_text']
        for key in sensitive_keys:
            anonymized.pop(key, None)
        
        return anonymized, redacted_fields
    
    def _anonymize_text(self, text: str) -> Tuple[str, Set[str]]:
        """
        Anonymize text using advanced pattern matching
        
        Returns:
            Tuple of (anonymized_text, set_of_redacted_field_types)
        """
        anonymized = text
        redacted_types = set()
        
        # Sort patterns by priority (highest first)
        sorted_patterns = sorted(
            self.sensitive_patterns.items(),
            key=lambda x: x[1]['priority'],
            reverse=True
        )
        
        for pattern_type, config in sorted_patterns:
            for pattern in config['patterns']:
                matches = list(re.finditer(pattern, anonymized, re.IGNORECASE))
                if matches:
                    redacted_types.add(pattern_type)
                    
                    # Apply replacement function
                    replacement_func = config['replacement']
                    for match in reversed(matches):  # Replace from end to preserve indices
                        start, end = match.span()
                        try:
                            replacement = replacement_func(match)
                            anonymized = anonymized[:start] + replacement + anonymized[end:]
                        except Exception as e:
                            logger.warning(f"Failed to apply replacement for {pattern_type}: {e}")
                            # Fallback to generic replacement
                            anonymized = anonymized[:start] + '[redacted]' + anonymized[end:]
        
        # Additional cleanup
        anonymized = self._final_cleanup(anonymized)
        
        return anonymized, redacted_types
    
    def _mask_account_number(self, account_num: str) -> str:
        """Mask account number showing only last 4 digits"""
        digits = re.sub(r'\D', '', account_num)
        if len(digits) >= 4:
            return '*' * (len(digits) - 4) + digits[-4:]
        return '*' * len(digits)
    
    def _extract_merchant_name(self, description: str) -> str:
        """Extract and clean merchant name from transaction description"""
        merchant = description
        
        # Try each merchant pattern
        for pattern in self.merchant_patterns:
            match = re.match(pattern, merchant, re.IGNORECASE)
            if match:
                merchant = match.group(1).strip()
                break
        
        # Clean up the merchant name
        merchant = self._clean_merchant_name(merchant)
        
        return merchant or 'Unknown Merchant'
    
    def _clean_merchant_name(self, merchant: str) -> str:
        """Clean and standardize merchant name"""
        # Remove common prefixes/suffixes
        merchant = re.sub(r'^(POS|ATM|DEBIT|CREDIT|PURCHASE|PAYMENT|TRANSFER|FROM|TO)\s+', '', merchant, flags=re.IGNORECASE)
        merchant = re.sub(r'\s+(LLC|INC|CORP|LTD|CO)\.?$', '', merchant, flags=re.IGNORECASE)
        
        # Remove reference numbers and codes
        merchant = re.sub(r'\s+\d{10,}$', '', merchant)
        merchant = re.sub(r'\s+[A-Z0-9]{10,}$', '', merchant)
        
        # Clean whitespace
        merchant = re.sub(r'\s+', ' ', merchant).strip()
        
        # Proper case formatting
        if merchant.isupper() and len(merchant) > 3:
            merchant = merchant.title()
        
        return merchant
    
    def _is_recurring_transaction(self, description: str) -> bool:
        """Detect if transaction is likely recurring"""
        desc_lower = description.lower()
        return any(keyword in desc_lower for keyword in self.recurring_keywords)
    
    def _calculate_confidence_score(self, transaction: Dict[str, Any]) -> float:
        """Calculate confidence score for transaction parsing accuracy"""
        score = 1.0
        
        # Reduce score for missing or poor quality data
        if not transaction.get('description') or len(transaction.get('description', '')) < 3:
            score -= 0.3
        
        if transaction.get('amount', 0) <= 0:
            score -= 0.4
        
        if not transaction.get('date'):
            score -= 0.5
        
        # Reduce score if too many fields were redacted
        redacted_count = len(transaction.get('redacted_fields', []))
        if redacted_count > 3:
            score -= 0.2
        
        return max(0.0, min(1.0, score))
    
    def _generate_transaction_hash(self, transaction: Dict[str, Any]) -> str:
        """Generate hash for duplicate detection"""
        # Create hash from stable transaction elements
        hash_elements = [
            str(transaction.get('date', '')),
            str(transaction.get('amount', 0)),
            str(transaction.get('type', '')),
            transaction.get('description', '')[:50]  # First 50 chars of description
        ]
        
        hash_input = '|'.join(hash_elements)
        return hashlib.sha256(hash_input.encode()).hexdigest()[:16]
    
    def _final_cleanup(self, text: str) -> str:
        """Final cleanup of anonymized text"""
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove any remaining suspicious patterns
        text = re.sub(r'\b[A-Z0-9]{20,}\b', '[ref]', text)  # Very long alphanumeric
        text = re.sub(r'\b\d{15,}\b', '[number]', text)  # Very long numbers
        
        # Clean up multiple consecutive redactions
        text = re.sub(r'(\[redacted\]\s*){2,}', '[redacted] ', text)
        text = re.sub(r'(\[ref\]\s*){2,}', '[ref] ', text)
        
        return text.strip()

# Utility functions for encryption (when needed)
def generate_encryption_key() -> bytes:
    """Generate a new encryption key"""
    return Fernet.generate_key()

def encrypt_data(data: str, key: bytes) -> bytes:
    """Encrypt sensitive data"""
    f = Fernet(key)
    return f.encrypt(data.encode())

def decrypt_data(encrypted_data: bytes, key: bytes) -> str:
    """Decrypt sensitive data"""
    f = Fernet(key)
    return f.decrypt(encrypted_data).decode()