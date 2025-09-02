"""
PAM Financial Data & Banking API Integration System
Comprehensive integration with Australian banks, financial institutions,
and open banking APIs for expense tracking and financial management.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Union
from dataclasses import dataclass, asdict
from enum import Enum
import aiohttp
import hashlib
from decimal import Decimal
import base64
from cryptography.fernet import Fernet
import jwt

from app.core.config import get_settings
from app.services.database import get_database
from app.core.security import encrypt_sensitive_data, decrypt_sensitive_data

settings = get_settings()
logger = logging.getLogger(__name__)

class BankingProvider(Enum):
    """Supported Australian banking providers"""
    COMMONWEALTH_BANK = "commonwealth_bank"
    ANZ = "anz"
    WESTPAC = "westpac"
    NAB = "nab"
    BENDIGO_BANK = "bendigo_bank"
    SUNCORP = "suncorp"
    ING_AUSTRALIA = "ing_australia"
    MACQUARIE_BANK = "macquarie_bank"
    BANKWEST = "bankwest"
    ST_GEORGE = "st_george"
    BANK_OF_MELBOURNE = "bank_of_melbourne"
    BANK_SA = "bank_sa"
    
    # Open Banking Providers
    FROLLO = "frollo"
    BASIQ = "basiq"
    YODLEE = "yodlee"
    PLAID_AU = "plaid_au"

class AccountType(Enum):
    """Types of financial accounts"""
    TRANSACTION = "transaction"
    SAVINGS = "savings"
    TERM_DEPOSIT = "term_deposit"
    CREDIT_CARD = "credit_card"
    HOME_LOAN = "home_loan"
    PERSONAL_LOAN = "personal_loan"
    BUSINESS = "business"
    JOINT = "joint"
    INVESTMENT = "investment"

class TransactionCategory(Enum):
    """Transaction categorization"""
    ACCOMMODATION = "accommodation"
    FUEL = "fuel"
    FOOD = "food"
    GROCERIES = "groceries"
    ENTERTAINMENT = "entertainment"
    SHOPPING = "shopping"
    TRANSPORT = "transport"
    UTILITIES = "utilities"
    INSURANCE = "insurance"
    MEDICAL = "medical"
    EDUCATION = "education"
    GIFTS = "gifts"
    TRANSFERS = "transfers"
    FEES = "fees"
    INCOME = "income"
    OTHER = "other"

class TransactionType(Enum):
    """Types of transactions"""
    DEBIT = "debit"
    CREDIT = "credit"
    TRANSFER = "transfer"
    PAYMENT = "payment"
    WITHDRAWAL = "withdrawal"
    DEPOSIT = "deposit"

@dataclass
class BankAccount:
    """Bank account information"""
    account_id: str
    provider: BankingProvider
    account_number: str
    account_name: str
    account_type: AccountType
    balance: Decimal
    available_balance: Decimal
    currency: str
    bsb: Optional[str]
    product_name: str
    is_active: bool
    created_date: datetime
    last_updated: datetime
    metadata: Dict[str, Any]

@dataclass
class Transaction:
    """Financial transaction"""
    transaction_id: str
    account_id: str
    provider: BankingProvider
    transaction_type: TransactionType
    amount: Decimal
    currency: str
    description: str
    category: TransactionCategory
    subcategory: Optional[str]
    merchant_name: Optional[str]
    merchant_location: Optional[str]
    transaction_date: datetime
    posted_date: datetime
    balance_after: Optional[Decimal]
    reference: Optional[str]
    is_travel_related: bool
    location_data: Optional[Dict[str, Any]]
    metadata: Dict[str, Any]

@dataclass
class FinancialInsight:
    """Financial analysis insight"""
    insight_id: str
    insight_type: str
    title: str
    description: str
    impact_level: str  # low, medium, high
    category: str
    data_points: List[Dict[str, Any]]
    recommendations: List[str]
    confidence: float
    generated_at: datetime
    expires_at: Optional[datetime]

@dataclass
class BudgetAnalysis:
    """Budget analysis and tracking"""
    analysis_id: str
    user_id: str
    period_start: datetime
    period_end: datetime
    total_income: Decimal
    total_expenses: Decimal
    category_breakdown: Dict[str, Decimal]
    budget_vs_actual: Dict[str, Dict[str, Decimal]]
    travel_expenses: Decimal
    savings_rate: float
    insights: List[FinancialInsight]
    generated_at: datetime

class PAMFinancialDataSystem:
    """
    Comprehensive financial data integration system for PAM.
    
    Features:
    - Open Banking API integration with major Australian banks
    - Secure transaction synchronization and categorization
    - Automated expense tracking and travel expense identification
    - Budget analysis and financial insights
    - Real-time account balance monitoring
    - Intelligent transaction categorization using AI
    - Financial goal tracking and recommendations
    - Fraud detection and unusual spending alerts
    """
    
    def __init__(self):
        self.db = get_database()
        self.session = None
        
        # Encryption key for sensitive financial data
        self.encryption_key = settings.FINANCIAL_ENCRYPTION_KEY or Fernet.generate_key()
        self.cipher_suite = Fernet(self.encryption_key)
        
        # Provider configurations
        self.provider_configs = {
            BankingProvider.COMMONWEALTH_BANK: {
                "base_url": "https://api.commbank.com.au/retail/v1",
                "auth_url": "https://api.commbank.com.au/retail/oauth2/token",
                "scopes": ["bank:accounts.basic:read", "bank:transactions:read"],
                "rate_limit": 100,
                "timeout": 30
            },
            BankingProvider.ANZ: {
                "base_url": "https://api.anz.com.au/v1",
                "auth_url": "https://api.anz.com.au/oauth2/token",
                "scopes": ["accounts", "transactions"],
                "rate_limit": 60,
                "timeout": 30
            },
            BankingProvider.BASIQ: {
                "base_url": "https://au-api.basiq.io",
                "auth_url": "https://au-api.basiq.io/token",
                "scopes": ["SERVER_ACCESS"],
                "rate_limit": 200,
                "timeout": 20
            },
            BankingProvider.FROLLO: {
                "base_url": "https://api.frollo.us/v2",
                "auth_url": "https://api.frollo.us/v2/oauth/token",
                "scopes": ["aggregation", "insights"],
                "rate_limit": 150,
                "timeout": 25
            }
        }
        
        # API credentials (encrypted)
        self.api_credentials = {}
        
        # Transaction categorization rules
        self.categorization_rules = self._initialize_categorization_rules()
        
        # Travel expense detection patterns
        self.travel_patterns = self._initialize_travel_patterns()
        
        # Initialize system
        asyncio.create_task(self._initialize_financial_system())
    
    async def _initialize_financial_system(self):
        """Initialize financial data system"""
        try:
            # Create HTTP session
            self.session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=60),
                headers={
                    "User-Agent": "PAM-Financial-Assistant/1.0",
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                }
            )
            
            # Load API credentials
            await self._load_financial_credentials()
            
            logger.info("Financial data system initialized")
            
        except Exception as e:
            logger.error(f"Error initializing financial system: {e}")
    
    async def connect_bank_account(
        self,
        user_id: str,
        provider: BankingProvider,
        auth_code: str,
        redirect_uri: str
    ) -> Dict[str, Any]:
        """
        Connect a bank account using Open Banking OAuth flow.
        
        Args:
            user_id: User identifier
            provider: Banking provider
            auth_code: Authorization code from OAuth flow
            redirect_uri: Redirect URI used in OAuth flow
            
        Returns:
            Connection result with account details
        """
        try:
            # Exchange auth code for access token
            token_result = await self._exchange_auth_code(provider, auth_code, redirect_uri)
            if not token_result["success"]:
                return {"success": False, "error": token_result["error"]}
            
            access_token = token_result["access_token"]
            refresh_token = token_result["refresh_token"]
            
            # Fetch account information
            accounts = await self._fetch_accounts(provider, access_token)
            
            # Store encrypted credentials
            await self._store_bank_credentials(
                user_id, provider, access_token, refresh_token
            )
            
            # Store account information
            stored_accounts = []
            for account_data in accounts:
                account = self._create_bank_account(account_data, provider)
                await self._store_bank_account(user_id, account)
                stored_accounts.append(account)
            
            # Initial transaction sync
            await self._sync_transactions(user_id, provider, stored_accounts, access_token)
            
            return {
                "success": True,
                "accounts": [asdict(acc) for acc in stored_accounts],
                "message": f"Successfully connected to {provider.value}"
            }
            
        except Exception as e:
            logger.error(f"Error connecting bank account: {e}")
            return {"success": False, "error": str(e)}
    
    async def sync_transactions(
        self,
        user_id: str,
        provider: Optional[BankingProvider] = None,
        from_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Synchronize transactions from connected bank accounts.
        
        Args:
            user_id: User identifier
            provider: Optional specific provider to sync
            from_date: Optional start date for sync
            
        Returns:
            Sync results with transaction counts
        """
        try:
            # Get connected accounts
            connected_accounts = await self._get_connected_accounts(user_id, provider)
            
            if not connected_accounts:
                return {"success": False, "error": "No connected accounts found"}
            
            sync_results = {}
            total_synced = 0
            
            for provider_name, accounts in connected_accounts.items():
                provider_enum = BankingProvider(provider_name)
                
                # Get access token
                token = await self._get_access_token(user_id, provider_enum)
                if not token:
                    continue
                
                # Sync transactions for each account
                for account in accounts:
                    try:
                        transactions = await self._fetch_transactions(
                            provider_enum, token, account["account_id"], from_date
                        )
                        
                        # Process and store transactions
                        processed_count = 0
                        for txn_data in transactions:
                            transaction = await self._process_transaction(
                                txn_data, provider_enum, user_id
                            )
                            if transaction:
                                await self._store_transaction(transaction)
                                processed_count += 1
                        
                        sync_results[account["account_id"]] = processed_count
                        total_synced += processed_count
                        
                    except Exception as e:
                        logger.error(f"Error syncing account {account['account_id']}: {e}")
                        sync_results[account["account_id"]] = 0
            
            # Update sync timestamp
            await self._update_sync_timestamp(user_id)
            
            return {
                "success": True,
                "total_synced": total_synced,
                "account_results": sync_results,
                "sync_timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error syncing transactions: {e}")
            return {"success": False, "error": str(e)}
    
    async def categorize_transactions(
        self,
        user_id: str,
        account_id: Optional[str] = None,
        from_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Automatically categorize transactions using AI and rules.
        
        Args:
            user_id: User identifier
            account_id: Optional specific account
            from_date: Optional start date for categorization
            
        Returns:
            Categorization results
        """
        try:
            # Get uncategorized transactions
            transactions = await self._get_uncategorized_transactions(
                user_id, account_id, from_date
            )
            
            categorized_count = 0
            travel_count = 0
            
            for transaction in transactions:
                # Apply categorization rules
                category = await self._categorize_transaction(transaction)
                
                # Check if travel-related
                is_travel_related = await self._detect_travel_expense(transaction)
                
                # Update transaction
                await self._update_transaction_category(
                    transaction.transaction_id, category, is_travel_related
                )
                
                categorized_count += 1
                if is_travel_related:
                    travel_count += 1
            
            return {
                "success": True,
                "categorized_count": categorized_count,
                "travel_expenses_found": travel_count,
                "categories_used": list(set([await self._categorize_transaction(t) for t in transactions]))
            }
            
        except Exception as e:
            logger.error(f"Error categorizing transactions: {e}")
            return {"success": False, "error": str(e)}
    
    async def generate_budget_analysis(
        self,
        user_id: str,
        period_months: int = 3,
        include_predictions: bool = True
    ) -> BudgetAnalysis:
        """
        Generate comprehensive budget analysis.
        
        Args:
            user_id: User identifier
            period_months: Number of months to analyze
            include_predictions: Whether to include spending predictions
            
        Returns:
            Detailed budget analysis
        """
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=period_months * 30)
            
            # Get transactions for analysis period
            transactions = await self._get_transactions_for_period(user_id, start_date, end_date)
            
            # Calculate income and expenses
            total_income = sum(t.amount for t in transactions if t.transaction_type == TransactionType.CREDIT)
            total_expenses = sum(abs(t.amount) for t in transactions if t.transaction_type == TransactionType.DEBIT)
            
            # Category breakdown
            category_breakdown = {}
            for transaction in transactions:
                if transaction.transaction_type == TransactionType.DEBIT:
                    category = transaction.category.value
                    category_breakdown[category] = category_breakdown.get(category, Decimal(0)) + abs(transaction.amount)
            
            # Travel expenses
            travel_expenses = sum(
                abs(t.amount) for t in transactions 
                if t.is_travel_related and t.transaction_type == TransactionType.DEBIT
            )
            
            # Savings rate
            savings_rate = float((total_income - total_expenses) / total_income) if total_income > 0 else 0
            
            # Generate insights
            insights = await self._generate_financial_insights(
                transactions, total_income, total_expenses, category_breakdown, travel_expenses
            )
            
            # Get user's budget targets (if any)
            budget_targets = await self._get_user_budget_targets(user_id)
            budget_vs_actual = {}
            
            for category, actual in category_breakdown.items():
                target = budget_targets.get(category, Decimal(0))
                budget_vs_actual[category] = {
                    "target": target,
                    "actual": actual,
                    "variance": actual - target,
                    "percentage": float(actual / target * 100) if target > 0 else 0
                }
            
            analysis = BudgetAnalysis(
                analysis_id=f"analysis_{user_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
                user_id=user_id,
                period_start=start_date,
                period_end=end_date,
                total_income=total_income,
                total_expenses=total_expenses,
                category_breakdown=category_breakdown,
                budget_vs_actual=budget_vs_actual,
                travel_expenses=travel_expenses,
                savings_rate=savings_rate,
                insights=insights,
                generated_at=datetime.utcnow()
            )
            
            # Store analysis
            await self._store_budget_analysis(analysis)
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error generating budget analysis: {e}")
            return self._create_empty_budget_analysis(user_id)
    
    async def detect_unusual_spending(
        self,
        user_id: str,
        sensitivity: str = "medium"
    ) -> List[Dict[str, Any]]:
        """
        Detect unusual spending patterns and potential fraud.
        
        Args:
            user_id: User identifier
            sensitivity: Detection sensitivity (low, medium, high)
            
        Returns:
            List of unusual spending alerts
        """
        try:
            # Get recent transactions (last 30 days)
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=30)
            recent_transactions = await self._get_transactions_for_period(user_id, start_date, end_date)
            
            # Get historical baseline (last 6 months, excluding recent 30 days)
            baseline_end = start_date
            baseline_start = baseline_end - timedelta(days=180)
            baseline_transactions = await self._get_transactions_for_period(user_id, baseline_start, baseline_end)
            
            alerts = []
            
            # Amount anomalies
            amount_alerts = await self._detect_amount_anomalies(
                recent_transactions, baseline_transactions, sensitivity
            )
            alerts.extend(amount_alerts)
            
            # Frequency anomalies
            frequency_alerts = await self._detect_frequency_anomalies(
                recent_transactions, baseline_transactions, sensitivity
            )
            alerts.extend(frequency_alerts)
            
            # Location anomalies (for travel-related spending)
            location_alerts = await self._detect_location_anomalies(
                recent_transactions, baseline_transactions, sensitivity
            )
            alerts.extend(location_alerts)
            
            # Merchant anomalies
            merchant_alerts = await self._detect_merchant_anomalies(
                recent_transactions, baseline_transactions, sensitivity
            )
            alerts.extend(merchant_alerts)
            
            # Store alerts
            for alert in alerts:
                await self._store_spending_alert(user_id, alert)
            
            return alerts
            
        except Exception as e:
            logger.error(f"Error detecting unusual spending: {e}")
            return []
    
    async def get_financial_insights(
        self,
        user_id: str,
        insight_types: Optional[List[str]] = None,
        time_period: str = "monthly"
    ) -> List[FinancialInsight]:
        """
        Get personalized financial insights and recommendations.
        
        Args:
            user_id: User identifier
            insight_types: Optional specific insight types to generate
            time_period: Time period for analysis
            
        Returns:
            List of financial insights
        """
        try:
            # Determine analysis period
            if time_period == "weekly":
                period_days = 7
            elif time_period == "monthly":
                period_days = 30
            elif time_period == "quarterly":
                period_days = 90
            else:
                period_days = 30
            
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=period_days)
            
            # Get transactions for analysis
            transactions = await self._get_transactions_for_period(user_id, start_date, end_date)
            
            insights = []
            
            # Generate different types of insights
            if not insight_types or "spending_trends" in insight_types:
                spending_insights = await self._analyze_spending_trends(transactions, user_id)
                insights.extend(spending_insights)
            
            if not insight_types or "savings_opportunities" in insight_types:
                savings_insights = await self._identify_savings_opportunities(transactions, user_id)
                insights.extend(savings_insights)
            
            if not insight_types or "travel_spending" in insight_types:
                travel_insights = await self._analyze_travel_spending(transactions, user_id)
                insights.extend(travel_insights)
            
            if not insight_types or "budget_performance" in insight_types:
                budget_insights = await self._analyze_budget_performance(transactions, user_id)
                insights.extend(budget_insights)
            
            # Store insights
            for insight in insights:
                await self._store_financial_insight(insight)
            
            return insights
            
        except Exception as e:
            logger.error(f"Error generating financial insights: {e}")
            return []
    
    # Private helper methods
    
    async def _exchange_auth_code(
        self,
        provider: BankingProvider,
        auth_code: str,
        redirect_uri: str
    ) -> Dict[str, Any]:
        """Exchange OAuth authorization code for access token"""
        try:
            config = self.provider_configs[provider]
            credentials = self.api_credentials.get(provider.value, {})
            
            token_data = {
                "grant_type": "authorization_code",
                "code": auth_code,
                "redirect_uri": redirect_uri,
                "client_id": credentials.get("client_id"),
                "client_secret": credentials.get("client_secret")
            }
            
            async with self.session.post(
                config["auth_url"],
                data=token_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            ) as response:
                
                if response.status != 200:
                    error_text = await response.text()
                    return {"success": False, "error": f"Token exchange failed: {error_text}"}
                
                token_response = await response.json()
                
                return {
                    "success": True,
                    "access_token": token_response["access_token"],
                    "refresh_token": token_response.get("refresh_token"),
                    "expires_in": token_response.get("expires_in", 3600)
                }
                
        except Exception as e:
            logger.error(f"Error exchanging auth code: {e}")
            return {"success": False, "error": str(e)}
    
    def _initialize_categorization_rules(self) -> Dict[str, List[str]]:
        """Initialize transaction categorization rules"""
        return {
            TransactionCategory.ACCOMMODATION.value: [
                "hotel", "motel", "accommodation", "booking", "airbnb", "hostel",
                "caravan park", "camping", "resort", "lodge", "inn", "b&b"
            ],
            TransactionCategory.FUEL.value: [
                "bp", "shell", "caltex", "mobil", "7-eleven", "united", "ampol",
                "fuel", "petrol", "gas", "servo", "service station"
            ],
            TransactionCategory.FOOD.value: [
                "restaurant", "cafe", "mcdonald", "kfc", "hungry", "pizza",
                "bakery", "takeaway", "food", "dining", "bistro", "pub"
            ],
            TransactionCategory.GROCERIES.value: [
                "woolworths", "coles", "aldi", "iga", "supermarket", "grocery",
                "market", "fresh", "butcher", "produce"
            ],
            TransactionCategory.TRANSPORT.value: [
                "uber", "taxi", "bus", "train", "toll", "parking", "ferry",
                "transport", "transit", "metro", "tram"
            ],
            TransactionCategory.ENTERTAINMENT.value: [
                "cinema", "movie", "theatre", "concert", "show", "museum",
                "attraction", "tour", "activity", "adventure"
            ]
        }
    
    def _initialize_travel_patterns(self) -> List[str]:
        """Initialize travel expense detection patterns"""
        return [
            # Location-based patterns
            r"(?i)(highway|motorway|freeway|tourist|visitor|attraction)",
            r"(?i)(caravan|camp|rv|motorhome|big4|discovery)",
            r"(?i)(airport|airline|flight|jetstar|qantas|virgin)",
            r"(?i)(hotel|motel|accommodation|resort|lodge)",
            
            # Activity patterns
            r"(?i)(tour|cruise|excursion|adventure|experience)",
            r"(?i)(national park|tourist info|visitor centre)",
            
            # Distance patterns (transactions far from home location)
            # This would require geolocation data
        ]
    
    async def _categorize_transaction(self, transaction: Transaction) -> TransactionCategory:
        """Categorize a single transaction using rules and AI"""
        try:
            description = transaction.description.lower()
            merchant = (transaction.merchant_name or "").lower()
            
            # Rule-based categorization first
            for category, keywords in self.categorization_rules.items():
                if any(keyword in description or keyword in merchant for keyword in keywords):
                    return TransactionCategory(category)
            
            # AI-based categorization for complex cases
            return await self._ai_categorize_transaction(transaction)
            
        except Exception as e:
            logger.error(f"Error categorizing transaction: {e}")
            return TransactionCategory.OTHER
    
    async def _detect_travel_expense(self, transaction: Transaction) -> bool:
        """Detect if transaction is travel-related"""
        try:
            text_to_check = f"{transaction.description} {transaction.merchant_name or ''}".lower()
            
            # Pattern-based detection
            import re
            for pattern in self.travel_patterns:
                if re.search(pattern, text_to_check):
                    return True
            
            # Location-based detection (if available)
            if transaction.location_data:
                home_location = await self._get_user_home_location(transaction.account_id)
                if home_location:
                    distance = self._calculate_distance(
                        transaction.location_data, home_location
                    )
                    # Consider transactions >50km from home as potential travel
                    if distance > 50:
                        return True
            
            # Category-based detection
            travel_categories = [
                TransactionCategory.ACCOMMODATION,
                TransactionCategory.FUEL,  # When combined with location
                TransactionCategory.TRANSPORT
            ]
            
            return transaction.category in travel_categories
            
        except Exception as e:
            logger.error(f"Error detecting travel expense: {e}")
            return False
    
    async def _store_bank_account(self, user_id: str, account: BankAccount):
        """Store bank account information"""
        try:
            query = """
            INSERT INTO pam_bank_accounts (
                account_id, user_id, provider, account_number, account_name,
                account_type, balance, available_balance, currency, bsb,
                product_name, is_active, created_date, last_updated, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            ON CONFLICT (account_id) DO UPDATE SET
                balance = EXCLUDED.balance,
                available_balance = EXCLUDED.available_balance,
                last_updated = EXCLUDED.last_updated
            """
            
            await self.db.execute(
                query,
                account.account_id,
                user_id,
                account.provider.value,
                account.account_number,
                account.account_name,
                account.account_type.value,
                float(account.balance),
                float(account.available_balance),
                account.currency,
                account.bsb,
                account.product_name,
                account.is_active,
                account.created_date,
                account.last_updated,
                json.dumps(account.metadata)
            )
            
        except Exception as e:
            logger.error(f"Error storing bank account: {e}")


# Global financial data system instance
financial_data_system = PAMFinancialDataSystem()

# Utility functions for easy integration

async def connect_bank(
    user_id: str,
    provider: str,
    auth_code: str,
    redirect_uri: str
) -> Dict[str, Any]:
    """Convenience function for connecting bank account"""
    banking_provider = BankingProvider(provider)
    return await financial_data_system.connect_bank_account(
        user_id=user_id,
        provider=banking_provider,
        auth_code=auth_code,
        redirect_uri=redirect_uri
    )

async def sync_bank_transactions(
    user_id: str,
    provider: Optional[str] = None,
    days_back: int = 30
) -> Dict[str, Any]:
    """Convenience function for syncing transactions"""
    from_date = datetime.utcnow() - timedelta(days=days_back)
    banking_provider = BankingProvider(provider) if provider else None
    
    return await financial_data_system.sync_transactions(
        user_id=user_id,
        provider=banking_provider,
        from_date=from_date
    )

async def analyze_budget(
    user_id: str,
    months: int = 3
) -> BudgetAnalysis:
    """Convenience function for budget analysis"""
    return await financial_data_system.generate_budget_analysis(
        user_id=user_id,
        period_months=months,
        include_predictions=True
    )

async def get_spending_insights(
    user_id: str,
    period: str = "monthly"
) -> List[FinancialInsight]:
    """Convenience function for financial insights"""
    return await financial_data_system.get_financial_insights(
        user_id=user_id,
        time_period=period
    )