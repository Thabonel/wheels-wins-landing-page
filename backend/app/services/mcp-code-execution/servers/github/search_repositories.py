"""GitHub: Search Repositories"""

from typing import TypedDict, List, Optional
from ...client import call_mcp_tool


class Repository(TypedDict):
    """A GitHub repository"""
    name: str  # Repository name
    full_name: str  # Full name (owner/repo)
    description: Optional[str]  # Description
    url: str  # HTML URL
    stars: int  # Star count
    language: Optional[str]  # Primary language


class SearchRepositoriesInput(TypedDict, total=False):
    """Input for searching repositories"""
    query: str  # Search query
    page: Optional[int]  # Page number (default: 1)
    perPage: Optional[int]  # Results per page (default: 30, max: 100)


class SearchRepositoriesResponse(TypedDict):
    """Response from searching repositories"""
    total_count: int  # Total matching repositories
    items: List[Repository]  # Repository results


async def search_repositories(input_data: SearchRepositoriesInput) -> SearchRepositoriesResponse:
    """
    Search for GitHub repositories

    Args:
        input_data: Search parameters

    Returns:
        Search results with repositories

    Example:
        >>> results = await search_repositories({
        ...     'query': 'language:python stars:>1000',
        ...     'perPage': 10
        ... })
        >>> for repo in results['items']:
        ...     print(f"{repo['full_name']}: {repo['stars']} stars")
    """
    return await call_mcp_tool(
        'mcp__github__search_repositories',
        input_data,
        SearchRepositoriesResponse
    )
