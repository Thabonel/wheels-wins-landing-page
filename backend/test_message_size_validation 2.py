#!/usr/bin/env python3
"""
Test script for PAM Message Size Validation System

This script tests the advanced message size validation functionality to ensure it works correctly.
Run with: python test_message_size_validation.py
"""

import asyncio
import json
import random
import string
from datetime import datetime
from app.middleware.message_size_validator import (
    MessageSizeValidator,
    MessageType,
    MessageSizeConfig,
    validate_websocket_message,
    validate_rest_api_message,
    validate_voice_text,
    validate_feedback_message,
    validate_context_data,
    message_validator
)

def generate_text(length: int) -> str:
    """Generate random text of specified length"""
    return ''.join(random.choices(string.ascii_letters + string.digits + ' ', k=length))

def generate_large_dict(target_size_bytes: int) -> dict:
    """Generate a dictionary that will serialize to approximately target_size_bytes"""
    base_dict = {
        "type": "test",
        "user_id": "test_user_123",
        "timestamp": datetime.now().isoformat()
    }
    
    # Add data to reach target size
    current_size = len(json.dumps(base_dict).encode('utf-8'))
    remaining_size = max(0, target_size_bytes - current_size - 100)  # Leave some margin
    
    if remaining_size > 0:
        base_dict["large_content"] = generate_text(remaining_size // 2)  # Divide by ~2 for JSON overhead
    
    return base_dict

async def test_basic_message_validation():
    """Test basic message size validation functionality"""
    print("🧪 Testing Basic Message Validation...")
    
    validator = MessageSizeValidator()
    
    # Test small valid message
    small_message = {"type": "test", "message": "Hello, world!"}
    result = validator.validate_message(small_message, MessageType.WEBSOCKET_JSON)
    print(f"  Small message: {'✅ VALID' if result.valid else '❌ INVALID'} - Size: {validator._format_bytes(result.size_bytes)}")
    
    # Test message at limit
    config = MessageSizeConfig()
    limit_bytes = config.LIMITS[MessageType.WEBSOCKET_JSON]
    large_message = generate_large_dict(limit_bytes - 100)  # Just under limit
    result = validator.validate_message(large_message, MessageType.WEBSOCKET_JSON)
    print(f"  At-limit message: {'✅ VALID' if result.valid else '❌ INVALID'} - Size: {validator._format_bytes(result.size_bytes)}")
    
    # Test oversized message
    oversized_message = generate_large_dict(limit_bytes + 1000)  # Over limit
    result = validator.validate_message(oversized_message, MessageType.WEBSOCKET_JSON)
    print(f"  Oversized message: {'✅ VALID' if result.valid else '❌ INVALID'} - Size: {validator._format_bytes(result.size_bytes)}")
    print(f"    Reason: {result.reason}")
    
    print("✅ Basic message validation test completed\n")

async def test_different_message_types():
    """Test validation for different message types"""
    print("🧪 Testing Different Message Types...")
    
    validator = MessageSizeValidator()
    config = MessageSizeConfig()
    
    message_types = [
        (MessageType.WEBSOCKET_TEXT, "WebSocket Text"),
        (MessageType.WEBSOCKET_JSON, "WebSocket JSON"),
        (MessageType.REST_API_CHAT, "REST API Chat"),
        (MessageType.VOICE_SYNTHESIS, "Voice Synthesis"),
        (MessageType.FEEDBACK, "Feedback"),
        (MessageType.CONTEXT_DATA, "Context Data")
    ]
    
    for msg_type, description in message_types:
        print(f"\n  Testing {description}:")
        limit = config.LIMITS[msg_type]
        print(f"    Limit: {validator._format_bytes(limit)}")
        
        # Test valid message (80% of limit)
        target_size = int(limit * 0.8)
        if msg_type in [MessageType.WEBSOCKET_TEXT]:
            test_message = generate_text(target_size)
        else:
            test_message = generate_large_dict(target_size)
        
        result = validator.validate_message(test_message, msg_type)
        print(f"    Valid message: {'✅ PASS' if result.valid else '❌ FAIL'} - {validator._format_bytes(result.size_bytes)}")
        
        # Test invalid message (120% of limit)
        target_size = int(limit * 1.2)
        if msg_type in [MessageType.WEBSOCKET_TEXT]:
            test_message = generate_text(target_size)
        else:
            test_message = generate_large_dict(target_size)
        
        result = validator.validate_message(test_message, msg_type)
        print(f"    Invalid message: {'✅ PASS' if not result.valid else '❌ FAIL'} - {validator._format_bytes(result.size_bytes)}")
    
    print("\n✅ Different message types test completed\n")

async def test_field_validation():
    """Test individual field validation"""
    print("🧪 Testing Field Validation...")
    
    validator = MessageSizeValidator()
    config = MessageSizeConfig()
    
    # Test valid fields
    valid_message = {
        "type": "test",
        "message": "A reasonable message",
        "title": "Short title",
        "description": "A reasonable description",
        "user_id": "user_123"
    }
    
    result = validator.validate_message(valid_message, MessageType.WEBSOCKET_JSON)
    print(f"  Valid fields: {'✅ PASS' if result.valid else '❌ FAIL'}")
    
    # Test oversized individual fields
    invalid_message = {
        "type": "test",
        "message": generate_text(config.FIELD_LIMITS["message"] + 100),  # Over limit
        "title": generate_text(config.FIELD_LIMITS["title"] + 10),  # Over limit
        "description": "OK description",
        "user_id": "user_123"
    }
    
    result = validator.validate_message(invalid_message, MessageType.WEBSOCKET_JSON)
    print(f"  Invalid fields: {'✅ PASS' if not result.valid else '❌ FAIL'}")
    if result.field_violations:
        print(f"    Field violations: {len(result.field_violations)}")
        for field, violation in result.field_violations.items():
            print(f"      {field}: {violation}")
    
    print("✅ Field validation test completed\n")

async def test_text_content_validation():
    """Test text content validation with character limits"""
    print("🧪 Testing Text Content Validation...")
    
    validator = MessageSizeValidator()
    config = MessageSizeConfig()
    
    # Test voice synthesis character limits
    voice_limit = config.CHARACTER_LIMITS[MessageType.VOICE_SYNTHESIS]
    print(f"  Voice synthesis character limit: {voice_limit}")
    
    # Valid text
    valid_text = generate_text(voice_limit - 100)
    result = validator.validate_text_content(valid_text, MessageType.VOICE_SYNTHESIS)
    print(f"    Valid text: {'✅ PASS' if result.valid else '❌ FAIL'} - {len(valid_text)} chars")
    
    # Invalid text (too long)
    invalid_text = generate_text(voice_limit + 100)
    result = validator.validate_text_content(invalid_text, MessageType.VOICE_SYNTHESIS)
    print(f"    Invalid text: {'✅ PASS' if not result.valid else '❌ FAIL'} - {len(invalid_text)} chars")
    print(f"      Reason: {result.reason}")
    
    print("✅ Text content validation test completed\n")

async def test_convenience_functions():
    """Test convenience validation functions"""
    print("🧪 Testing Convenience Functions...")
    
    # Test WebSocket validation
    ws_message = {"type": "chat", "message": "Hello WebSocket!"}
    result = await validate_websocket_message(ws_message, "test_user")
    print(f"  WebSocket validation: {'✅ PASS' if result.valid else '❌ FAIL'}")
    
    # Test REST API validation
    rest_message = {"message": "Hello REST API!", "context": {}}
    result = await validate_rest_api_message(rest_message, "test_user")
    print(f"  REST API validation: {'✅ PASS' if result.valid else '❌ FAIL'}")
    
    # Test voice text validation
    voice_text = "This is text for voice synthesis."
    result = await validate_voice_text(voice_text, "test_user")
    print(f"  Voice text validation: {'✅ PASS' if result.valid else '❌ FAIL'}")
    
    # Test feedback validation
    feedback_message = {
        "message_id": "msg_123",
        "rating": 5,
        "feedback_text": "Great response!"
    }
    result = await validate_feedback_message(feedback_message, "test_user")
    print(f"  Feedback validation: {'✅ PASS' if result.valid else '❌ FAIL'}")
    
    # Test context data validation
    context_data = {
        "user_location": {"lat": 40.7128, "lng": -74.0060},
        "session_id": "session_123"
    }
    result = await validate_context_data(context_data, "test_user")
    print(f"  Context data validation: {'✅ PASS' if result.valid else '❌ FAIL'}")
    
    print("✅ Convenience functions test completed\n")

async def test_statistics_tracking():
    """Test validation statistics tracking"""
    print("🧪 Testing Statistics Tracking...")
    
    validator = MessageSizeValidator()
    initial_stats = validator.get_statistics()
    print(f"  Initial validations: {initial_stats['total_validations']}")
    
    # Perform several validations
    test_messages = [
        {"type": "test1", "message": "Small message"},
        generate_large_dict(50000),  # Medium message
        generate_large_dict(200000),  # Large message (should fail)
        {"type": "test2", "message": generate_text(10000)},  # Long message
    ]
    
    for i, msg in enumerate(test_messages):
        result = validator.validate_message(msg, MessageType.WEBSOCKET_JSON)
        print(f"    Message {i+1}: {'✅ VALID' if result.valid else '❌ INVALID'}")
    
    final_stats = validator.get_statistics()
    print(f"  Final validations: {final_stats['total_validations']}")
    print(f"  Size violations: {final_stats['size_violations']}")
    print(f"  Largest message seen: {validator._format_bytes(final_stats['largest_message_seen'])}")
    
    print("✅ Statistics tracking test completed\n")

async def test_edge_cases():
    """Test edge cases and error conditions"""
    print("🧪 Testing Edge Cases...")
    
    validator = MessageSizeValidator()
    
    # Test empty message
    result = validator.validate_message("", MessageType.WEBSOCKET_TEXT)
    print(f"  Empty string: {'✅ PASS' if result.valid else '❌ FAIL'}")
    
    # Test empty dict
    result = validator.validate_message({}, MessageType.WEBSOCKET_JSON)
    print(f"  Empty dict: {'✅ PASS' if result.valid else '❌ FAIL'}")
    
    # Test None values
    result = validator.validate_message(None, MessageType.WEBSOCKET_JSON)
    print(f"  None value: {'✅ PASS' if result.valid else '❌ FAIL'}")
    
    # Test bytes input
    result = validator.validate_message(b"Hello bytes", MessageType.WEBSOCKET_TEXT)
    print(f"  Bytes input: {'✅ PASS' if result.valid else '❌ FAIL'}")
    
    # Test complex nested structures
    nested_dict = {
        "level1": {
            "level2": {
                "level3": {
                    "data": generate_text(5000)
                }
            }
        }
    }
    result = validator.validate_message(nested_dict, MessageType.WEBSOCKET_JSON)
    print(f"  Nested structures: {'✅ PASS' if result.valid else '❌ FAIL'}")
    
    # Test non-string, non-dict input
    result = validator.validate_message(12345, MessageType.WEBSOCKET_JSON)
    print(f"  Number input: {'✅ PASS' if result.valid else '❌ FAIL'}")
    
    print("✅ Edge cases test completed\n")

async def performance_test():
    """Test performance with many validations"""
    print("🧪 Running Performance Test...")
    
    validator = MessageSizeValidator()
    
    import time
    start_time = time.time()
    
    # Test 1000 validations
    for i in range(1000):
        test_message = {
            "type": "performance_test",
            "message": f"Performance test message #{i}",
            "data": generate_text(100)
        }
        validator.validate_message(test_message, MessageType.WEBSOCKET_JSON)
    
    end_time = time.time()
    duration = end_time - start_time
    
    print(f"  Processed 1000 validations in {duration:.3f} seconds")
    print(f"  Average: {1000/duration:.1f} validations/second")
    
    final_stats = validator.get_statistics()
    print(f"  Total validations: {final_stats['total_validations']}")
    print(f"  Size violations: {final_stats['size_violations']}")
    
    print("✅ Performance test completed\n")

async def main():
    """Run all tests"""
    print("🚀 Starting PAM Message Size Validation Tests\n")
    print("=" * 70)
    
    try:
        await test_basic_message_validation()
        await test_different_message_types()
        await test_field_validation()
        await test_text_content_validation()
        await test_convenience_functions()
        await test_statistics_tracking()
        await test_edge_cases()
        await performance_test()
        
        print("=" * 70)
        print("🎉 All message size validation tests completed successfully!")
        
        # Show final global stats
        print("\n📊 Final Global Statistics:")
        global_stats = message_validator.get_statistics()
        print(f"  Total validations: {global_stats['total_validations']}")
        print(f"  Size violations: {global_stats['size_violations']}")
        print(f"  Field violations: {global_stats['field_violations']}")
        print(f"  Largest message seen: {message_validator._format_bytes(global_stats['largest_message_seen'])}")
        
        print("\n📏 Message Size Limits:")
        for msg_type, limit_info in global_stats['message_limits'].items():
            print(f"  {msg_type}: {limit_info['formatted_limit']}")
            
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())