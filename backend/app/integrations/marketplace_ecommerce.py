"""
PAM Marketplace & E-commerce Integration System
Comprehensive integration with marketplaces, e-commerce platforms,
and shopping services for travel gear, RV supplies, and local purchases.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Union
from dataclasses import dataclass, asdict
from enum import Enum
import aiohttp
import xml.etree.ElementTree as ET
from decimal import Decimal
import hashlib
import hmac
import base64

from app.core.config import get_settings
from app.services.database import get_database
from app.core.security import encrypt_sensitive_data, decrypt_sensitive_data

settings = get_settings()
logger = logging.getLogger(__name__)

class MarketplaceProvider(Enum):
    """Supported marketplace and e-commerce providers"""
    # Australian Marketplaces
    EBAY_AU = "ebay_au"
    GUMTREE = "gumtree"
    FACEBOOK_MARKETPLACE = "facebook_marketplace"
    
    # E-commerce Platforms
    AMAZON_AU = "amazon_au"
    CATCH = "catch"
    KOGAN = "kogan"
    JB_HI_FI = "jb_hi_fi"
    HARVEY_NORMAN = "harvey_norman"
    BUNNINGS = "bunnings"
    
    # Travel & RV Specific
    CAMPING_WORLD = "camping_world"
    BCF = "bcf"
    ANACONDA = "anaconda"
    RAYS_OUTDOORS = "rays_outdoors"
    CARAVAN_CAMPING_SALES = "caravan_camping_sales"
    RV_SUPER_CENTRE = "rv_super_centre"
    
    # Local Services
    UBER_EATS = "uber_eats"
    MENULOG = "menulog"
    DELIVEROO = "deliveroo"
    WOOLWORTHS_ONLINE = "woolworths_online"
    COLES_ONLINE = "coles_online"
    
    # Fuel & Services
    AMPOL = "ampol"
    SHELL = "shell"
    BP = "bp"
    CALTEX = "caltex"

class ProductCategory(Enum):
    """Product categories for travel and RV needs"""
    # RV Equipment
    SOLAR_PANELS = "solar_panels"
    BATTERIES = "batteries"
    INVERTERS = "inverters"
    WATER_TANKS = "water_tanks"
    AWNINGS = "awnings"
    
    # Camping Gear
    TENTS = "tents"
    SLEEPING_BAGS = "sleeping_bags"
    CAMPING_CHAIRS = "camping_chairs"
    COOKING_EQUIPMENT = "cooking_equipment"
    LIGHTING = "lighting"
    
    # Vehicle Maintenance
    TYRES = "tyres"
    ENGINE_OIL = "engine_oil"
    FILTERS = "filters"
    TOOLS = "tools"
    SPARE_PARTS = "spare_parts"
    
    # Food & Supplies
    NON_PERISHABLES = "non_perishables"
    WATER = "water"
    GAS_BOTTLES = "gas_bottles"
    CLEANING_SUPPLIES = "cleaning_supplies"
    
    # Technology
    GPS_DEVICES = "gps_devices"
    COMMUNICATION = "communication"
    ENTERTAINMENT = "entertainment"
    POWER_BANKS = "power_banks"
    
    # Services
    FUEL = "fuel"
    REPAIRS = "repairs"
    FOOD_DELIVERY = "food_delivery"
    GROCERY_DELIVERY = "grocery_delivery"

class OrderStatus(Enum):
    """Order processing status"""
    CART = "cart"
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    RETURNED = "returned"

@dataclass
class Product:
    """Product information"""
    product_id: str
    provider: MarketplaceProvider
    title: str
    description: str
    category: ProductCategory
    price: Decimal
    currency: str
    availability: str
    seller_name: str
    seller_rating: Optional[float]
    images: List[str]
    specifications: Dict[str, Any]
    shipping_info: Dict[str, Any]
    reviews_count: int
    average_rating: float
    product_url: str
    location: Optional[str]
    is_travel_relevant: bool
    metadata: Dict[str, Any]

@dataclass
class ShoppingCart:
    """Shopping cart"""
    cart_id: str
    user_id: str
    provider: MarketplaceProvider
    items: List[Dict[str, Any]]
    subtotal: Decimal
    shipping_cost: Decimal
    tax: Decimal
    total: Decimal
    currency: str
    shipping_address: Optional[Dict[str, str]]
    estimated_delivery: Optional[datetime]
    created_at: datetime
    last_updated: datetime

@dataclass
class Order:
    """Order information"""
    order_id: str
    provider_order_id: str
    user_id: str
    provider: MarketplaceProvider
    items: List[Dict[str, Any]]
    total_amount: Decimal
    currency: str
    status: OrderStatus
    shipping_address: Dict[str, str]
    billing_address: Dict[str, str]
    payment_method: str
    tracking_number: Optional[str]
    estimated_delivery: Optional[datetime]
    actual_delivery: Optional[datetime]
    order_date: datetime
    metadata: Dict[str, Any]

@dataclass
class PriceAlert:
    """Price monitoring alert"""
    alert_id: str
    user_id: str
    product_id: str
    provider: MarketplaceProvider
    target_price: Decimal
    current_price: Decimal
    price_drop_percentage: Optional[float]
    is_active: bool
    created_at: datetime
    triggered_at: Optional[datetime]
    alert_preferences: Dict[str, Any]

class PAMMarketplaceEcommerceSystem:
    """
    Comprehensive marketplace and e-commerce integration system for PAM.
    
    Features:
    - Multi-marketplace product search and comparison
    - Automated price monitoring and alerts
    - Smart shopping recommendations based on travel plans
    - Local availability and delivery options
    - Travel-specific product categories and filters
    - Order tracking and management
    - Seller ratings and review analysis
    - Location-based shopping suggestions
    - Bulk purchasing for group travel
    - Service booking integration
    """
    
    def __init__(self):
        self.db = get_database()
        self.session = None
        
        # Provider configurations
        self.provider_configs = {
            MarketplaceProvider.AMAZON_AU: {
                "api_url": "https://webservices.amazon.com.au/paapi5/",
                "search_endpoint": "searchitems",
                "rate_limit": 8600,  # requests per day
                "timeout": 30,
                "supports_price_alerts": True
            },
            MarketplaceProvider.EBAY_AU: {
                "api_url": "https://api.ebay.com/ws/api/",
                "search_endpoint": "FindingService",
                "rate_limit": 5000,
                "timeout": 25,
                "supports_auctions": True
            },
            MarketplaceProvider.BCF: {
                "api_url": "https://api.bcf.com.au/v1/",
                "rate_limit": 1000,
                "timeout": 20,
                "category_focus": ["camping_gear", "fishing", "outdoor"]
            },
            MarketplaceProvider.BUNNINGS: {
                "api_url": "https://api.bunnings.com.au/v2/",
                "rate_limit": 2000,
                "timeout": 20,
                "category_focus": ["tools", "hardware", "garden"]
            },
            MarketplaceProvider.WOOLWORTHS_ONLINE: {
                "api_url": "https://api.woolworths.com.au/v1/",
                "delivery_zones": "metro_areas",
                "rate_limit": 1500,
                "timeout": 15
            }
        }
        
        # API credentials (encrypted)
        self.api_credentials = {}
        
        # Travel-specific product recommendations
        self.travel_product_suggestions = {}
        
        # Price monitoring
        self.active_price_alerts = {}
        
        # Shopping carts
        self.user_carts = {}
        
        # Initialize system
        asyncio.create_task(self._initialize_marketplace_system())
    
    async def _initialize_marketplace_system(self):
        """Initialize marketplace system"""
        try:
            # Create HTTP session
            self.session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=60),
                headers={"User-Agent": "PAM-Shopping-Assistant/1.0"}
            )
            
            # Load API credentials
            await self._load_marketplace_credentials()
            
            # Load travel product suggestions
            await self._load_travel_product_suggestions()
            
            # Initialize price monitoring
            await self._initialize_price_monitoring()
            
            logger.info("Marketplace e-commerce system initialized")
            
        except Exception as e:
            logger.error(f"Error initializing marketplace system: {e}")
    
    async def search_products(
        self,
        query: str,
        category: Optional[ProductCategory] = None,
        providers: Optional[List[MarketplaceProvider]] = None,
        location: Optional[str] = None,
        price_range: Optional[Tuple[Decimal, Decimal]] = None,
        travel_context: Optional[Dict[str, Any]] = None
    ) -> List[Product]:
        """
        Search for products across multiple marketplaces.
        
        Args:
            query: Search query
            category: Optional product category filter
            providers: Optional specific providers to search
            location: Optional location for local results
            price_range: Optional price range filter
            travel_context: Optional travel context for relevance scoring
            
        Returns:
            List of matching products
        """
        try:
            # Default providers based on category
            if not providers:
                providers = self._get_relevant_providers(category)
            
            # Search across providers concurrently
            search_tasks = []
            for provider in providers:
                if provider in self.provider_configs:
                    task = self._search_provider_products(
                        provider, query, category, location, price_range
                    )
                    search_tasks.append(task)
            
            # Wait for all searches
            provider_results = await asyncio.gather(*search_tasks, return_exceptions=True)
            
            # Combine results
            all_products = []
            for i, result in enumerate(provider_results):
                if isinstance(result, Exception):
                    logger.error(f"Error searching {providers[i]}: {result}")
                    continue
                
                if result:
                    all_products.extend(result)
            
            # Score products for travel relevance
            if travel_context:
                all_products = await self._score_travel_relevance(all_products, travel_context)
            
            # Remove duplicates and sort
            unique_products = self._deduplicate_products(all_products)
            sorted_products = self._sort_products(unique_products, query)
            
            # Store search results for analytics
            await self._store_search_results(query, category, len(sorted_products))
            
            return sorted_products
            
        except Exception as e:
            logger.error(f"Error searching products: {e}")
            return []
    
    async def get_travel_shopping_recommendations(
        self,
        user_id: str,
        travel_dates: Tuple[datetime, datetime],
        destinations: List[str],
        travel_style: str = "comfort"
    ) -> Dict[str, Any]:
        """
        Get shopping recommendations based on travel plans.
        
        Args:
            user_id: User identifier
            travel_dates: Travel start and end dates
            destinations: List of destination locations
            travel_style: Travel style (budget, comfort, luxury)
            
        Returns:
            Travel shopping recommendations
        """
        try:
            # Analyze travel requirements
            travel_analysis = await self._analyze_travel_requirements(
                travel_dates, destinations, travel_style
            )
            
            # Get user's current gear/supplies
            user_inventory = await self._get_user_inventory(user_id)
            
            # Generate recommendations by category
            recommendations = {}
            
            # Essential gear recommendations
            essential_gear = await self._recommend_essential_gear(
                travel_analysis, user_inventory
            )
            recommendations["essential_gear"] = essential_gear
            
            # Destination-specific items
            destination_items = await self._recommend_destination_specific_items(
                destinations, travel_analysis
            )
            recommendations["destination_specific"] = destination_items
            
            # Seasonal/weather-based items
            seasonal_items = await self._recommend_seasonal_items(
                travel_dates, destinations
            )
            recommendations["seasonal"] = seasonal_items
            
            # Maintenance and safety items
            maintenance_items = await self._recommend_maintenance_items(
                travel_analysis, user_inventory
            )
            recommendations["maintenance"] = maintenance_items
            
            # Food and supplies
            supply_items = await self._recommend_supplies(
                travel_dates, destinations, travel_style
            )
            recommendations["supplies"] = supply_items
            
            # Calculate total budget estimate
            total_budget = sum(
                sum(item.get("estimated_cost", 0) for item in category_items)
                for category_items in recommendations.values()
            )
            
            # Add shopping timeline
            shopping_timeline = await self._create_shopping_timeline(
                recommendations, travel_dates
            )
            
            return {
                "user_id": user_id,
                "travel_period": {
                    "start": travel_dates[0].isoformat(),
                    "end": travel_dates[1].isoformat()
                },
                "destinations": destinations,
                "recommendations": recommendations,
                "total_estimated_budget": float(total_budget),
                "shopping_timeline": shopping_timeline,
                "priority_items": await self._identify_priority_items(recommendations),
                "generated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting travel shopping recommendations: {e}")
            return {"error": str(e)}
    
    async def compare_prices(
        self,
        product_query: str,
        providers: Optional[List[MarketplaceProvider]] = None
    ) -> Dict[str, Any]:
        """
        Compare prices across multiple providers.
        
        Args:
            product_query: Product to search for
            providers: Optional specific providers to compare
            
        Returns:
            Price comparison results
        """
        try:
            # Search for products
            products = await self.search_products(product_query, providers=providers)
            
            if not products:
                return {"error": "No products found for comparison"}
            
            # Group similar products
            product_groups = await self._group_similar_products(products)
            
            comparison_results = []
            
            for group_name, group_products in product_groups.items():
                # Sort by price
                sorted_products = sorted(group_products, key=lambda p: p.price)
                
                best_deal = sorted_products[0]
                worst_deal = sorted_products[-1]
                
                # Calculate savings
                max_savings = worst_deal.price - best_deal.price
                savings_percentage = float((max_savings / worst_deal.price) * 100) if worst_deal.price > 0 else 0
                
                comparison_data = {
                    "product_group": group_name,
                    "best_deal": {
                        "provider": best_deal.provider.value,
                        "price": float(best_deal.price),
                        "seller": best_deal.seller_name,
                        "rating": best_deal.average_rating,
                        "url": best_deal.product_url
                    },
                    "worst_deal": {
                        "provider": worst_deal.provider.value,
                        "price": float(worst_deal.price),
                        "seller": worst_deal.seller_name,
                        "rating": worst_deal.average_rating,
                        "url": worst_deal.product_url
                    },
                    "potential_savings": float(max_savings),
                    "savings_percentage": savings_percentage,
                    "all_options": [
                        {
                            "provider": p.provider.value,
                            "price": float(p.price),
                            "seller": p.seller_name,
                            "rating": p.average_rating,
                            "availability": p.availability,
                            "shipping_info": p.shipping_info,
                            "url": p.product_url
                        }
                        for p in sorted_products
                    ]
                }
                
                comparison_results.append(comparison_data)
            
            return {
                "query": product_query,
                "total_products_found": len(products),
                "product_groups": len(comparison_results),
                "comparisons": comparison_results,
                "generated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error comparing prices: {e}")
            return {"error": str(e)}
    
    async def create_price_alert(
        self,
        user_id: str,
        product_identifier: str,
        provider: MarketplaceProvider,
        target_price: Decimal,
        alert_preferences: Optional[Dict[str, Any]] = None
    ) -> PriceAlert:
        """
        Create price monitoring alert.
        
        Args:
            user_id: User identifier
            product_identifier: Product ID or URL
            provider: Marketplace provider
            target_price: Desired price threshold
            alert_preferences: Alert notification preferences
            
        Returns:
            Created price alert
        """
        try:
            # Get current product information
            product_info = await self._get_product_info(provider, product_identifier)
            if not product_info:
                raise ValueError("Product not found")
            
            current_price = product_info.price
            
            # Create price alert
            alert_id = f"alert_{user_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
            
            price_alert = PriceAlert(
                alert_id=alert_id,
                user_id=user_id,
                product_id=product_identifier,
                provider=provider,
                target_price=target_price,
                current_price=current_price,
                price_drop_percentage=None,
                is_active=True,
                created_at=datetime.utcnow(),
                triggered_at=None,
                alert_preferences=alert_preferences or {
                    "email": True,
                    "push_notification": True,
                    "check_frequency": "daily"
                }
            )
            
            # Store alert
            await self._store_price_alert(price_alert)
            
            # Add to active monitoring
            self.active_price_alerts[alert_id] = price_alert
            
            return price_alert
            
        except Exception as e:
            logger.error(f"Error creating price alert: {e}")
            raise
    
    async def manage_shopping_cart(
        self,
        user_id: str,
        provider: MarketplaceProvider,
        action: str,
        item_data: Optional[Dict[str, Any]] = None
    ) -> ShoppingCart:
        """
        Manage shopping cart operations.
        
        Args:
            user_id: User identifier
            provider: Marketplace provider
            action: Action to perform (add, remove, update, clear)
            item_data: Item data for add/update operations
            
        Returns:
            Updated shopping cart
        """
        try:
            # Get or create cart
            cart_key = f"{user_id}_{provider.value}"
            cart = self.user_carts.get(cart_key)
            
            if not cart:
                cart = ShoppingCart(
                    cart_id=f"cart_{cart_key}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
                    user_id=user_id,
                    provider=provider,
                    items=[],
                    subtotal=Decimal(0),
                    shipping_cost=Decimal(0),
                    tax=Decimal(0),
                    total=Decimal(0),
                    currency="AUD",
                    shipping_address=None,
                    estimated_delivery=None,
                    created_at=datetime.utcnow(),
                    last_updated=datetime.utcnow()
                )
            
            # Perform cart action
            if action == "add" and item_data:
                await self._add_item_to_cart(cart, item_data)
            elif action == "remove" and item_data:
                await self._remove_item_from_cart(cart, item_data["product_id"])
            elif action == "update" and item_data:
                await self._update_cart_item(cart, item_data)
            elif action == "clear":
                cart.items = []
            
            # Recalculate cart totals
            await self._recalculate_cart_totals(cart)
            
            # Update timestamp
            cart.last_updated = datetime.utcnow()
            
            # Store cart
            self.user_carts[cart_key] = cart
            await self._store_shopping_cart(cart)
            
            return cart
            
        except Exception as e:
            logger.error(f"Error managing shopping cart: {e}")
            raise
    
    async def place_order(
        self,
        user_id: str,
        cart: ShoppingCart,
        shipping_address: Dict[str, str],
        payment_method: str,
        special_instructions: Optional[str] = None
    ) -> Order:
        """
        Place order from shopping cart.
        
        Args:
            user_id: User identifier
            cart: Shopping cart to convert to order
            shipping_address: Delivery address
            payment_method: Payment method identifier
            special_instructions: Optional delivery instructions
            
        Returns:
            Created order
        """
        try:
            # Validate cart and inventory
            validation_result = await self._validate_cart_for_order(cart)
            if not validation_result["valid"]:
                raise ValueError(f"Cart validation failed: {validation_result['reason']}")
            
            # Create order with provider
            provider_order = await self._create_provider_order(
                cart, shipping_address, payment_method, special_instructions
            )
            
            if not provider_order["success"]:
                raise ValueError(f"Failed to create provider order: {provider_order['error']}")
            
            # Create order record
            order_id = f"order_{user_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
            
            order = Order(
                order_id=order_id,
                provider_order_id=provider_order["order_id"],
                user_id=user_id,
                provider=cart.provider,
                items=cart.items.copy(),
                total_amount=cart.total,
                currency=cart.currency,
                status=OrderStatus.CONFIRMED,
                shipping_address=shipping_address,
                billing_address=shipping_address,  # Assume same as shipping
                payment_method=payment_method,
                tracking_number=provider_order.get("tracking_number"),
                estimated_delivery=provider_order.get("estimated_delivery"),
                actual_delivery=None,
                order_date=datetime.utcnow(),
                metadata={
                    "special_instructions": special_instructions,
                    "provider_response": provider_order
                }
            )
            
            # Store order
            await self._store_order(order)
            
            # Clear cart
            cart_key = f"{user_id}_{cart.provider.value}"
            if cart_key in self.user_carts:
                del self.user_carts[cart_key]
            
            # Start order tracking
            asyncio.create_task(self._track_order_status(order))
            
            return order
            
        except Exception as e:
            logger.error(f"Error placing order: {e}")
            raise
    
    async def track_order_status(
        self,
        order_id: str
    ) -> Dict[str, Any]:
        """
        Get current order status and tracking information.
        
        Args:
            order_id: Order identifier
            
        Returns:
            Order tracking information
        """
        try:
            # Get order from database
            order_info = await self._get_order_info(order_id)
            if not order_info:
                return {"error": "Order not found"}
            
            # Get latest status from provider
            provider_status = await self._get_provider_order_status(
                order_info["provider"], order_info["provider_order_id"]
            )
            
            # Update order status if changed
            if provider_status and provider_status.get("status") != order_info["status"]:
                await self._update_order_status(order_id, provider_status["status"])
            
            # Get tracking details
            tracking_info = None
            if order_info.get("tracking_number"):
                tracking_info = await self._get_tracking_details(
                    order_info["provider"], order_info["tracking_number"]
                )
            
            return {
                "order_id": order_id,
                "status": provider_status.get("status", order_info["status"]),
                "tracking_number": order_info.get("tracking_number"),
                "estimated_delivery": order_info.get("estimated_delivery"),
                "tracking_details": tracking_info,
                "items": order_info["items"],
                "total_amount": order_info["total_amount"],
                "last_updated": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error tracking order: {e}")
            return {"error": str(e)}
    
    # Private helper methods
    
    async def _search_provider_products(
        self,
        provider: MarketplaceProvider,
        query: str,
        category: Optional[ProductCategory],
        location: Optional[str],
        price_range: Optional[Tuple[Decimal, Decimal]]
    ) -> List[Product]:
        """Search products from a specific provider"""
        try:
            if provider == MarketplaceProvider.AMAZON_AU:
                return await self._search_amazon_products(query, category, price_range)
            elif provider == MarketplaceProvider.EBAY_AU:
                return await self._search_ebay_products(query, category, price_range)
            elif provider == MarketplaceProvider.BCF:
                return await self._search_bcf_products(query, category, price_range)
            elif provider == MarketplaceProvider.BUNNINGS:
                return await self._search_bunnings_products(query, category, price_range)
            else:
                return await self._generic_product_search(provider, query, category, price_range)
                
        except Exception as e:
            logger.error(f"Error searching {provider} products: {e}")
            return []
    
    def _get_relevant_providers(self, category: Optional[ProductCategory]) -> List[MarketplaceProvider]:
        """Get relevant providers based on product category"""
        if not category:
            return list(MarketplaceProvider)
        
        category_mappings = {
            ProductCategory.CAMPING_GEAR: [
                MarketplaceProvider.BCF, MarketplaceProvider.ANACONDA,
                MarketplaceProvider.RAYS_OUTDOORS, MarketplaceProvider.AMAZON_AU
            ],
            ProductCategory.TOOLS: [
                MarketplaceProvider.BUNNINGS, MarketplaceProvider.TOTAL_TOOLS,
                MarketplaceProvider.AMAZON_AU, MarketplaceProvider.EBAY_AU
            ],
            ProductCategory.FOOD_DELIVERY: [
                MarketplaceProvider.UBER_EATS, MarketplaceProvider.MENULOG,
                MarketplaceProvider.DELIVEROO
            ],
            ProductCategory.GROCERY_DELIVERY: [
                MarketplaceProvider.WOOLWORTHS_ONLINE, MarketplaceProvider.COLES_ONLINE
            ],
            ProductCategory.FUEL: [
                MarketplaceProvider.AMPOL, MarketplaceProvider.SHELL,
                MarketplaceProvider.BP, MarketplaceProvider.CALTEX
            ]
        }
        
        return category_mappings.get(category, [MarketplaceProvider.AMAZON_AU, MarketplaceProvider.EBAY_AU])
    
    async def _analyze_travel_requirements(
        self,
        travel_dates: Tuple[datetime, datetime],
        destinations: List[str],
        travel_style: str
    ) -> Dict[str, Any]:
        """Analyze travel requirements for shopping recommendations"""
        duration_days = (travel_dates[1] - travel_dates[0]).days
        
        # Climate analysis for destinations
        climate_analysis = await self._analyze_destination_climates(destinations)
        
        # Activity analysis
        activity_analysis = await self._analyze_destination_activities(destinations)
        
        return {
            "duration_days": duration_days,
            "season": self._get_season_from_dates(travel_dates[0]),
            "climate_requirements": climate_analysis,
            "activity_requirements": activity_analysis,
            "travel_style": travel_style,
            "group_size": 2,  # Default assumption for grey nomads
            "vehicle_type": "caravan_motorhome"
        }
    
    async def _store_search_results(self, query: str, category: Optional[ProductCategory], result_count: int):
        """Store search results for analytics"""
        try:
            search_data = {
                "query": query,
                "category": category.value if category else None,
                "result_count": result_count,
                "timestamp": datetime.utcnow(),
                "search_type": "product_search"
            }
            
            query = """
            INSERT INTO pam_marketplace_searches (query, category, result_count, timestamp, search_type)
            VALUES ($1, $2, $3, $4, $5)
            """
            
            await self.db.execute(
                query,
                search_data["query"],
                search_data["category"],
                search_data["result_count"],
                search_data["timestamp"],
                search_data["search_type"]
            )
            
        except Exception as e:
            logger.error(f"Error storing search results: {e}")


# Global marketplace e-commerce system instance
marketplace_system = PAMMarketplaceEcommerceSystem()

# Utility functions for easy integration

async def search_travel_products(
    query: str,
    category: str = None,
    max_price: float = None,
    location: str = None
) -> List[Product]:
    """Convenience function for product search"""
    product_category = ProductCategory(category) if category else None
    price_range = (Decimal(0), Decimal(max_price)) if max_price else None
    
    return await marketplace_system.search_products(
        query=query,
        category=product_category,
        price_range=price_range,
        location=location
    )

async def get_shopping_recommendations(
    user_id: str,
    travel_start: datetime,
    travel_end: datetime,
    destinations: List[str],
    style: str = "comfort"
) -> Dict[str, Any]:
    """Convenience function for travel shopping recommendations"""
    return await marketplace_system.get_travel_shopping_recommendations(
        user_id=user_id,
        travel_dates=(travel_start, travel_end),
        destinations=destinations,
        travel_style=style
    )

async def compare_product_prices(
    product_name: str,
    providers: List[str] = None
) -> Dict[str, Any]:
    """Convenience function for price comparison"""
    marketplace_providers = [MarketplaceProvider(p) for p in providers] if providers else None
    
    return await marketplace_system.compare_prices(
        product_query=product_name,
        providers=marketplace_providers
    )

async def create_shopping_alert(
    user_id: str,
    product_id: str,
    provider: str,
    target_price: float
) -> PriceAlert:
    """Convenience function for creating price alerts"""
    return await marketplace_system.create_price_alert(
        user_id=user_id,
        product_identifier=product_id,
        provider=MarketplaceProvider(provider),
        target_price=Decimal(target_price)
    )