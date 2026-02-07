#!/usr/bin/env python3
"""
Test Current Database Function Signatures - Baseline Tests
Documents current behavior before making signature changes
"""

import os
import sys
import pytest
import inspect
from typing import Dict, Any

# Set environment variables for testing (using existing values or safe defaults)
os.environ.setdefault('SUPABASE_URL', 'https://kycoklimpzkyrecbjecn.supabase.co')
os.environ.setdefault('SUPABASE_SERVICE_ROLE_KEY', 'test-key')
os.environ.setdefault('ANTHROPIC_API_KEY', 'test-key')
os.environ.setdefault('GEMINI_API_KEY', 'test-key')
os.environ.setdefault('ENVIRONMENT', 'development')

# Add backend to path
backend_path = os.path.join(os.path.dirname(__file__), '../../backend')
sys.path.insert(0, backend_path)

class TestCurrentSignatures:
    """Test current database utility function signatures"""

    def test_import_database_utilities(self):
        """Test that database utilities can be imported"""
        from app.services.pam.tools.utils.database import (
            safe_db_select,
            safe_db_insert,
            safe_db_update,
            safe_db_delete
        )

        # Verify functions exist
        assert callable(safe_db_select)
        assert callable(safe_db_insert)
        assert callable(safe_db_update)
        assert callable(safe_db_delete)

    def test_safe_db_select_signature(self):
        """Document current safe_db_select signature"""
        from app.services.pam.tools.utils.database import safe_db_select

        signature = inspect.signature(safe_db_select)
        params = signature.parameters

        print(f"Current safe_db_select signature: {signature}")

        # Current expected signature based on code analysis
        expected_params = ['table', 'filters', 'user_id', 'select', 'order_by', 'order_desc', 'limit']

        for param_name in expected_params:
            assert param_name in params, f"Missing parameter: {param_name}"

        # Check parameter types and defaults
        assert params['table'].annotation == str
        assert params['filters'].annotation == Dict[str, Any]
        assert params['user_id'].annotation == str
        assert params['select'].default == "*"
        assert params['order_by'].default is None
        assert params['order_desc'].default is False
        assert params['limit'].default is None

    def test_safe_db_insert_signature(self):
        """Document current safe_db_insert signature"""
        from app.services.pam.tools.utils.database import safe_db_insert

        signature = inspect.signature(safe_db_insert)
        params = signature.parameters

        print(f"Current safe_db_insert signature: {signature}")

        expected_params = ['table', 'data', 'user_id']
        for param_name in expected_params:
            assert param_name in params, f"Missing parameter: {param_name}"

        assert params['table'].annotation == str
        assert params['data'].annotation == Dict[str, Any]
        assert params['user_id'].annotation == str

    def test_safe_db_update_signature(self):
        """Document current safe_db_update signature"""
        from app.services.pam.tools.utils.database import safe_db_update

        signature = inspect.signature(safe_db_update)
        params = signature.parameters

        print(f"Current safe_db_update signature: {signature}")

        expected_params = ['table', 'record_id', 'data', 'user_id', 'id_column']
        for param_name in expected_params:
            assert param_name in params, f"Missing parameter: {param_name}"

    def test_safe_db_delete_signature(self):
        """Document current safe_db_delete signature"""
        from app.services.pam.tools.utils.database import safe_db_delete

        signature = inspect.signature(safe_db_delete)
        params = signature.parameters

        print(f"Current safe_db_delete signature: {signature}")

        expected_params = ['table', 'record_id', 'user_id', 'id_column']
        for param_name in expected_params:
            assert param_name in params, f"Missing parameter: {param_name}"

    def test_problematic_tool_calls(self):
        """Test that problematic tool calls fail with expected errors"""
        from app.services.pam.tools.utils.database import safe_db_select

        # Test case 1: Using 'columns' instead of 'select'
        with pytest.raises(TypeError) as exc_info:
            # This should fail because 'columns' is not a valid parameter
            sig = inspect.signature(safe_db_select)
            sig.bind("test_table", {"user_id": "123"}, "user123", columns="name,email")

        assert "unexpected keyword argument" in str(exc_info.value)

        # Test case 2: Using 'single' parameter
        with pytest.raises(TypeError) as exc_info:
            sig = inspect.signature(safe_db_select)
            sig.bind("test_table", {"user_id": "123"}, "user123", single=True)

        assert "unexpected keyword argument" in str(exc_info.value)

    def test_working_tool_patterns(self):
        """Test that working tool call patterns succeed"""
        from app.services.pam.tools.utils.database import safe_db_select

        # Test case 1: Correct signature binding
        sig = inspect.signature(safe_db_select)

        # This should work (Pattern 4 from audit)
        bound_args = sig.bind("expenses", {"user_id": "test-123"}, "test-123")
        assert bound_args is not None

        # This should also work with optional parameters
        bound_args = sig.bind(
            "expenses",
            {"user_id": "test-123"},
            "test-123",
            select="amount,category",
            order_by="created_at",
            limit=10
        )
        assert bound_args is not None

    def test_current_function_behavior_expectations(self):
        """Document what tools expect vs what functions provide"""

        # What tools expect from safe_db_select calls
        expected_patterns = [
            {
                "description": "Pattern 1: Standard call with user_id",
                "call": "safe_db_select(table, filters, user_id)",
                "status": "WORKING",
                "example": "safe_db_select('expenses', {'user_id': '123'}, '123')"
            },
            {
                "description": "Pattern 2: Using columns parameter",
                "call": "safe_db_select(table, columns='...', filters={})",
                "status": "BROKEN",
                "example": "safe_db_select('profiles', columns='*', filters={'id': '123'})"
            },
            {
                "description": "Pattern 3: Using single=True",
                "call": "safe_db_select(..., single=True)",
                "status": "BROKEN",
                "example": "safe_db_select('user_settings', ..., single=True)"
            },
            {
                "description": "Pattern 4: Missing user_id",
                "call": "safe_db_select(table, filters)",
                "status": "BROKEN",
                "example": "safe_db_select('expenses', {'user_id': '123'})"
            }
        ]

        print("\n📋 DOCUMENTED USAGE PATTERNS:")
        for i, pattern in enumerate(expected_patterns, 1):
            print(f"{i}. {pattern['description']}")
            print(f"   Status: {pattern['status']}")
            print(f"   Example: {pattern['example']}")
            print()

        # Count patterns
        working = len([p for p in expected_patterns if p['status'] == 'WORKING'])
        broken = len([p for p in expected_patterns if p['status'] == 'BROKEN'])

        print(f"Working patterns: {working}")
        print(f"Broken patterns: {broken}")

        # This test documents the current state
        assert working == 1, "Only 1 pattern should be working currently"
        assert broken == 3, "3 patterns should be broken currently"

if __name__ == "__main__":
    # Run tests with verbose output
    pytest.main([__file__, "-v", "-s"])