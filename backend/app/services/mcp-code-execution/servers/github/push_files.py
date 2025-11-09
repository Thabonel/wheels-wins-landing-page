"""GitHub: Push Files"""

from typing import TypedDict, List
from ...client import call_mcp_tool


class FileToPush(TypedDict):
    """A file to push to GitHub"""
    path: str  # File path in repository
    content: str  # File content


class PushFilesInput(TypedDict):
    """Input for pushing multiple files"""
    owner: str  # Repository owner
    repo: str  # Repository name
    branch: str  # Branch to push to
    files: List[FileToPush]  # Files to push
    message: str  # Commit message


class PushFilesResponse(TypedDict):
    """Response from pushing files"""
    commit_sha: str  # Commit SHA
    commit_url: str  # Commit URL


async def push_files(input_data: PushFilesInput) -> PushFilesResponse:
    """
    Push multiple files to GitHub in a single commit

    Args:
        input_data: Files and commit parameters

    Returns:
        Commit details

    Example:
        >>> result = await push_files({
        ...     'owner': 'myorg',
        ...     'repo': 'myrepo',
        ...     'branch': 'main',
        ...     'message': 'Update configs',
        ...     'files': [
        ...         {'path': 'config/app.json', 'content': '{}'},
        ...         {'path': 'config/db.json', 'content': '{}'}
        ...     ]
        ... })
        >>> print(f"Pushed commit: {result['commit_sha']}")
    """
    return await call_mcp_tool(
        'mcp__github__push_files',
        input_data,
        PushFilesResponse
    )
