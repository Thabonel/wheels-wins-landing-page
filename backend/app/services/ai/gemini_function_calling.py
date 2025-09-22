"""
Gemini Function Calling Implementation
Handles function calling for Google Gemini models using native function_declarations format.
Converts OpenAI tool format to Gemini format and executes function calls.
"""

import json
import logging
from typing import Dict, List, Any, Optional, Union, Tuple
from dataclasses import dataclass

# Safe import of Google Generative AI
try:
    import google.generativeai as genai
    from google.generativeai.types import FunctionDeclaration, Tool
    GEMINI_AVAILABLE = True
except ImportError:
    logging.warning("Google Generative AI package not available for function calling")
    GEMINI_AVAILABLE = False
    genai = None
    FunctionDeclaration = None
    Tool = None

logger = logging.getLogger(__name__)


@dataclass
class FunctionCallResult:
    """Result of a function call execution"""
    function_name: str
    success: bool
    result: Any
    error: Optional[str] = None
    execution_time_ms: float = 0.0


class GeminiFunctionCallHandler:
    """
    Handles function calling for Gemini models by converting OpenAI tools
    to Gemini function_declarations and executing function calls.
    """

    def __init__(self, tool_registry=None):
        if not GEMINI_AVAILABLE:
            raise RuntimeError("Google Generative AI package not available. Install with: pip install google-generativeai")

        self.tool_registry = tool_registry
        self.function_map: Dict[str, Any] = {}  # Maps function names to execution objects

    def convert_openai_tools_to_gemini(self, openai_tools: List[Dict[str, Any]]) -> List[Tool]:
        """
        Convert OpenAI function definitions to Gemini function_declarations format.

        Args:
            openai_tools: List of OpenAI tool definitions

        Returns:
            List of Gemini Tool objects with function_declarations
        """
        if not openai_tools:
            return []

        function_declarations = []

        for tool in openai_tools:
            try:
                # Extract function definition from OpenAI format
                function_def = tool.get("function", tool)  # Support both formats

                name = function_def.get("name")
                description = function_def.get("description", "")
                parameters = function_def.get("parameters", {})

                if not name:
                    logger.warning(f"Skipping tool without name: {tool}")
                    continue

                # Convert OpenAI parameters to Gemini format
                gemini_parameters = self._convert_parameters_to_gemini(parameters)

                # Create Gemini FunctionDeclaration
                function_declaration = FunctionDeclaration(
                    name=name,
                    description=description,
                    parameters=gemini_parameters
                )

                function_declarations.append(function_declaration)
                logger.debug(f"✅ Converted function: {name}")

            except Exception as e:
                logger.error(f"❌ Failed to convert tool {tool.get('name', 'unknown')}: {e}")
                continue

        # Wrap function declarations in Tool objects
        if function_declarations:
            tools = [Tool(function_declarations=function_declarations)]
            logger.info(f"🔧 Converted {len(function_declarations)} OpenAI tools to Gemini format")
            return tools

        return []

    def _convert_parameters_to_gemini(self, openai_params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Convert OpenAI parameter schema to Gemini format.

        OpenAI format: {"type": "object", "properties": {...}, "required": [...]}
        Gemini format: {"type": "object", "properties": {...}, "required": [...]}
        (They're similar but may need adjustments)
        """
        if not openai_params:
            return {"type": "object", "properties": {}}

        # Gemini generally accepts the same JSON Schema format as OpenAI
        gemini_params = {
            "type": openai_params.get("type", "object"),
            "properties": {}
        }

        # Convert properties
        properties = openai_params.get("properties", {})
        for prop_name, prop_def in properties.items():
            gemini_params["properties"][prop_name] = self._convert_property_to_gemini(prop_def)

        # Add required fields
        if "required" in openai_params:
            gemini_params["required"] = openai_params["required"]

        return gemini_params

    def _convert_property_to_gemini(self, prop_def: Dict[str, Any]) -> Dict[str, Any]:
        """Convert individual property definition to Gemini format"""
        gemini_prop = {
            "type": prop_def.get("type", "string"),
            "description": prop_def.get("description", "")
        }

        # Handle enum values
        if "enum" in prop_def:
            gemini_prop["enum"] = prop_def["enum"]

        # Handle array items
        if prop_def.get("type") == "array" and "items" in prop_def:
            gemini_prop["items"] = self._convert_property_to_gemini(prop_def["items"])

        # Handle number constraints
        if "minimum" in prop_def:
            gemini_prop["minimum"] = prop_def["minimum"]
        if "maximum" in prop_def:
            gemini_prop["maximum"] = prop_def["maximum"]

        # Handle string format
        if "format" in prop_def:
            gemini_prop["format"] = prop_def["format"]

        return gemini_prop

    def extract_function_calls(self, response) -> List[Dict[str, Any]]:
        """
        Extract function calls from Gemini response.

        Args:
            response: Gemini response object

        Returns:
            List of function call dictionaries
        """
        function_calls = []

        try:
            # Check if response has function calls
            if hasattr(response, 'candidates') and response.candidates:
                for candidate in response.candidates:
                    if hasattr(candidate, 'content') and hasattr(candidate.content, 'parts'):
                        for part in candidate.content.parts:
                            if hasattr(part, 'function_call'):
                                function_call = part.function_call

                                # Extract function call details
                                call_info = {
                                    "name": function_call.name,
                                    "arguments": dict(function_call.args) if function_call.args else {}
                                }

                                function_calls.append(call_info)
                                logger.info(f"🔧 Extracted function call: {call_info['name']}")

        except Exception as e:
            logger.error(f"❌ Failed to extract function calls: {e}")

        return function_calls

    async def execute_function_call(
        self,
        function_name: str,
        arguments: Dict[str, Any],
        user_id: str
    ) -> FunctionCallResult:
        """
        Execute a function call using the tool registry.

        Args:
            function_name: Name of the function to call
            arguments: Function arguments
            user_id: User ID for context

        Returns:
            Function call execution result
        """
        import time
        start_time = time.time()

        try:
            if not self.tool_registry:
                return FunctionCallResult(
                    function_name=function_name,
                    success=False,
                    result=None,
                    error="Tool registry not available"
                )

            # Execute the tool through the registry
            result = await self.tool_registry.execute_tool(
                tool_name=function_name,
                user_id=user_id,
                parameters=arguments
            )

            execution_time = (time.time() - start_time) * 1000

            if result.success:
                logger.info(f"✅ Function {function_name} executed successfully")
                return FunctionCallResult(
                    function_name=function_name,
                    success=True,
                    result=result.result,
                    execution_time_ms=execution_time
                )
            else:
                logger.error(f"❌ Function {function_name} failed: {result.error}")
                return FunctionCallResult(
                    function_name=function_name,
                    success=False,
                    result=None,
                    error=result.error,
                    execution_time_ms=execution_time
                )

        except Exception as e:
            execution_time = (time.time() - start_time) * 1000
            error_msg = f"Function execution error: {str(e)}"
            logger.error(f"❌ {error_msg}")

            return FunctionCallResult(
                function_name=function_name,
                success=False,
                result=None,
                error=error_msg,
                execution_time_ms=execution_time
            )

    def create_function_response_parts(self, function_results: List[FunctionCallResult]) -> List[Dict[str, Any]]:
        """
        Create function response parts for Gemini conversation continuation.

        Args:
            function_results: List of function execution results

        Returns:
            List of response parts in Gemini format
        """
        response_parts = []

        for result in function_results:
            try:
                # Create function response part
                function_response = {
                    "function_response": {
                        "name": result.function_name,
                        "response": {
                            "success": result.success,
                            "result": result.result,
                            "error": result.error,
                            "execution_time_ms": result.execution_time_ms
                        }
                    }
                }

                response_parts.append(function_response)

            except Exception as e:
                logger.error(f"❌ Failed to create function response for {result.function_name}: {e}")
                # Create error response
                error_response = {
                    "function_response": {
                        "name": result.function_name,
                        "response": {
                            "success": False,
                            "error": f"Failed to format response: {str(e)}"
                        }
                    }
                }
                response_parts.append(error_response)

        return response_parts

    async def handle_function_calling_conversation(
        self,
        model,
        messages: List[Dict[str, Any]],
        tools: List[Tool],
        user_id: str,
        max_function_calls: int = 10
    ) -> Tuple[str, List[FunctionCallResult]]:
        """
        Handle a complete function-calling conversation with Gemini.

        Args:
            model: Gemini model instance
            messages: Conversation messages
            tools: Available tools for function calling
            user_id: User ID for tool execution context
            max_function_calls: Maximum number of function calls to prevent loops

        Returns:
            Tuple of (final_response_text, list_of_function_results)
        """
        all_function_results = []
        function_call_count = 0

        try:
            # Start conversation with tools
            if tools:
                # Convert messages to conversation format
                conversation_parts = []
                for msg in messages:
                    if msg.get("role") == "user":
                        conversation_parts.append({"role": "user", "parts": [msg["content"]]})
                    elif msg.get("role") == "assistant":
                        conversation_parts.append({"role": "model", "parts": [msg["content"]]})

                # Start chat with history and tools
                chat = model.start_chat(
                    history=conversation_parts[:-1] if len(conversation_parts) > 1 else [],
                    tools=tools
                )

                # Send the latest user message
                latest_message = conversation_parts[-1]["parts"][0] if conversation_parts else ""
                response = chat.send_message(latest_message)
            else:
                # No tools available, regular chat
                response = model.generate_content(messages[-1]["content"])

            # Process function calls in a loop
            while function_call_count < max_function_calls:
                # Check for function calls in response
                function_calls = self.extract_function_calls(response)

                if not function_calls:
                    # No more function calls, return final response
                    break

                # Execute all function calls
                function_results = []
                for call in function_calls:
                    result = await self.execute_function_call(
                        function_name=call["name"],
                        arguments=call["arguments"],
                        user_id=user_id
                    )
                    function_results.append(result)
                    all_function_results.append(result)

                function_call_count += len(function_calls)

                # Create function response parts
                response_parts = self.create_function_response_parts(function_results)

                # Send function results back to model
                if tools and hasattr(chat, 'send_message'):
                    response = chat.send_message(response_parts)
                else:
                    # Can't continue without chat context
                    break

            # Extract final response text
            final_text = ""
            if hasattr(response, 'text') and response.text:
                final_text = response.text
            elif hasattr(response, 'candidates') and response.candidates:
                for candidate in response.candidates:
                    if hasattr(candidate, 'content') and hasattr(candidate.content, 'parts'):
                        for part in candidate.content.parts:
                            if hasattr(part, 'text'):
                                final_text += part.text

            if function_call_count >= max_function_calls:
                logger.warning(f"⚠️ Reached maximum function calls limit: {max_function_calls}")
                if not final_text:
                    final_text = "I've used several tools to help with your request. Let me know if you need anything else!"

            return final_text, all_function_results

        except Exception as e:
            logger.error(f"❌ Function calling conversation failed: {e}")
            return f"I encountered an error while processing your request: {str(e)}", all_function_results


def get_gemini_function_handler(tool_registry=None) -> GeminiFunctionCallHandler:
    """
    Factory function to create a Gemini function call handler.

    Args:
        tool_registry: Tool registry for function execution

    Returns:
        GeminiFunctionCallHandler instance
    """
    return GeminiFunctionCallHandler(tool_registry=tool_registry)


# Example usage:
"""
# Initialize handler
handler = get_gemini_function_handler(tool_registry)

# Convert OpenAI tools to Gemini format
openai_tools = [
    {
        "name": "get_weather",
        "description": "Get current weather for a location",
        "parameters": {
            "type": "object",
            "properties": {
                "location": {"type": "string", "description": "Location name"}
            },
            "required": ["location"]
        }
    }
]

gemini_tools = handler.convert_openai_tools_to_gemini(openai_tools)

# Handle function calling conversation
messages = [{"role": "user", "content": "What's the weather in Sydney?"}]
response_text, function_results = await handler.handle_function_calling_conversation(
    model=gemini_model,
    messages=messages,
    tools=gemini_tools,
    user_id="user123"
)
"""