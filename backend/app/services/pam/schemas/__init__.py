"""
Pydantic validation schemas for PAM tools

Amendment #4: Input validation with Pydantic models (Week 1 Day 4-5)

Purpose:
- Runtime input validation
- Type safety
- Clear error messages
- Prevent invalid data from reaching tools
"""

from app.services.pam.schemas.base import BaseToolInput
from app.services.pam.schemas.budget import (
    CreateExpenseInput,
    UpdateBudgetInput,
    GetSpendingSummaryInput,
    CompareVsBudgetInput,
    PredictEndOfMonthInput,
)
from app.services.pam.schemas.trip import (
    PlanTripInput,
    FindRVParksInput,
    GetWeatherForecastInput,
    CalculateGasCostInput,
    FindCheapGasInput,
    OptimizeRouteInput,
)
from app.services.pam.schemas.social import (
    CreatePostInput,
    MessageFriendInput,
    FindNearbyRVersInput,
    SearchPostsInput,
    GetFeedInput,
    CommentOnPostInput,
    LikePostInput,
    FollowUserInput,
    ShareLocationInput,
    CreateEventInput,
)
from app.services.pam.schemas.profile import (
    UpdateProfileInput,
    UpdateSettingsInput,
    ManagePrivacyInput,
    GetUserStatsInput,
    ExportDataInput,
    CreateVehicleInput,
)
from app.services.pam.schemas.admin import (
    AddKnowledgeInput,
    SearchKnowledgeInput,
)
from app.services.pam.schemas.community import (
    SearchCommunityTipsInput,
    LogTipUsageInput,
    GetTipByIdInput,
    SubmitCommunityTipInput,
    GetUserTipsInput,
)

__all__ = [
    "BaseToolInput",
    # Budget schemas
    "CreateExpenseInput",
    "UpdateBudgetInput",
    "GetSpendingSummaryInput",
    "CompareVsBudgetInput",
    "PredictEndOfMonthInput",
    # Trip schemas
    "PlanTripInput",
    "FindRVParksInput",
    "GetWeatherForecastInput",
    "CalculateGasCostInput",
    "FindCheapGasInput",
    "OptimizeRouteInput",
    # Social schemas
    "CreatePostInput",
    "MessageFriendInput",
    "FindNearbyRVersInput",
    "SearchPostsInput",
    "GetFeedInput",
    "CommentOnPostInput",
    "LikePostInput",
    "FollowUserInput",
    "ShareLocationInput",
    "CreateEventInput",
    # Profile schemas
    "UpdateProfileInput",
    "UpdateSettingsInput",
    "ManagePrivacyInput",
    "GetUserStatsInput",
    "ExportDataInput",
    "CreateVehicleInput",
    # Admin schemas
    "AddKnowledgeInput",
    "SearchKnowledgeInput",
    # Community schemas
    "SearchCommunityTipsInput",
    "LogTipUsageInput",
    "GetTipByIdInput",
    "SubmitCommunityTipInput",
    "GetUserTipsInput",
]
