"""GitHub: Create Issue"""

from typing import TypedDict, Optional, List
from ...client import call_mcp_tool


class CreateIssueInput(TypedDict, total=False):
    """Input for creating a GitHub issue"""
    owner: str  # Repository owner
    repo: str  # Repository name
    title: str  # Issue title
    body: Optional[str]  # Issue body
    assignees: Optional[List[str]]  # Assignee usernames
    labels: Optional[List[str]]  # Label names
    milestone: Optional[int]  # Milestone number


class CreateIssueResponse(TypedDict):
    """Response from creating a GitHub issue"""
    number: int  # Issue number
    url: str  # Issue HTML URL
    state: str  # Issue state (open/closed)


async def create_issue(input_data: CreateIssueInput) -> CreateIssueResponse:
    """
    Create a new issue in a GitHub repository

    Args:
        input_data: Issue creation parameters

    Returns:
        Created issue details

    Example:
        >>> issue = await create_issue({
        ...     'owner': 'myorg',
        ...     'repo': 'myrepo',
        ...     'title': 'Bug: Login not working',
        ...     'labels': ['bug', 'high-priority']
        ... })
        >>> print(f"Created issue #{issue['number']}")
    """
    return await call_mcp_tool(
        'mcp__github__create_issue',
        input_data,
        CreateIssueResponse
    )
