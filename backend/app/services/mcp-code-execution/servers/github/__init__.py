"""
GitHub MCP Server Wrappers

This module provides typed Python wrappers for GitHub MCP tools.
Each function corresponds to an MCP tool and provides type safety.
"""

from .create_issue import create_issue, CreateIssueInput, CreateIssueResponse
from .get_file_contents import get_file_contents, GetFileContentsInput, GetFileContentsResponse
from .create_pull_request import create_pull_request, CreatePullRequestInput, CreatePullRequestResponse
from .push_files import push_files, PushFilesInput, PushFilesResponse
from .search_repositories import search_repositories, SearchRepositoriesInput, SearchRepositoriesResponse

__all__ = [
    'create_issue',
    'CreateIssueInput',
    'CreateIssueResponse',
    'get_file_contents',
    'GetFileContentsInput',
    'GetFileContentsResponse',
    'create_pull_request',
    'CreatePullRequestInput',
    'CreatePullRequestResponse',
    'push_files',
    'PushFilesInput',
    'PushFilesResponse',
    'search_repositories',
    'SearchRepositoriesInput',
    'SearchRepositoriesResponse',
]
