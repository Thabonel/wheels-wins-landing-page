# AI Slop Removal - Phase 2: Profile & Shop Tools

**Date**: January 29, 2026
**Branch**: staging

## Summary

Removed AI slop code from profile and shop tools following anti-AI-slop rules.

## Changes Made

### 1. Created Constants File

**File**: `backend/app/services/pam/tools/constants.py`

Extracted all magic numbers into a centralized constants file:

**ShopConstants**:
- `MIN_SAVINGS_TO_TRACK = 5.0` - Minimum savings amount to auto-track
- `PRICE_COMPARISON_CONFIDENCE = 0.70` - Confidence score for price comparison savings
- `PRODUCT_DESCRIPTION_TRUNCATE_LENGTH = 200` - Character limit for product descriptions
- `SEARCH_MIN_INTERNAL_RESULTS = 5` - Minimum internal results before RapidAPI fallback
- `SEARCH_FALLBACK_BASE_LIMIT = 10` - Base limit for external search results
- `DEFAULT_SEARCH_LIMIT = 20` - Default limit for product search
- `DEFAULT_RECOMMENDATION_LIMIT = 10` - Default limit for product recommendations
- `MAX_RESULTS_LIMIT = 100` - Maximum allowed results limit
- `MIN_RESULTS_LIMIT = 1` - Minimum allowed results limit

### 2. Shop Tools Refactored

#### compare_prices.py
- Replaced `5.0` with `ShopConstants.MIN_SAVINGS_TO_TRACK`
- Replaced `0.70` with `ShopConstants.PRICE_COMPARISON_CONFIDENCE`

#### get_product_details.py
- Replaced `200` with `ShopConstants.PRODUCT_DESCRIPTION_TRUNCATE_LENGTH`
- Improved variable naming for truncation length

#### recommend_products.py
- Replaced `10` with `ShopConstants.DEFAULT_RECOMMENDATION_LIMIT`
- Replaced `1` and `100` with `ShopConstants.MIN_RESULTS_LIMIT` and `ShopConstants.MAX_RESULTS_LIMIT`
- Updated error messages to use constants

#### search_products.py
- Replaced `20` with `ShopConstants.DEFAULT_SEARCH_LIMIT`
- Replaced `5` with `ShopConstants.SEARCH_MIN_INTERNAL_RESULTS`
- Replaced `10` with `ShopConstants.SEARCH_FALLBACK_BASE_LIMIT`
- Replaced `1` and `100` with `ShopConstants.MIN_RESULTS_LIMIT` and `ShopConstants.MAX_RESULTS_LIMIT`
- Removed obvious comment "External product"
- Removed obvious comment "Format to match internal product structure"

### 3. Profile Tools Refactored

#### export_data.py
- Condensed multi-line `safe_db_select` calls to single lines (improved readability)
- No magic numbers found

#### get_user_stats.py
- Condensed multi-line `safe_db_select` calls to single lines
- No magic numbers found

#### manage_privacy.py
- Condensed update_data initialization from 3 lines to 1 line
- No magic numbers found

#### update_profile.py
- Condensed update_data initialization from 3 lines to 1 line
- No magic numbers found

#### update_settings.py
- Condensed update_data initialization from 3 lines to 1 line
- No magic numbers found

#### create_vehicle.py
- Condensed multi-line update call to single line
- Condensed multi-line logger.warning call

## Anti-AI-Slop Rules Applied

1. **Removed obvious comments**: Comments that just restate what code does
2. **Extracted magic numbers**: All hardcoded thresholds, limits, and configuration values

## Files Modified

**Shop Tools (4 files)**:
- `backend/app/services/pam/tools/shop/compare_prices.py`
- `backend/app/services/pam/tools/shop/get_product_details.py`
- `backend/app/services/pam/tools/shop/recommend_products.py`
- `backend/app/services/pam/tools/shop/search_products.py`

**Profile Tools (6 files)**:
- `backend/app/services/pam/tools/profile/export_data.py`
- `backend/app/services/pam/tools/profile/get_user_stats.py`
- `backend/app/services/pam/tools/profile/manage_privacy.py`
- `backend/app/services/pam/tools/profile/update_profile.py`
- `backend/app/services/pam/tools/profile/update_settings.py`
- `backend/app/services/pam/tools/profile/create_vehicle.py`

**New File**:
- `backend/app/services/pam/tools/constants.py`

## Testing

- Python syntax check: PASSED
- All files compile without errors

## Next Steps

Phase 3: Budget and trip tools cleanup (if required)

## Benefits

1. **Maintainability**: Single source of truth for configuration values
2. **Readability**: Code is more concise without obvious comments
3. **Flexibility**: Easy to adjust thresholds without searching through code
4. **Consistency**: All tools use the same limits and thresholds
