"""GitHub: Get File Contents"""

from typing import TypedDict, Optional
from ...client import call_mcp_tool


class GetFileContentsInput(TypedDict, total=False):
    """Input for getting file contents from GitHub"""
    owner: str  # Repository owner
    repo: str  # Repository name
    path: str  # File path
    branch: Optional[str]  # Branch name (optional)


class GetFileContentsResponse(TypedDict):
    """Response from getting file contents"""
    content: str  # File content (decoded)
    sha: str  # File SHA
    size: int  # File size in bytes
    name: str  # File name
    path: str  # Full file path


async def get_file_contents(input_data: GetFileContentsInput) -> GetFileContentsResponse:
    """
    Get contents of a file from a GitHub repository

    Args:
        input_data: File retrieval parameters

    Returns:
        File contents and metadata

    Example:
        >>> file = await get_file_contents({
        ...     'owner': 'myorg',
        ...     'repo': 'myrepo',
        ...     'path': 'src/config.json'
        ... })
        >>> config = json.loads(file['content'])
    """
    return await call_mcp_tool(
        'mcp__github__get_file_contents',
        input_data,
        GetFileContentsResponse
    )
