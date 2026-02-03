"""
Dynamic Tool Templates - Template definitions for AI-generated tools
"""
from typing import Dict, Any, Optional, List
import re

from app.core.logging import get_logger

logger = get_logger(__name__)


# Tool templates with placeholders for code generation
TOOL_TEMPLATES: Dict[str, str] = {
    "api_integration": '''"""
{description}
Auto-generated API integration tool
"""
import aiohttp
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime

from app.services.pam.tools.base_tool import BaseTool, ToolResult
from app.services.pam.tools.tool_capabilities import ToolCapability
from app.core.logging import get_logger

logger = get_logger(__name__)


class {tool_name}(BaseTool):
    """
    {description}

    Auto-generated tool for external API integration.
    Approved API endpoint with rate limiting and error handling.
    """

    def __init__(self):
        super().__init__(
            tool_name="{tool_name_snake}",
            description="{description}",
            capabilities=[ToolCapability.EXTERNAL_API]
        )
        self.api_timeout = 30
        self.max_retries = 2

    async def execute(self, user_id: str, parameters: Dict[str, Any] = None) -> ToolResult:
        """Execute the API integration"""
        parameters = parameters or {{}}

        try:
            logger.info(f"Executing {tool_name_snake} for user {{user_id}}")

            # Implementation placeholder
{implementation}

            return self._create_success_result(
                data=result,
                metadata={{"user_id": user_id, "timestamp": datetime.utcnow().isoformat()}}
            )

        except aiohttp.ClientError as e:
            logger.error(f"API error in {tool_name_snake}: {{e}}")
            return self._create_error_result(f"API request failed: {{str(e)}}")
        except asyncio.TimeoutError:
            logger.error(f"Timeout in {tool_name_snake}")
            return self._create_error_result("Request timed out")
        except Exception as e:
            logger.error(f"Error in {tool_name_snake}: {{e}}")
            return self._create_error_result(f"Execution failed: {{str(e)}}")
''',

    "database_query": '''"""
{description}
Auto-generated database query tool with RLS support
"""
from typing import Dict, Any, Optional, List
from datetime import datetime

from app.services.pam.tools.base_tool import BaseTool, ToolResult
from app.services.pam.tools.tool_capabilities import ToolCapability
from app.services.database import get_database_service
from app.core.logging import get_logger

logger = get_logger(__name__)


class {tool_name}(BaseTool):
    """
    {description}

    Auto-generated tool for Supabase database queries.
    Respects RLS policies and user data isolation.
    """

    def __init__(self):
        super().__init__(
            tool_name="{tool_name_snake}",
            description="{description}",
            capabilities=[ToolCapability.USER_DATA, ToolCapability.READ]
        )
        self.db_service = None

    async def initialize(self):
        """Initialize database connection"""
        self.db_service = get_database_service()
        self.is_initialized = True
        logger.info(f"{tool_name_snake} tool initialized")

    async def execute(self, user_id: str, parameters: Dict[str, Any] = None) -> ToolResult:
        """Execute the database query"""
        parameters = parameters or {{}}

        if not self.is_initialized:
            await self.initialize()

        try:
            logger.info(f"Executing {tool_name_snake} for user {{user_id}}")

            # Implementation placeholder - always filter by user_id for RLS
{implementation}

            return self._create_success_result(
                data=result,
                metadata={{"user_id": user_id, "timestamp": datetime.utcnow().isoformat()}}
            )

        except Exception as e:
            logger.error(f"Database error in {tool_name_snake}: {{e}}")
            return self._create_error_result(f"Database query failed: {{str(e)}}")
''',

    "data_aggregation": '''"""
{description}
Auto-generated data aggregation tool
"""
from typing import Dict, Any, Optional, List
from datetime import datetime
from decimal import Decimal
import json
import math

from app.services.pam.tools.base_tool import BaseTool, ToolResult
from app.services.pam.tools.tool_capabilities import ToolCapability
from app.services.database import get_database_service
from app.core.logging import get_logger

logger = get_logger(__name__)


class {tool_name}(BaseTool):
    """
    {description}

    Auto-generated tool for data aggregation and calculations.
    Performs calculations across user datasets with proper isolation.
    """

    def __init__(self):
        super().__init__(
            tool_name="{tool_name_snake}",
            description="{description}",
            capabilities=[ToolCapability.DATA_ANALYSIS, ToolCapability.CALCULATION]
        )
        self.db_service = None

    async def initialize(self):
        """Initialize database connection"""
        self.db_service = get_database_service()
        self.is_initialized = True
        logger.info(f"{tool_name_snake} tool initialized")

    async def execute(self, user_id: str, parameters: Dict[str, Any] = None) -> ToolResult:
        """Execute the data aggregation"""
        parameters = parameters or {{}}

        if not self.is_initialized:
            await self.initialize()

        try:
            logger.info(f"Executing {tool_name_snake} for user {{user_id}}")

            # Implementation placeholder
{implementation}

            return self._create_success_result(
                data=result,
                metadata={{"user_id": user_id, "timestamp": datetime.utcnow().isoformat()}}
            )

        except Exception as e:
            logger.error(f"Aggregation error in {tool_name_snake}: {{e}}")
            return self._create_error_result(f"Data aggregation failed: {{str(e)}}")
''',

    "external_scraper": '''"""
{description}
Auto-generated external data scraper tool
"""
import aiohttp
import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime
import re

from app.services.pam.tools.base_tool import BaseTool, ToolResult
from app.services.pam.tools.tool_capabilities import ToolCapability
from app.core.logging import get_logger

logger = get_logger(__name__)


class {tool_name}(BaseTool):
    """
    {description}

    Auto-generated tool for scraping approved external websites.
    Only accesses pre-approved domains with rate limiting.
    """

    def __init__(self):
        super().__init__(
            tool_name="{tool_name_snake}",
            description="{description}",
            capabilities=[ToolCapability.WEB_SCRAPING, ToolCapability.EXTERNAL_API]
        )
        self.request_timeout = 30
        self.max_retries = 2

    async def execute(self, user_id: str, parameters: Dict[str, Any] = None) -> ToolResult:
        """Execute the web scraping"""
        parameters = parameters or {{}}

        try:
            logger.info(f"Executing {tool_name_snake} for user {{user_id}}")

            # Implementation placeholder
{implementation}

            return self._create_success_result(
                data=result,
                metadata={{"user_id": user_id, "timestamp": datetime.utcnow().isoformat()}}
            )

        except aiohttp.ClientError as e:
            logger.error(f"HTTP error in {tool_name_snake}: {{e}}")
            return self._create_error_result(f"HTTP request failed: {{str(e)}}")
        except asyncio.TimeoutError:
            logger.error(f"Timeout in {tool_name_snake}")
            return self._create_error_result("Request timed out")
        except Exception as e:
            logger.error(f"Error in {tool_name_snake}: {{e}}")
            return self._create_error_result(f"Scraping failed: {{str(e)}}")
'''
}


# Template selection keywords mapping
TEMPLATE_KEYWORDS: Dict[str, List[str]] = {
    "api_integration": [
        "api", "fetch", "request", "endpoint", "external", "service",
        "weather", "maps", "geocode", "gas", "fuel", "recreation"
    ],
    "database_query": [
        "database", "query", "fetch", "get", "retrieve", "list",
        "user data", "profile", "history", "records", "expenses", "trips"
    ],
    "data_aggregation": [
        "calculate", "sum", "average", "aggregate", "total", "count",
        "statistics", "analyze", "report", "summary", "trends"
    ],
    "external_scraper": [
        "scrape", "crawl", "extract", "website", "page", "html",
        "campground", "rv park", "reviews", "ratings"
    ]
}


class TemplateSelector:
    """
    Selects the appropriate template based on user intent and context
    """

    def __init__(self):
        self.templates = TOOL_TEMPLATES
        self.keywords = TEMPLATE_KEYWORDS
        self.logger = get_logger(__name__)

    def select_template(self, intent: str, context: Dict[str, Any] = None) -> str:
        """
        Select the best template for the given intent

        Args:
            intent: User's intent description
            context: Additional context for selection

        Returns:
            Template name (key from TOOL_TEMPLATES)
        """
        context = context or {}
        intent_lower = intent.lower()

        # Calculate scores for each template
        scores: Dict[str, int] = {}

        for template_name, keywords in self.keywords.items():
            score = 0
            for keyword in keywords:
                if keyword in intent_lower:
                    # Weight multi-word matches higher
                    score += len(keyword.split()) * 2

            # Check context for data sources
            data_sources = context.get("target_data_sources", [])
            if "supabase" in data_sources or "database" in data_sources:
                if template_name in ["database_query", "data_aggregation"]:
                    score += 5

            if "external" in data_sources or any(
                api in str(data_sources) for api in ["api", "http"]
            ):
                if template_name in ["api_integration", "external_scraper"]:
                    score += 5

            scores[template_name] = score

        # Select highest scoring template
        best_template = max(scores, key=scores.get)
        best_score = scores[best_template]

        # Default to api_integration if no strong match
        if best_score == 0:
            best_template = "api_integration"

        self.logger.info(
            f"Selected template '{best_template}' for intent (score: {best_score})",
            extra={"intent": intent[:100], "scores": scores}
        )

        return best_template

    def get_template(self, template_name: str) -> Optional[str]:
        """Get template by name"""
        return self.templates.get(template_name)

    def list_templates(self) -> List[str]:
        """List all available template names"""
        return list(self.templates.keys())

    def format_template(
        self,
        template_name: str,
        tool_name: str,
        description: str,
        implementation: str
    ) -> Optional[str]:
        """
        Format a template with the given parameters

        Args:
            template_name: Name of template to use
            tool_name: CamelCase tool class name
            description: Tool description
            implementation: Generated implementation code

        Returns:
            Formatted template code or None if template not found
        """
        template = self.get_template(template_name)
        if not template:
            return None

        # Convert CamelCase to snake_case for tool name
        tool_name_snake = self._to_snake_case(tool_name)

        # Indent implementation properly (12 spaces for class method body)
        indented_impl = self._indent_code(implementation, 12)

        return template.format(
            tool_name=tool_name,
            tool_name_snake=tool_name_snake,
            description=description,
            implementation=indented_impl
        )

    def _to_snake_case(self, name: str) -> str:
        """Convert CamelCase to snake_case"""
        # Insert underscore before uppercase letters (except at start)
        s1 = re.sub(r'(.)([A-Z][a-z]+)', r'\1_\2', name)
        return re.sub(r'([a-z0-9])([A-Z])', r'\1_\2', s1).lower()

    def _indent_code(self, code: str, spaces: int) -> str:
        """Indent code block by specified spaces"""
        indent = " " * spaces
        lines = code.split("\n")
        return "\n".join(indent + line if line.strip() else line for line in lines)


# Module-level selector instance
template_selector = TemplateSelector()


def get_template_selector() -> TemplateSelector:
    """Get the template selector instance"""
    return template_selector
