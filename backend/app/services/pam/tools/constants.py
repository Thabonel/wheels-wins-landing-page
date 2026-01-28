"""
PAM Tools Constants

Centralized configuration for magic numbers and thresholds.
"""

class ProfileConstants:
    """Constants for profile tools"""
    pass


class ShopConstants:
    """Constants for shop tools"""

    MIN_SAVINGS_TO_TRACK = 5.0
    PRICE_COMPARISON_CONFIDENCE = 0.70

    PRODUCT_DESCRIPTION_TRUNCATE_LENGTH = 200

    SEARCH_MIN_INTERNAL_RESULTS = 5
    SEARCH_FALLBACK_BASE_LIMIT = 10

    DEFAULT_SEARCH_LIMIT = 20
    DEFAULT_RECOMMENDATION_LIMIT = 10
    MAX_RESULTS_LIMIT = 100
    MIN_RESULTS_LIMIT = 1
