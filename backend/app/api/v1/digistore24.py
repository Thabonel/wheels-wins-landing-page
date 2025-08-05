"""
Digistore24 IPN Webhook Handler and API
Handles instant payment notifications from Digistore24 for affiliate sales tracking.
"""

from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import PlainTextResponse
from typing import Dict, Any, Optional
import hashlib
import logging
from datetime import datetime
from decimal import Decimal

from app.core.config import get_settings
from app.db.supabase import get_supabase_client
from app.api.deps import get_current_user
from app.models.schemas.user import User
from supabase import Client

logger = logging.getLogger(__name__)

router = APIRouter()
settings = get_settings()


def calculate_signature(
    passphrase: str, 
    parameters: Dict[str, Any], 
    convert_keys_to_uppercase: bool = False
) -> str:
    """
    Calculate SHA-512 signature for IPN validation.
    Based on Digistore24's signature algorithm.
    """
    algorithm = 'sha512'
    
    if not passphrase:
        return 'no_signature_passphrase_provided'
    
    # Remove signature from parameters
    params = parameters.copy()
    params.pop('sha_sign', None)
    params.pop('SHASIGN', None)
    
    # Sort keys
    keys = list(params.keys())
    if convert_keys_to_uppercase:
        keys_to_sort = [k.upper() for k in keys]
    else:
        keys_to_sort = keys.copy()
    
    # Sort keys alphabetically
    sorted_indices = sorted(range(len(keys_to_sort)), key=lambda i: keys_to_sort[i])
    sorted_keys = [keys[i] for i in sorted_indices]
    
    # Build SHA string
    sha_string = ""
    for key in sorted_keys:
        value = params[key]
        
        # Skip empty values
        if value is None or value == "" or value is False:
            continue
        
        # Convert key to uppercase if needed
        upper_key = key.upper() if convert_keys_to_uppercase else key
        
        # Append to SHA string
        sha_string += f"{upper_key}={value}{passphrase}"
    
    # Calculate SHA-512 hash
    sha_sign = hashlib.sha512(sha_string.encode()).hexdigest().upper()
    
    return sha_sign


async def log_webhook(
    db: Client,
    event_type: str,
    payload: Dict[str, Any],
    signature_valid: bool,
    order_id: Optional[str] = None,
    product_id: Optional[str] = None,
    error_message: Optional[str] = None
) -> None:
    """Log webhook data for debugging and auditing."""
    try:
        await db.table('digistore24_webhook_logs').insert({
            'event_type': event_type,
            'order_id': order_id,
            'product_id': product_id,
            'raw_payload': payload,
            'signature_valid': signature_valid,
            'processed': error_message is None,
            'error_message': error_message
        }).execute()
    except Exception as e:
        logger.error(f"Failed to log webhook: {str(e)}")


@router.post("/webhook", response_class=PlainTextResponse)
async def handle_digistore24_webhook(
    request: Request,
    db: Client = Depends(get_supabase_client)
):
    """
    Handle Digistore24 IPN webhook notifications.
    
    Returns:
        - "OK" on success (required by Digistore24)
        - Error message on failure
    """
    try:
        # Get form data
        form_data = await request.form()
        payload = dict(form_data)
        
        # Extract event type
        event_type = payload.get('event', 'unknown')
        api_mode = payload.get('api_mode', 'live')
        is_test_mode = api_mode != 'live'
        
        logger.info(f"Received Digistore24 webhook: {event_type} (mode: {api_mode})")
        
        # Validate signature if passphrase is configured
        signature_valid = True
        if settings.DIGISTORE24_IPN_PASSPHRASE:
            received_signature = payload.get('sha_sign', '')
            expected_signature = calculate_signature(
                settings.DIGISTORE24_IPN_PASSPHRASE,
                payload
            )
            signature_valid = received_signature == expected_signature
            
            if not signature_valid:
                logger.error("Invalid webhook signature")
                await log_webhook(
                    db, event_type, payload, False,
                    error_message="Invalid signature"
                )
                return PlainTextResponse("ERROR: invalid sha signature", status_code=401)
        
        # Handle different event types
        if event_type == 'connection_test':
            # Connection test from Digistore24
            logger.info("Connection test successful")
            return PlainTextResponse("OK")
        
        elif event_type == 'on_payment':
            # Process payment
            order_id = payload.get('order_id')
            product_id = payload.get('product_id')
            
            await log_webhook(db, event_type, payload, signature_valid, order_id, product_id)
            
            # Extract payment data
            payment_data = {
                'digistore24_order_id': order_id,
                'digistore24_product_id': product_id,
                'user_id': payload.get('custom', None),  # Custom field for user_id
                'customer_email': payload.get('email'),
                'product_name': payload.get('product_name'),
                'amount': Decimal(str(payload.get('amount', '0'))),
                'currency': payload.get('currency', 'USD'),
                'commission_rate': Decimal(str(payload.get('affiliate_commission_percent', '0'))) / 100,
                'commission': Decimal(str(payload.get('affiliate_commission_value', '0'))),
                'sale_date': datetime.utcnow(),
                'status': 'confirmed',
                'affiliate_network': 'digistore24',
                'payment_method': payload.get('payment_method'),
                'billing_type': payload.get('billing_type'),
                'pay_sequence_no': int(payload.get('pay_sequence_no', 0)),
                'is_test_mode': is_test_mode,
                'ipn_received_at': datetime.utcnow()
            }
            
            # Extract customer details
            payment_data.update({
                'address_first_name': payload.get('address_first_name'),
                'address_last_name': payload.get('address_last_name'),
                'address_street_name': payload.get('address_street_name'),
                'address_street_number': payload.get('address_street_number'),
                'address_city': payload.get('address_city'),
                'address_state': payload.get('address_state'),
                'address_zipcode': payload.get('address_zipcode'),
                'address_phone_no': payload.get('address_phone_no'),
            })
            
            # Store in database
            try:
                # Check if order already exists (idempotency)
                existing = await db.table('affiliate_sales').select('*').eq(
                    'digistore24_order_id', order_id
                ).execute()
                
                if not existing.data:
                    # Insert new sale
                    await db.table('affiliate_sales').insert(payment_data).execute()
                    logger.info(f"Payment recorded: {order_id}")
                else:
                    # Update existing sale
                    await db.table('affiliate_sales').update(payment_data).eq(
                        'digistore24_order_id', order_id
                    ).execute()
                    logger.info(f"Payment updated: {order_id}")
                    
            except Exception as e:
                logger.error(f"Failed to process payment: {str(e)}")
                await log_webhook(
                    db, event_type, payload, signature_valid, order_id, product_id,
                    error_message=str(e)
                )
                return PlainTextResponse(f"ERROR: {str(e)}", status_code=500)
            
            return PlainTextResponse("OK")
        
        elif event_type == 'on_refund':
            # Handle refund
            order_id = payload.get('order_id')
            await log_webhook(db, event_type, payload, signature_valid, order_id)
            
            try:
                # Update sale status to refunded
                await db.table('affiliate_sales').update({
                    'status': 'refunded',
                    'updated_at': datetime.utcnow()
                }).eq('digistore24_order_id', order_id).execute()
                
                logger.info(f"Refund processed: {order_id}")
                
            except Exception as e:
                logger.error(f"Failed to process refund: {str(e)}")
                return PlainTextResponse(f"ERROR: {str(e)}", status_code=500)
            
            return PlainTextResponse("OK")
        
        elif event_type == 'on_chargeback':
            # Handle chargeback
            order_id = payload.get('order_id')
            await log_webhook(db, event_type, payload, signature_valid, order_id)
            
            try:
                # Update sale status to chargeback
                await db.table('affiliate_sales').update({
                    'status': 'chargeback',
                    'updated_at': datetime.utcnow()
                }).eq('digistore24_order_id', order_id).execute()
                
                logger.info(f"Chargeback processed: {order_id}")
                
            except Exception as e:
                logger.error(f"Failed to process chargeback: {str(e)}")
                return PlainTextResponse(f"ERROR: {str(e)}", status_code=500)
            
            return PlainTextResponse("OK")
        
        elif event_type == 'on_payment_missed':
            # Handle missed payment for subscriptions
            order_id = payload.get('order_id')
            await log_webhook(db, event_type, payload, signature_valid, order_id)
            
            logger.info(f"Missed payment notification: {order_id}")
            return PlainTextResponse("OK")
        
        elif event_type == 'on_rebill_resumed':
            # Handle resumed subscription
            order_id = payload.get('order_id')
            await log_webhook(db, event_type, payload, signature_valid, order_id)
            
            logger.info(f"Rebilling resumed: {order_id}")
            return PlainTextResponse("OK")
        
        elif event_type == 'on_rebill_cancelled':
            # Handle cancelled subscription
            order_id = payload.get('order_id')
            await log_webhook(db, event_type, payload, signature_valid, order_id)
            
            logger.info(f"Rebilling cancelled: {order_id}")
            return PlainTextResponse("OK")
        
        elif event_type == 'on_affiliation':
            # Handle new affiliate approval
            await log_webhook(db, event_type, payload, signature_valid)
            
            affiliate_data = {
                'email': payload.get('email'),
                'digistore_id': payload.get('affiliate_name'),
                'promolink': payload.get('affiliate_link'),
                'language': payload.get('language'),
                'product_id': payload.get('product_id'),
                'product_name': payload.get('product_name'),
            }
            
            logger.info(f"New affiliation: {affiliate_data['email']}")
            # TODO: Store affiliate data if needed
            
            return PlainTextResponse("OK")
        
        else:
            # Unknown event type
            logger.warning(f"Unknown event type: {event_type}")
            await log_webhook(db, event_type, payload, signature_valid)
            return PlainTextResponse("OK")
            
    except Exception as e:
        logger.error(f"Webhook processing error: {str(e)}")
        return PlainTextResponse(f"ERROR: {str(e)}", status_code=500)


@router.post("/sync")
async def trigger_product_sync(
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_supabase_client)
):
    """
    Manually trigger a product sync from Digistore24 marketplace.
    Requires authentication.
    """
    # Check if user is admin
    user_settings = await db.table('user_settings').select('*').eq(
        'user_id', current_user.id
    ).single().execute()
    
    if not user_settings.data or user_settings.data.get('preferences', {}).get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Import worker here to avoid circular imports
    from app.workers.digistore24_sync import sync_worker
    
    try:
        # Trigger sync
        result = await sync_worker.force_sync()
        return {
            "success": True,
            "message": "Product sync completed",
            "result": result
        }
    except Exception as e:
        logger.error(f"Manual sync failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")


@router.get("/sync/status")
async def get_sync_status(
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_supabase_client)
):
    """
    Get the status of recent sync operations.
    Requires authentication.
    """
    try:
        # Get recent sync logs
        logs = await db.table('digistore24_sync_logs').select('*').order(
            'created_at', desc=True
        ).limit(10).execute()
        
        # Get product stats
        products = await db.table('shop_products').select('sync_status').not_.is_(
            'digistore24_product_id', None
        ).execute()
        
        active_count = sum(1 for p in products.data if p['sync_status'] == 'active')
        inactive_count = sum(1 for p in products.data if p['sync_status'] == 'inactive')
        
        return {
            "recent_syncs": logs.data,
            "product_stats": {
                "total": len(products.data),
                "active": active_count,
                "inactive": inactive_count
            }
        }
    except Exception as e:
        logger.error(f"Failed to get sync status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")