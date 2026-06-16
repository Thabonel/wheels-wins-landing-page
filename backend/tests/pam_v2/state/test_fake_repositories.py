"""
Repository contract tests run against the fake (in-memory) implementations.
"""

import pytest

from app.services.pam_v2.state.fake import (
    FakeApprovalRepository,
    FakeCompactSummaryRepository,
    FakeConversationRepository,
)
from tests.pam_v2.state.contracts import (
    ApprovalRepositoryContractTests,
    CompactSummaryRepositoryContractTests,
    ConversationRepositoryContractTests,
)


class TestFakeConversationRepository(ConversationRepositoryContractTests):
    @pytest.fixture
    def repo(self):
        return FakeConversationRepository()


class TestFakeApprovalRepository(ApprovalRepositoryContractTests):
    @pytest.fixture
    def repo(self):
        return FakeApprovalRepository()


class TestFakeCompactSummaryRepository(CompactSummaryRepositoryContractTests):
    @pytest.fixture
    def repo(self):
        return FakeCompactSummaryRepository()
