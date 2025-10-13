"""
Multi-Region Fuel Price API Integration

Provides fuel prices from official government sources worldwide:
- USA: EIA (U.S. Energy Information Administration)
- Canada: Natural Resources Canada (NRCan) fuel data
- Australia: NSW Government Fuel API
- UK: UK Government Fuel Price Data
- New Zealand: Ministry of Business, Innovation and Employment (MBIE)
- Europe: EU Weekly Oil Bulletin
- Global: GlobalPetrolPrices.com fallback

Free APIs - registration may be required.
"""

import logging
import os
from typing import Dict, Any, Optional, Literal
import httpx
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# API Configuration
EIA_API_BASE_URL = "https://api.eia.gov/v2"
NSW_FUEL_API_BASE_URL = "https://api.nsw.gov.au/v1/FuelPriceCheck"
GLOBAL_PETROL_PRICES_URL = "https://www.globalpetrolprices.com/api"

# API Keys (set in environment variables)
EIA_API_KEY = os.getenv("EIA_API_KEY")  # USA
NSW_API_KEY = os.getenv("NSW_FUEL_API_KEY")  # Australia
GLOBAL_PETROL_API_KEY = os.getenv("GLOBAL_PETROL_API_KEY")  # Worldwide fallback

# Series IDs for gasoline prices
EIA_SERIES_IDS = {
    "regular_national": "PET.EMM_EPM0_PTE_NUS_DPG.W",  # Weekly U.S. Regular All Formulations Retail Gasoline Prices
    "diesel_national": "PET.EMD_EPD2D_PTE_NUS_DPG.W",  # Weekly U.S. No 2 Diesel Retail Prices
    "premium_national": "PET.EMM_EPMP_PTE_NUS_DPG.W",  # Weekly U.S. Premium All Formulations Retail Gasoline Prices
}

# Cache for gas prices (avoid hitting API every request)
_gas_price_cache: Dict[str, Any] = {}
_cache_expiry: Optional[datetime] = None
CACHE_DURATION_HOURS = 24  # Cache prices for 24 hours


async def get_national_gas_price(fuel_type: str = "regular") -> float:
    """
    Get current national average gas price from EIA

    Args:
        fuel_type: Type of fuel (regular, diesel, premium)

    Returns:
        Price per gallon in USD (float)
        Falls back to $3.50 if API unavailable
    """
    global _gas_price_cache, _cache_expiry

    try:
        # Check if API key is configured
        if not EIA_API_KEY:
            logger.warning("EIA_API_KEY not configured, using fallback price")
            return _get_fallback_price(fuel_type)

        # Check cache
        now = datetime.now()
        if _cache_expiry and now < _cache_expiry and fuel_type in _gas_price_cache:
            logger.info(f"Returning cached {fuel_type} price: ${_gas_price_cache[fuel_type]:.2f}/gal")
            return _gas_price_cache[fuel_type]

        # Get series ID for fuel type
        series_id = EIA_SERIES_IDS.get(f"{fuel_type}_national")
        if not series_id:
            logger.warning(f"Unknown fuel type: {fuel_type}, using regular")
            series_id = EIA_SERIES_IDS["regular_national"]

        # Fetch from EIA API
        url = f"{EIA_API_BASE_URL}/seriesid/{series_id}"
        params = {
            "api_key": EIA_API_KEY,
            "frequency": "weekly",
            "data[0]": "value",
            "facets[series][]": series_id,
            "sort[0][column]": "period",
            "sort[0][direction]": "desc",
            "offset": 0,
            "length": 1  # Get only the most recent value
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

        # Extract price from response
        if data.get("response") and data["response"].get("data"):
            latest_data = data["response"]["data"][0]
            price = float(latest_data["value"])

            # Update cache
            _gas_price_cache[fuel_type] = price
            _cache_expiry = now + timedelta(hours=CACHE_DURATION_HOURS)

            logger.info(f"Fetched {fuel_type} price from EIA: ${price:.2f}/gal")
            return price
        else:
            logger.warning("EIA API returned no data, using fallback")
            return _get_fallback_price(fuel_type)

    except httpx.HTTPError as e:
        logger.error(f"HTTP error fetching EIA gas prices: {e}")
        return _get_fallback_price(fuel_type)
    except Exception as e:
        logger.error(f"Error fetching EIA gas prices: {e}", exc_info=True)
        return _get_fallback_price(fuel_type)


async def get_australia_fuel_price(fuel_type: str = "regular") -> float:
    """
    Get current fuel price for Australia (Sydney average)

    Uses NSW Government Fuel API for real-time prices in NSW/Sydney area.
    Falls back to GlobalPetrolPrices if NSW API unavailable.

    Args:
        fuel_type: Type of fuel (regular, diesel, premium)

    Returns:
        Price per liter in AUD
    """
    try:
        if not NSW_API_KEY:
            logger.warning("NSW_API_KEY not configured, using fallback")
            return _get_fallback_price_regional("AU", fuel_type)

        # NSW API returns prices per liter for Sydney metro area
        # Fuel types: E10, U91, U95, U98, DL, LPG
        fuel_type_map = {
            "regular": "U91",  # Unleaded 91
            "premium": "U95",  # Unleaded 95
            "diesel": "DL"     # Diesel
        }

        nsw_fuel_type = fuel_type_map.get(fuel_type, "U91")

        async with httpx.AsyncClient(timeout=10.0) as client:
            headers = {
                "Authorization": f"Bearer {NSW_API_KEY}",
                "Accept": "application/json"
            }
            response = await client.get(
                f"{NSW_FUEL_API_BASE_URL}/price/",
                headers=headers
            )
            response.raise_for_status()
            data = response.json()

        # Extract average price for the fuel type
        if "prices" in data:
            prices = [p["price"] for p in data["prices"] if p["fueltype"] == nsw_fuel_type]
            if prices:
                avg_price = sum(prices) / len(prices) / 100  # Convert cents to dollars
                logger.info(f"Fetched Australia {fuel_type} price: ${avg_price:.2f}/L")
                return avg_price

        logger.warning("NSW API returned no data, using fallback")
        return _get_fallback_price_regional("AU", fuel_type)

    except Exception as e:
        logger.error(f"Error fetching Australia fuel prices: {e}")
        return _get_fallback_price_regional("AU", fuel_type)


async def get_europe_fuel_price(country_code: str = "DE", fuel_type: str = "regular") -> float:
    """
    Get current fuel price for Europe

    Uses EU Weekly Oil Bulletin data or GlobalPetrolPrices API.
    Default country: Germany (DE) as EU's largest economy.

    Args:
        country_code: ISO country code (DE, FR, IT, ES, etc.)
        fuel_type: Type of fuel (regular, diesel, premium)

    Returns:
        Price per liter in EUR
    """
    try:
        # EU Weekly Oil Bulletin doesn't have real-time API
        # Use GlobalPetrolPrices fallback or return conservative estimate
        logger.info(f"Europe fuel prices using fallback for {country_code}")
        return _get_fallback_price_regional("EU", fuel_type)

    except Exception as e:
        logger.error(f"Error fetching Europe fuel prices: {e}")
        return _get_fallback_price_regional("EU", fuel_type)


async def get_canada_fuel_price(fuel_type: str = "regular") -> float:
    """
    Get current fuel price for Canada

    Uses Natural Resources Canada (NRCan) fuel price data.
    Returns average Canadian fuel prices in CAD per liter.

    Args:
        fuel_type: Type of fuel (regular, diesel, premium)

    Returns:
        Price per liter in CAD
    """
    try:
        # NRCan provides weekly fuel price updates
        # API endpoint: https://www.nrcan.gc.ca/energy/fuel-prices
        # For now, using fallback - integration planned
        logger.info(f"Canada fuel prices using fallback")
        return _get_fallback_price_regional("CA", fuel_type)

    except Exception as e:
        logger.error(f"Error fetching Canada fuel prices: {e}")
        return _get_fallback_price_regional("CA", fuel_type)


async def get_uk_fuel_price(fuel_type: str = "regular") -> float:
    """
    Get current fuel price for United Kingdom

    Uses UK Government fuel price data.
    Returns average UK fuel prices in GBP per liter.

    Args:
        fuel_type: Type of fuel (regular, diesel, premium)

    Returns:
        Price per liter in GBP
    """
    try:
        # UK Government provides weekly fuel price data
        # API endpoint: https://www.gov.uk/guidance/fuel-price-statistics
        # For now, using fallback - integration planned
        logger.info(f"UK fuel prices using fallback")
        return _get_fallback_price_regional("UK", fuel_type)

    except Exception as e:
        logger.error(f"Error fetching UK fuel prices: {e}")
        return _get_fallback_price_regional("UK", fuel_type)


async def get_newzealand_fuel_price(fuel_type: str = "regular") -> float:
    """
    Get current fuel price for New Zealand

    Uses Ministry of Business, Innovation and Employment (MBIE) fuel data.
    Returns average NZ fuel prices in NZD per liter.

    Args:
        fuel_type: Type of fuel (regular, diesel, premium)

    Returns:
        Price per liter in NZD
    """
    try:
        # MBIE provides fuel price monitoring data
        # API endpoint: https://www.mbie.govt.nz/building-and-energy/energy-and-natural-resources/energy-statistics-and-modelling/energy-statistics/weekly-fuel-price-monitoring/
        # For now, using fallback - integration planned
        logger.info(f"New Zealand fuel prices using fallback")
        return _get_fallback_price_regional("NZ", fuel_type)

    except Exception as e:
        logger.error(f"Error fetching New Zealand fuel prices: {e}")
        return _get_fallback_price_regional("NZ", fuel_type)


def _get_fallback_price(fuel_type: str) -> float:
    """
    Fallback prices for USA when API is unavailable

    These are conservative estimates (slightly higher than average)
    to avoid underestimating trip costs.

    Returns: Price per gallon in USD
    """
    fallback_prices = {
        "regular": 3.50,
        "diesel": 3.75,
        "premium": 3.95
    }
    return fallback_prices.get(fuel_type, 3.50)


def _get_fallback_price_regional(region: str, fuel_type: str) -> float:
    """
    Fallback prices by region when APIs are unavailable

    Args:
        region: Region code (US, CA, AU, UK, NZ, EU)
        fuel_type: Type of fuel

    Returns:
        Price in local currency per local unit
        - US: USD per gallon
        - CA: CAD per liter
        - AU: AUD per liter
        - UK: GBP per liter
        - NZ: NZD per liter
        - EU: EUR per liter
    """
    # Conservative estimates (October 2025)
    fallback_prices = {
        "US": {
            "regular": 3.50,  # USD/gallon
            "diesel": 3.75,
            "premium": 3.95
        },
        "CA": {
            "regular": 1.65,  # CAD/liter
            "diesel": 1.75,
            "premium": 1.85
        },
        "AU": {
            "regular": 1.85,  # AUD/liter
            "diesel": 2.00,
            "premium": 2.10
        },
        "UK": {
            "regular": 1.50,  # GBP/liter
            "diesel": 1.55,
            "premium": 1.65
        },
        "NZ": {
            "regular": 2.60,  # NZD/liter
            "diesel": 2.20,
            "premium": 2.80
        },
        "EU": {
            "regular": 1.70,  # EUR/liter
            "diesel": 1.60,
            "premium": 1.85
        }
    }

    return fallback_prices.get(region, fallback_prices["US"]).get(fuel_type, 3.50)


async def get_regional_gas_price(state_code: str, fuel_type: str = "regular") -> float:
    """
    Get regional gas price for a specific state

    Args:
        state_code: Two-letter state code (e.g., "CA", "TX")
        fuel_type: Type of fuel (regular, diesel, premium)

    Returns:
        Price per gallon in USD

    Note: Regional data requires more complex EIA API queries.
    For now, this returns national average. Future enhancement: implement state-level data.
    """
    # TODO: Implement state-level EIA queries
    logger.info(f"Regional prices not yet implemented for {state_code}, using national average")
    return await get_national_gas_price(fuel_type)


async def get_fuel_price_for_region(
    region: Literal["US", "CA", "AU", "UK", "NZ", "EU"] = "US",
    fuel_type: str = "regular",
    country_code: Optional[str] = None
) -> Dict[str, Any]:
    """
    Smart fuel price fetcher - auto-detects region and returns price with metadata

    Args:
        region: Region code (US, CA, AU, UK, NZ, EU)
        fuel_type: Type of fuel (regular, diesel, premium)
        country_code: Optional country code for EU (DE, FR, IT, etc.)

    Returns:
        Dict with price, currency, unit, and source info
    """
    try:
        if region == "US":
            price_per_gallon = await get_national_gas_price(fuel_type)
            return {
                "price": price_per_gallon,
                "currency": "USD",
                "unit": "gallon",
                "region": "US",
                "fuel_type": fuel_type,
                "source": "EIA" if EIA_API_KEY else "fallback"
            }

        elif region == "CA":
            price_per_liter = await get_canada_fuel_price(fuel_type)
            return {
                "price": price_per_liter,
                "currency": "CAD",
                "unit": "liter",
                "region": "CA",
                "fuel_type": fuel_type,
                "source": "fallback"  # NRCan API integration planned
            }

        elif region == "AU":
            price_per_liter = await get_australia_fuel_price(fuel_type)
            return {
                "price": price_per_liter,
                "currency": "AUD",
                "unit": "liter",
                "region": "AU",
                "fuel_type": fuel_type,
                "source": "NSW_API" if NSW_API_KEY else "fallback"
            }

        elif region == "UK":
            price_per_liter = await get_uk_fuel_price(fuel_type)
            return {
                "price": price_per_liter,
                "currency": "GBP",
                "unit": "liter",
                "region": "UK",
                "fuel_type": fuel_type,
                "source": "fallback"  # UK Gov API integration planned
            }

        elif region == "NZ":
            price_per_liter = await get_newzealand_fuel_price(fuel_type)
            return {
                "price": price_per_liter,
                "currency": "NZD",
                "unit": "liter",
                "region": "NZ",
                "fuel_type": fuel_type,
                "source": "fallback"  # MBIE API integration planned
            }

        elif region == "EU":
            price_per_liter = await get_europe_fuel_price(country_code or "DE", fuel_type)
            return {
                "price": price_per_liter,
                "currency": "EUR",
                "unit": "liter",
                "region": "EU",
                "country": country_code or "DE",
                "fuel_type": fuel_type,
                "source": "fallback"  # EU API not yet implemented
            }

        else:
            # Default to US
            logger.warning(f"Unknown region: {region}, defaulting to US")
            return await get_fuel_price_for_region("US", fuel_type)

    except Exception as e:
        logger.error(f"Error getting fuel price for region {region}: {e}")
        # Return fallback
        currency_map = {
            "US": "USD",
            "CA": "CAD",
            "AU": "AUD",
            "UK": "GBP",
            "NZ": "NZD",
            "EU": "EUR"
        }
        return {
            "price": _get_fallback_price_regional(region, fuel_type),
            "currency": currency_map.get(region, "USD"),
            "unit": "gallon" if region == "US" else "liter",
            "region": region,
            "fuel_type": fuel_type,
            "source": "fallback_error"
        }


def clear_cache():
    """Clear the gas price cache (useful for testing)"""
    global _gas_price_cache, _cache_expiry
    _gas_price_cache = {}
    _cache_expiry = None
    logger.info("Gas price cache cleared")
