"""
Digistore24 Marketplace Service
Handles product synchronization and marketplace integration with Digistore24.
"""

import aiohttp
import asyncio
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from decimal import Decimal
import json

from app.core.config import get_settings
from app.db.supabase import get_supabase_client
from supabase import Client

logger = logging.getLogger(__name__)
settings = get_settings()


class Digistore24MarketplaceService:
    """Service for interacting with Digistore24 marketplace API."""
    
    BASE_URL = "https://www.digistore24.com/api/call"
    
    def __init__(self):
        self.api_key = settings.DIGISTORE24_API_KEY
        self.vendor_id = settings.DIGISTORE24_VENDOR_ID
        self.min_commission = settings.DIGISTORE24_MIN_COMMISSION
        self.categories = settings.DIGISTORE24_AUTO_IMPORT_CATEGORIES.split(',')
        self.keywords = settings.DIGISTORE24_KEYWORDS.split(',') if settings.DIGISTORE24_KEYWORDS else []
        self.target_audience = settings.DIGISTORE24_TARGET_AUDIENCE.split(',') if settings.DIGISTORE24_TARGET_AUDIENCE else []
        
    async def _make_api_request(self, function: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
        """Make an API request to Digistore24."""
        if not self.api_key:
            raise ValueError("Digistore24 API key not configured")
        
        payload = {
            'api_key': self.api_key,
            'function': function,
            **(params or {})
        }
        
        async with aiohttp.ClientSession() as session:
            try:
                async with session.post(self.BASE_URL, data=payload) as response:
                    if response.status != 200:
                        text = await response.text()
                        logger.error(f"API request failed: {response.status} - {text}")
                        raise Exception(f"API request failed: {response.status}")
                    
                    data = await response.json()
                    
                    # Check for API errors
                    if data.get('result') == 'error':
                        error_msg = data.get('message', 'Unknown error')
                        logger.error(f"API error: {error_msg}")
                        raise Exception(f"API error: {error_msg}")
                    
                    return data
                    
            except Exception as e:
                logger.error(f"Failed to make API request: {str(e)}")
                raise
    
    async def search_marketplace_products(
        self, 
        categories: Optional[List[str]] = None,
        keywords: Optional[List[str]] = None,
        page: int = 1,
        per_page: int = 100
    ) -> List[Dict[str, Any]]:
        """Search for products in the Digistore24 marketplace."""
        params = {
            'page': page,
            'per_page': per_page
        }
        
        # Add category filter if provided
        if categories:
            params['categories'] = ','.join(categories)
        
        # Add keyword search if provided
        if keywords:
            params['search'] = ' '.join(keywords)
        
        try:
            response = await self._make_api_request('listMarketplaceEntries', params)
            products = response.get('data', {}).get('products', [])
            return products
        except Exception as e:
            logger.error(f"Failed to search marketplace: {str(e)}")
            return []
    
    async def get_product_details(self, product_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a specific product."""
        try:
            response = await self._make_api_request('getProductInfo', {'product_id': product_id})
            return response.get('data', {}).get('product', None)
        except Exception as e:
            logger.error(f"Failed to get product details for {product_id}: {str(e)}")
            return None
    
    def _is_relevant_product(self, product: Dict[str, Any]) -> bool:
        """Check if a product is relevant to RV/camping audience."""
        # Check commission rate
        commission = float(product.get('commission_percent', 0))
        if commission < self.min_commission:
            return False
        
        # Check if product name/description contains relevant keywords
        product_text = f"{product.get('name', '')} {product.get('description', '')}".lower()
        
        # Check for any matching keywords
        for keyword in self.keywords:
            if keyword.lower() in product_text:
                return True
        
        # Check if category matches
        product_category = product.get('category', '').lower()
        for category in self.categories:
            if category.lower() in product_category:
                return True
        
        return False
    
    def _map_product_to_db_format(self, product: Dict[str, Any]) -> Dict[str, Any]:
        """Map Digistore24 product data to our database format."""
        # Generate affiliate link
        affiliate_link = f"https://www.digistore24.com/redir/{product.get('product_id')}/{self.vendor_id}/"
        
        # Map target audience based on product data
        target_audience = []
        product_text = f"{product.get('name', '')} {product.get('description', '')}".lower()
        
        # Check for audience indicators
        if any(word in product_text for word in ['women', 'female', 'lady', 'ladies']):
            target_audience.append('women')
        if any(word in product_text for word in ['solo', 'single', 'alone']):
            target_audience.append('solo-travelers')
        if any(word in product_text for word in ['digital', 'remote', 'nomad', 'online']):
            target_audience.append('digital-nomads')
        if any(word in product_text for word in ['spiritual', 'meditation', 'wellness', 'mindfulness']):
            target_audience.append('spiritual-seekers')
        
        # If no specific audience found, add general
        if not target_audience:
            target_audience = ['general']
        
        return {
            'name': product.get('name', 'Untitled Product'),
            'description': product.get('description', ''),
            'price': Decimal(str(product.get('price', 0))),
            'currency': product.get('currency', 'USD'),
            'image_url': product.get('image_url', '/placeholder-product.jpg'),
            'type': 'affiliate',
            'category': product.get('category', 'other'),
            'status': 'active',
            'external_url': affiliate_link,
            'digistore24_product_id': product.get('product_id'),
            'digistore24_vendor_id': product.get('vendor_id'),
            'commission_percentage': Decimal(str(product.get('commission_percent', 0))),
            'commission_type': product.get('commission_type', 'percentage'),
            'affiliate_link': affiliate_link,
            'auto_approved': product.get('auto_approval', False),
            'vendor_rating': Decimal(str(product.get('vendor_rating', 0))),
            'marketplace_category': product.get('category'),
            'target_audience': target_audience,
            'last_synced': datetime.utcnow(),
            'sync_status': 'active'
        }
    
    async def sync_products_to_database(self, db: Client = None) -> Dict[str, int]:
        """Sync marketplace products to database."""
        if not db:
            db = await get_supabase_client()
        
        sync_stats = {
            'products_synced': 0,
            'products_added': 0,
            'products_updated': 0,
            'products_removed': 0,
            'errors': 0
        }
        
        # Create sync log entry
        sync_log = await db.table('digistore24_sync_logs').insert({
            'sync_type': 'products',
            'started_at': datetime.utcnow(),
            'status': 'running'
        }).execute()
        
        sync_log_id = sync_log.data[0]['id']
        
        try:
            # Get all products from marketplace
            all_products = []
            page = 1
            
            while True:
                products = await self.search_marketplace_products(
                    categories=self.categories,
                    keywords=self.keywords,
                    page=page
                )
                
                if not products:
                    break
                
                all_products.extend(products)
                page += 1
                
                # Limit to prevent excessive API calls
                if page > 10:
                    break
            
            # Filter relevant products
            relevant_products = [p for p in all_products if self._is_relevant_product(p)]
            sync_stats['products_synced'] = len(relevant_products)
            
            # Get existing Digistore24 products from database
            existing = await db.table('shop_products').select('*').eq(
                'type', 'affiliate'
            ).not_.is_('digistore24_product_id', None).execute()
            
            existing_ids = {p['digistore24_product_id'] for p in existing.data}
            new_product_ids = {p['product_id'] for p in relevant_products}
            
            # Process each product
            for product in relevant_products:
                try:
                    db_product = self._map_product_to_db_format(product)
                    
                    if product['product_id'] in existing_ids:
                        # Update existing product
                        await db.table('shop_products').update(db_product).eq(
                            'digistore24_product_id', product['product_id']
                        ).execute()
                        sync_stats['products_updated'] += 1
                    else:
                        # Insert new product
                        await db.table('shop_products').insert(db_product).execute()
                        sync_stats['products_added'] += 1
                        
                except Exception as e:
                    logger.error(f"Failed to sync product {product.get('product_id')}: {str(e)}")
                    sync_stats['errors'] += 1
            
            # Mark products as inactive if they're no longer in marketplace
            for existing_product in existing.data:
                if existing_product['digistore24_product_id'] not in new_product_ids:
                    await db.table('shop_products').update({
                        'sync_status': 'inactive',
                        'status': 'inactive',
                        'last_synced': datetime.utcnow()
                    }).eq('id', existing_product['id']).execute()
                    sync_stats['products_removed'] += 1
            
            # Update sync log
            await db.table('digistore24_sync_logs').update({
                'completed_at': datetime.utcnow(),
                'status': 'completed',
                'products_synced': sync_stats['products_synced'],
                'products_added': sync_stats['products_added'],
                'products_updated': sync_stats['products_updated'],
                'products_removed': sync_stats['products_removed'],
                'metadata': {'stats': sync_stats}
            }).eq('id', sync_log_id).execute()
            
        except Exception as e:
            logger.error(f"Product sync failed: {str(e)}")
            
            # Update sync log with error
            await db.table('digistore24_sync_logs').update({
                'completed_at': datetime.utcnow(),
                'status': 'failed',
                'error_message': str(e),
                'metadata': {'stats': sync_stats}
            }).eq('id', sync_log_id).execute()
            
            raise
        
        return sync_stats
    
    async def calculate_regional_pricing(
        self, 
        base_price: Decimal, 
        base_currency: str, 
        target_currency: str
    ) -> Decimal:
        """Calculate price in target currency (simplified for now)."""
        # Simple currency conversion rates (should use real API in production)
        conversion_rates = {
            'USD': {'AUD': 1.55, 'CAD': 1.35, 'EUR': 0.92, 'GBP': 0.79},
            'AUD': {'USD': 0.65, 'CAD': 0.87, 'EUR': 0.59, 'GBP': 0.51},
            'EUR': {'USD': 1.09, 'AUD': 1.69, 'CAD': 1.47, 'GBP': 0.86},
        }
        
        if base_currency == target_currency:
            return base_price
        
        # Get conversion rate
        rate = conversion_rates.get(base_currency, {}).get(target_currency, 1.0)
        return Decimal(str(float(base_price) * rate)).quantize(Decimal('0.01'))


# Create global instance
marketplace_service = Digistore24MarketplaceService()