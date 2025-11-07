"""GitHub: Create Pull Request"""

from typing import TypedDict, Optional
from ...client import call_mcp_tool


class CreatePullRequestInput(TypedDict, total=False):
    """Input for creating a pull request"""
    owner: str  # Repository owner
    repo: str  # Repository name
    title: str  # PR title
    head: str  # Branch containing changes
    base: str  # Branch to merge into
    body: Optional[str]  # PR description
    draft: Optional[bool]  # Create as draft PR


class CreatePullRequestResponse(TypedDict):
    """Response from creating a pull request"""
    number: int  # PR number
    url: str  # PR HTML URL
    state: str  # PR state
    merged: bool  # Whether PR is merged


async def create_pull_request(input_data: CreatePullRequestInput) -> CreatePullRequestResponse:
    """
    Create a pull request in a GitHub repository

    Args:
        input_data: Pull request parameters

    Returns:
        Created pull request details

    Example:
        >>> pr = await create_pull_request({
        ...     'owner': 'myorg',
        ...     'repo': 'myrepo',
        ...     'title': 'Add new feature',
        ...     'head': 'feature-branch',
        ...     'base': 'main'
        ... })
        >>> print(f"Created PR #{pr['number']}")
    """
    return await call_mcp_tool(
        'mcp__github__create_pull_request',
        input_data,
        CreatePullRequestResponse
    )
