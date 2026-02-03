"""
Dynamic Tool Code Generator - Uses Claude to generate tool implementations
"""
import json
import hashlib
import re
from typing import Dict, Any, Optional, List
from datetime import datetime

from app.core.logging import get_logger
from app.services.dynamic_tools.models import (
    ToolGenerationRequest,
    GeneratedToolCode,
)
from app.services.dynamic_tools.templates import get_template_selector

logger = get_logger(__name__)


# System prompt for tool generation with security constraints
TOOL_GENERATION_SYSTEM_PROMPT = """You are an expert Python developer generating secure, sandboxed tools for the PAM AI assistant system.

CRITICAL SECURITY RULES - YOU MUST FOLLOW THESE:
1. NEVER use dynamic code execution functions
2. NEVER access the filesystem directly (no open(), pathlib, os.path operations)
3. NEVER use subprocess or shell commands
4. NEVER use serialization libraries that can execute code
5. ONLY import from allowed modules: typing, datetime, json, re, math, decimal, aiohttp, pydantic
6. ALWAYS validate and sanitize all inputs
7. ALWAYS filter database queries by user_id for data isolation
8. ONLY make HTTP requests to pre-approved API domains
9. NEVER include hardcoded secrets, API keys, or credentials
10. ALWAYS handle exceptions gracefully and return proper error messages

GENERATION GUIDELINES:
1. Generate ONLY the implementation code that goes inside the method body
2. The code should be indented to fit inside a method (no leading indentation needed)
3. Always define a 'result' variable with the output data
4. Use async/await for any I/O operations
5. Log important operations using the logger
6. Include input validation at the start
7. Handle errors with try/except and return meaningful error messages

APPROVED EXTERNAL APIS:
- api.open-meteo.com (weather data)
- api.mapbox.com (geocoding, directions)
- api.recreation.gov (campgrounds, recreation)
- api.gasbuddy.com (fuel prices) - requires proxy

OUTPUT FORMAT:
Return ONLY the implementation code, no markdown formatting, no class definition.
The code will be inserted into a pre-existing tool template.

Example output:
action = parameters.get("action", "default")
location = parameters.get("location")

if not location:
    return self._create_error_result("Location is required")

# Make API request
async with aiohttp.ClientSession() as session:
    async with session.get(f"https://api.example.com/data?loc={location}") as response:
        if response.status != 200:
            return self._create_error_result(f"API error: {response.status}")
        data = await response.json()

result = {
    "data": data,
    "location": location,
    "retrieved_at": datetime.utcnow().isoformat()
}
"""


class CodeGenerator:
    """
    Generates tool code using Claude Sonnet AI
    """

    def __init__(self):
        self.template_selector = get_template_selector()
        self.claude_service = None
        self.is_initialized = False
        self.logger = get_logger(__name__)

    async def initialize(self):
        """Initialize the Claude AI service"""
        try:
            from app.services.claude_ai_service import get_claude_ai_service
            self.claude_service = get_claude_ai_service()
            self.is_initialized = True
            self.logger.info("CodeGenerator initialized with Claude service")
        except Exception as e:
            self.logger.error(f"Failed to initialize Claude service: {e}")
            raise

    async def generate_tool_code(
        self,
        request: ToolGenerationRequest
    ) -> GeneratedToolCode:
        """
        Generate tool code from a user intent

        Args:
            request: Tool generation request with intent and context

        Returns:
            GeneratedToolCode with the generated code and metadata
        """
        if not self.is_initialized:
            await self.initialize()

        try:
            # Select appropriate template
            template_name = self.template_selector.select_template(
                request.user_intent,
                request.context
            )

            # Generate tool name from intent
            tool_name = self._generate_tool_name(request.user_intent)

            # Build generation prompt
            generation_prompt = self._build_generation_prompt(request, template_name)

            self.logger.info(
                f"Generating tool code",
                extra={
                    "tool_name": tool_name,
                    "template": template_name,
                    "intent": request.user_intent[:100]
                }
            )

            # Call Claude for code generation
            implementation = await self._generate_with_claude(generation_prompt)

            if not implementation:
                return GeneratedToolCode(
                    tool_name=tool_name,
                    code="",
                    description=request.user_intent,
                    template_used=template_name,
                    generation_prompt=generation_prompt,
                    validation_passed=False,
                    validation_errors=["Failed to generate implementation code"]
                )

            # Format the complete tool code using template
            complete_code = self.template_selector.format_template(
                template_name=template_name,
                tool_name=tool_name,
                description=request.user_intent,
                implementation=implementation
            )

            if not complete_code:
                return GeneratedToolCode(
                    tool_name=tool_name,
                    code="",
                    description=request.user_intent,
                    template_used=template_name,
                    generation_prompt=generation_prompt,
                    validation_passed=False,
                    validation_errors=["Failed to format template"]
                )

            return GeneratedToolCode(
                tool_name=tool_name,
                code=complete_code,
                description=request.user_intent,
                template_used=template_name,
                generation_prompt=generation_prompt,
                validation_passed=True,  # Will be validated later by SafeCodeCompiler
                validation_errors=[]
            )

        except Exception as e:
            self.logger.error(f"Tool code generation failed: {e}")
            return GeneratedToolCode(
                tool_name="FailedTool",
                code="",
                description=request.user_intent,
                template_used="unknown",
                generation_prompt="",
                validation_passed=False,
                validation_errors=[f"Generation error: {str(e)}"]
            )

    async def generate_function_definition(
        self,
        tool_code: str,
        intent: str
    ) -> Dict[str, Any]:
        """
        Generate OpenAI function schema for the tool

        Args:
            tool_code: The generated tool code
            intent: Original user intent

        Returns:
            OpenAI function definition dictionary
        """
        if not self.is_initialized:
            await self.initialize()

        try:
            # Extract tool name from code
            tool_name_match = re.search(r'class\s+(\w+)\(BaseTool\)', tool_code)
            tool_name = tool_name_match.group(1) if tool_name_match else "dynamic_tool"

            # Convert to snake_case for function name
            snake_name = self._to_snake_case(tool_name)

            # Extract description from docstring
            docstring_match = re.search(r'"""([^"]+)"""', tool_code)
            description = docstring_match.group(1).strip() if docstring_match else intent

            # Generate parameter schema using Claude
            param_prompt = f"""Based on this tool intent, generate an OpenAI function parameters schema.

Intent: {intent}

Return a JSON object with this structure:
{{
    "type": "object",
    "properties": {{
        "parameter_name": {{
            "type": "string|number|boolean|array|object",
            "description": "Description of parameter"
        }}
    }},
    "required": ["list", "of", "required", "params"]
}}

Only return the JSON, no explanation."""

            response = await self.claude_service.generate_response(
                prompt=param_prompt,
                system_prompt="You are a JSON schema generator. Return only valid JSON.",
                max_tokens=500
            )

            # Parse the parameters JSON
            try:
                # Clean up response to get just JSON
                json_match = re.search(r'\{[\s\S]*\}', response)
                if json_match:
                    parameters = json.loads(json_match.group())
                else:
                    parameters = self._default_parameters()
            except json.JSONDecodeError:
                parameters = self._default_parameters()

            return {
                "name": snake_name,
                "description": description[:200],  # Truncate for API limits
                "parameters": parameters
            }

        except Exception as e:
            self.logger.error(f"Function definition generation failed: {e}")
            return self._default_function_definition(intent)

    def _generate_tool_name(self, intent: str) -> str:
        """Generate a CamelCase tool name from intent"""
        # Extract key words
        words = re.findall(r'\b[a-zA-Z]+\b', intent.lower())

        # Filter stop words
        stop_words = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
                      'to', 'for', 'of', 'and', 'or', 'in', 'on', 'at', 'by',
                      'with', 'from', 'that', 'this', 'it', 'as', 'can', 'could',
                      'would', 'should', 'will', 'do', 'does', 'did', 'have', 'has',
                      'me', 'my', 'i', 'we', 'you', 'your', 'tool', 'create', 'make'}

        filtered = [w for w in words if w not in stop_words and len(w) > 2]

        # Take first 3-4 meaningful words
        key_words = filtered[:4]

        if not key_words:
            # Fallback: hash the intent
            intent_hash = hashlib.md5(intent.encode()).hexdigest()[:6]
            return f"DynamicTool{intent_hash}"

        # Convert to CamelCase
        return ''.join(word.capitalize() for word in key_words) + "Tool"

    def _build_generation_prompt(
        self,
        request: ToolGenerationRequest,
        template_name: str
    ) -> str:
        """Build the prompt for Claude code generation"""
        prompt_parts = [
            f"Generate Python implementation code for the following tool requirement:",
            f"",
            f"USER INTENT: {request.user_intent}",
            f"",
            f"TEMPLATE TYPE: {template_name}",
        ]

        if request.target_data_sources:
            prompt_parts.append(f"DATA SOURCES: {', '.join(request.target_data_sources)}")

        if request.expected_output_format:
            prompt_parts.append(f"OUTPUT FORMAT: {request.expected_output_format}")

        if request.context:
            context_str = json.dumps(request.context, indent=2, default=str)
            prompt_parts.append(f"ADDITIONAL CONTEXT:\n{context_str}")

        prompt_parts.extend([
            "",
            "Remember:",
            "- Generate ONLY the implementation code (no class definition)",
            "- Define a 'result' variable with the output",
            "- Use 'parameters' dict for input",
            "- Use 'user_id' for database filtering",
            "- Handle errors with try/except",
            "- Log important operations",
        ])

        return "\n".join(prompt_parts)

    async def _generate_with_claude(self, prompt: str) -> Optional[str]:
        """Call Claude to generate the implementation code"""
        try:
            response = await self.claude_service.generate_response(
                prompt=prompt,
                system_prompt=TOOL_GENERATION_SYSTEM_PROMPT,
                max_tokens=2000
            )

            if not response:
                return None

            # Clean up the response
            # Remove markdown code blocks if present
            code = re.sub(r'^```(?:python)?\n?', '', response)
            code = re.sub(r'\n?```$', '', code)

            return code.strip()

        except Exception as e:
            self.logger.error(f"Claude generation failed: {e}")
            return None

    def _to_snake_case(self, name: str) -> str:
        """Convert CamelCase to snake_case"""
        s1 = re.sub(r'(.)([A-Z][a-z]+)', r'\1_\2', name)
        return re.sub(r'([a-z0-9])([A-Z])', r'\1_\2', s1).lower()

    def _default_parameters(self) -> Dict[str, Any]:
        """Return default parameter schema"""
        return {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "description": "Action to perform"
                }
            },
            "required": []
        }

    def _default_function_definition(self, intent: str) -> Dict[str, Any]:
        """Return default function definition"""
        tool_name = self._generate_tool_name(intent)
        snake_name = self._to_snake_case(tool_name)

        return {
            "name": snake_name,
            "description": intent[:200],
            "parameters": self._default_parameters()
        }


# Module-level instance
code_generator = CodeGenerator()


async def get_code_generator() -> CodeGenerator:
    """Get the code generator instance"""
    if not code_generator.is_initialized:
        await code_generator.initialize()
    return code_generator
