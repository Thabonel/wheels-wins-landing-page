"""
Temporary UUID compatibility patch for JWT verification
This file contains the UUID fallback logic to restore PAM functionality
while waiting for frontend deployment.
"""

import re
import uuid
from typing import Dict, Any

# UUID pattern for validation
UUID_PATTERN = re.compile(r'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$', re.IGNORECASE)

def check_uuid_token(token: str) -> Dict[str, Any] | None:
    """
    Check if token is a UUID and return mock user data if valid.
    This is a TEMPORARY compatibility layer for frontend deployment transition.
    
    Args:
        token: The token to check
        
    Returns:
        Mock user data if token is a valid UUID, None otherwise
    """
    if UUID_PATTERN.match(token):
        try:
            # Validate it's a proper UUID
            uuid_obj = uuid.UUID(token)
            
            # Return mock user data for UUID tokens
            return {
                "sub": str(uuid_obj),  # User ID
                "email": f"user-{str(uuid_obj)[:8]}@temporary.auth",
                "role": "authenticated",
                "aud": "authenticated",
                "exp": 9999999999,  # Far future expiry
                "_is_uuid_auth": True,  # Flag for monitoring
                "_warning": "TEMPORARY UUID AUTH - Frontend deployment pending"
            }
        except ValueError:
            pass
    
    return None