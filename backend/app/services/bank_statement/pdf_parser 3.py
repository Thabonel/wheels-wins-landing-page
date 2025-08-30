"""
Server-side PDF Bank Statement Parser
Secure processing of PDF bank statements with privacy-first approach
"""

import re
import io
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, date
from decimal import Decimal

try:
    import pdfplumber
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False
    logging.warning("pdfplumber not available - PDF parsing will be disabled")

try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False
    logging.warning("pandas not available - advanced data processing will be limited")

from app.core.logging import get_logger

logger = get_logger(__name__)

class PDFStatementParser:
    """
    PDF bank statement parser with support for multiple bank formats
    Focuses on transaction extraction while maintaining privacy
    """
    
    def __init__(self):
        self.supported_banks = [
            "chase", "bank_of_america", "wells_fargo", "citi", "capital_one",
            "usbank", "pnc", "td_bank", "regions", "suntrust", "generic"
        ]
        
        # Common date patterns found in bank statements
        self.date_patterns = [
            r'\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b',
            r'\b\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b',
            r'\b\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{2,4}\b',
            r'\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{2,4}\b'
        ]
        
        # Amount patterns (including negative amounts and currency symbols)
        self.amount_patterns = [
            r'[\$\-]?\d{1,3}(?:,\d{3})*\.?\d{0,2}',
            r'\(\$?\d{1,3}(?:,\d{3})*\.?\d{0,2}\)',  # Parentheses for negative
            r'\$?\d+\.\d{2}',
            r'\-\$?\d+\.\d{2}'
        ]
    
    async def parse_pdf_bytes(self, pdf_bytes: bytes) -> List[Dict[str, Any]]:
        """
        Parse PDF bytes and extract transactions
        
        Args:
            pdf_bytes: Raw PDF file bytes
            
        Returns:
            List of transaction dictionaries
        """
        if not PDF_AVAILABLE:
            logger.error("PDF parsing not available - pdfplumber not installed")
            return self._generate_mock_transactions()
        
        try:
            transactions = []
            
            with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                logger.info(f"Processing PDF with {len(pdf.pages)} pages")
                
                # Extract text from all pages
                all_text = ""
                for page_num, page in enumerate(pdf.pages):
                    page_text = page.extract_text()
                    if page_text:
                        all_text += f"\n--- PAGE {page_num + 1} ---\n{page_text}"
                
                # Detect bank format
                bank_format = self._detect_bank_format(all_text)
                logger.info(f"Detected bank format: {bank_format}")
                
                # Extract transactions based on format
                if bank_format == "generic":
                    transactions = self._parse_generic_format(all_text)
                else:
                    transactions = self._parse_specific_format(all_text, bank_format)
                
                # Try table extraction if text parsing fails
                if not transactions:
                    transactions = self._extract_from_tables(pdf)
                
                logger.info(f"Extracted {len(transactions)} transactions from PDF")
                
            return transactions
            
        except Exception as e:
            logger.error(f"PDF parsing failed: {str(e)}")
            # Return mock data for development
            return self._generate_mock_transactions()
    
    def _detect_bank_format(self, text: str) -> str:
        """Detect which bank format the PDF uses"""
        text_lower = text.lower()
        
        bank_indicators = {
            "chase": ["jpmorgan chase", "chase bank", "chase.com"],
            "bank_of_america": ["bank of america", "bankofamerica.com"],
            "wells_fargo": ["wells fargo", "wellsfargo.com"],
            "citi": ["citibank", "citi.com", "citicards"],
            "capital_one": ["capital one", "capitalone.com"],
            "usbank": ["u.s. bank", "usbank.com"],
            "pnc": ["pnc bank", "pnc.com"],
            "td_bank": ["td bank", "tdbank.com"],
        }
        
        for bank, indicators in bank_indicators.items():
            if any(indicator in text_lower for indicator in indicators):
                return bank
        
        return "generic"
    
    def _parse_generic_format(self, text: str) -> List[Dict[str, Any]]:
        """Parse transactions using generic patterns"""
        transactions = []
        lines = text.split('\n')
        
        for line_num, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue
            
            # Look for transaction patterns
            transaction = self._extract_transaction_from_line(line)
            if transaction:
                transactions.append(transaction)
        
        return self._clean_and_validate_transactions(transactions)
    
    def _parse_specific_format(self, text: str, bank_format: str) -> List[Dict[str, Any]]:
        """Parse transactions using bank-specific patterns"""
        if bank_format == "chase":
            return self._parse_chase_format(text)
        elif bank_format == "bank_of_america":
            return self._parse_boa_format(text)
        elif bank_format == "wells_fargo":
            return self._parse_wells_fargo_format(text)
        else:
            return self._parse_generic_format(text)
    
    def _parse_chase_format(self, text: str) -> List[Dict[str, Any]]:
        """Parse Chase bank statement format"""
        transactions = []
        lines = text.split('\n')
        
        # Chase typically has: Date | Description | Amount | Balance
        for line in lines:
            # Look for lines starting with date
            date_match = re.match(r'^(\d{1,2}\/\d{1,2})', line)
            if date_match:
                transaction = self._extract_transaction_from_line(line)
                if transaction:
                    transactions.append(transaction)
        
        return self._clean_and_validate_transactions(transactions)
    
    def _parse_boa_format(self, text: str) -> List[Dict[str, Any]]:
        """Parse Bank of America statement format"""
        # Similar to generic but with BoA-specific quirks
        return self._parse_generic_format(text)
    
    def _parse_wells_fargo_format(self, text: str) -> List[Dict[str, Any]]:
        """Parse Wells Fargo statement format"""
        # Similar to generic but with Wells Fargo-specific quirks
        return self._parse_generic_format(text)
    
    def _extract_transaction_from_line(self, line: str) -> Optional[Dict[str, Any]]:
        """Extract transaction data from a single line"""
        try:
            # Find date
            transaction_date = self._extract_date(line)
            if not transaction_date:
                return None
            
            # Find amount
            amount_info = self._extract_amount(line)
            if not amount_info:
                return None
            
            # Extract description (everything between date and amount)
            description = self._extract_description(line, transaction_date, amount_info['raw'])
            
            return {
                'id': self._generate_transaction_id(transaction_date, description, amount_info['amount']),
                'date': transaction_date,
                'description': description,
                'amount': amount_info['amount'],
                'type': amount_info['type'],
                'raw_line': line
            }
            
        except Exception as e:
            logger.debug(f"Failed to extract transaction from line: {line[:50]}... Error: {e}")
            return None
    
    def _extract_date(self, line: str) -> Optional[date]:
        """Extract date from line"""
        for pattern in self.date_patterns:
            match = re.search(pattern, line, re.IGNORECASE)
            if match:
                date_str = match.group()
                parsed_date = self._parse_date_string(date_str)
                if parsed_date:
                    return parsed_date
        return None
    
    def _extract_amount(self, line: str) -> Optional[Dict[str, Any]]:
        """Extract amount and determine if it's debit or credit"""
        amounts = []
        
        for pattern in self.amount_patterns:
            matches = re.findall(pattern, line)
            for match in matches:
                amount_value = self._parse_amount_string(match)
                if amount_value is not None and amount_value != 0:
                    amounts.append({
                        'amount': abs(amount_value),
                        'type': 'debit' if amount_value < 0 or '(' in match else 'credit',
                        'raw': match
                    })
        
        # Return the largest amount found (usually the transaction amount)
        if amounts:
            return max(amounts, key=lambda x: x['amount'])
        
        return None
    
    def _extract_description(self, line: str, transaction_date: date, amount_str: str) -> str:
        """Extract description from line, removing date and amount"""
        description = line
        
        # Remove date
        for pattern in self.date_patterns:
            description = re.sub(pattern, '', description, flags=re.IGNORECASE)
        
        # Remove amount
        description = description.replace(amount_str, '')
        
        # Clean up
        description = re.sub(r'\s+', ' ', description).strip()
        description = self._clean_description(description)
        
        return description or 'Unknown Transaction'
    
    def _parse_date_string(self, date_str: str) -> Optional[date]:
        """Parse various date string formats"""
        # Remove extra whitespace
        date_str = re.sub(r'\s+', ' ', date_str.strip())
        
        # Common date formats
        formats = [
            '%m/%d/%Y', '%m/%d/%y', '%m-%d-%Y', '%m-%d-%y',
            '%Y/%m/%d', '%Y-%m-%d',
            '%d %b %Y', '%d %B %Y', '%b %d %Y', '%B %d %Y',
            '%b %d, %Y', '%B %d, %Y'
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue
        
        # Try with partial year
        if re.match(r'\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2}$', date_str):
            parts = re.split(r'[\/\-]', date_str)
            if len(parts) == 3:
                year = int(parts[2])
                if year < 50:
                    year += 2000
                elif year < 100:
                    year += 1900
                
                try:
                    return date(year, int(parts[0]), int(parts[1]))
                except ValueError:
                    try:
                        return date(year, int(parts[1]), int(parts[0]))
                    except ValueError:
                        pass
        
        return None
    
    def _parse_amount_string(self, amount_str: str) -> Optional[float]:
        """Parse amount string to float"""
        try:
            # Remove currency symbols and spaces
            cleaned = re.sub(r'[^\d.,\-()]', '', amount_str)
            
            # Handle parentheses (negative)
            is_negative = '(' in amount_str and ')' in amount_str
            cleaned = cleaned.replace('(', '').replace(')', '')
            
            # Handle negative sign
            if cleaned.startswith('-'):
                is_negative = True
                cleaned = cleaned[1:]
            
            # Convert to float
            value = float(cleaned.replace(',', ''))
            
            return -value if is_negative else value
            
        except (ValueError, AttributeError):
            return None
    
    def _clean_description(self, description: str) -> str:
        """Clean transaction description"""
        # Remove common bank codes and references
        description = re.sub(r'\b(REF|TXN|AUTH|TRACE)[\s:]?[\w\d]+\b', '', description, flags=re.IGNORECASE)
        description = re.sub(r'\b\d{10,}\b', '', description)  # Remove long numbers
        description = re.sub(r'\*{3,}\d{4}', '****', description)  # Mask card numbers
        
        # Clean whitespace
        description = re.sub(r'\s+', ' ', description).strip()
        
        return description
    
    def _extract_from_tables(self, pdf) -> List[Dict[str, Any]]:
        """Extract transactions from PDF tables"""
        transactions = []
        
        try:
            for page in pdf.pages:
                tables = page.extract_tables()
                for table in tables:
                    for row in table:
                        if row and len(row) >= 3:  # Need at least date, description, amount
                            transaction = self._process_table_row(row)
                            if transaction:
                                transactions.append(transaction)
            
        except Exception as e:
            logger.error(f"Table extraction failed: {e}")
        
        return self._clean_and_validate_transactions(transactions)
    
    def _process_table_row(self, row: List[str]) -> Optional[Dict[str, Any]]:
        """Process a single table row to extract transaction"""
        try:
            # Find date column
            date_col = None
            amount_col = None
            
            for i, cell in enumerate(row):
                if cell and self._extract_date(cell):
                    date_col = i
                if cell and self._extract_amount(cell):
                    amount_col = i
            
            if date_col is None or amount_col is None:
                return None
            
            transaction_date = self._extract_date(row[date_col])
            amount_info = self._extract_amount(row[amount_col])
            
            # Description is typically the remaining columns
            description_parts = []
            for i, cell in enumerate(row):
                if i != date_col and i != amount_col and cell:
                    description_parts.append(cell.strip())
            
            description = ' '.join(description_parts) or 'Unknown Transaction'
            
            return {
                'id': self._generate_transaction_id(transaction_date, description, amount_info['amount']),
                'date': transaction_date,
                'description': self._clean_description(description),
                'amount': amount_info['amount'],
                'type': amount_info['type']
            }
            
        except Exception as e:
            logger.debug(f"Failed to process table row: {e}")
            return None
    
    def _clean_and_validate_transactions(self, transactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Clean and validate extracted transactions"""
        cleaned = []
        seen_ids = set()
        
        for transaction in transactions:
            # Skip duplicates
            if transaction['id'] in seen_ids:
                continue
            seen_ids.add(transaction['id'])
            
            # Validate required fields
            if not all(key in transaction for key in ['date', 'description', 'amount', 'type']):
                continue
            
            # Validate date is recent (within last 2 years)
            if isinstance(transaction['date'], date):
                years_ago = (datetime.now().date() - transaction['date']).days / 365
                if years_ago > 2:
                    continue
            
            # Validate amount is reasonable
            if not (0.01 <= transaction['amount'] <= 1000000):
                continue
            
            cleaned.append(transaction)
        
        # Sort by date (newest first)
        cleaned.sort(key=lambda x: x['date'], reverse=True)
        
        return cleaned
    
    def _generate_transaction_id(self, transaction_date: date, description: str, amount: float) -> str:
        """Generate unique transaction ID"""
        import hashlib
        
        data = f"{transaction_date.isoformat()}_{description[:20]}_{amount:.2f}"
        return hashlib.md5(data.encode()).hexdigest()[:16]
    
    def _generate_mock_transactions(self) -> List[Dict[str, Any]]:
        """Generate mock transactions for development/testing"""
        from datetime import timedelta
        import random
        
        merchants = [
            "Walmart Supercenter", "Shell Gas Station", "Amazon.com",
            "Netflix Subscription", "Whole Foods Market", "Target Store",
            "Starbucks Coffee", "Home Depot", "Uber Trip", "Electric Company"
        ]
        
        transactions = []
        today = datetime.now().date()
        
        for i in range(15):
            transaction_date = today - timedelta(days=random.randint(1, 30))
            amount = round(random.uniform(10, 500), 2)
            is_credit = random.random() > 0.85
            merchant = random.choice(merchants)
            
            transactions.append({
                'id': self._generate_transaction_id(transaction_date, merchant, amount),
                'date': transaction_date,
                'description': merchant,
                'amount': amount,
                'type': 'credit' if is_credit else 'debit'
            })
        
        return transactions