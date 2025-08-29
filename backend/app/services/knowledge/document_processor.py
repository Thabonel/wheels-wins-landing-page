"""
Document Processing Service
Handles chunking, cleaning, and processing of various content types for vector storage
"""

import re
import logging
import asyncio
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from urllib.parse import urlparse
import hashlib

import aiohttp
from bs4 import BeautifulSoup
import tiktoken
from textstat import flesch_reading_ease

from .vector_store import VectorKnowledgeBase, DocumentChunk

logger = logging.getLogger(__name__)

class ContentCleaner:
    """Handles cleaning and preprocessing of different content types"""
    
    @staticmethod
    def clean_html(html_content: str) -> str:
        """Clean HTML content and extract readable text"""
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style", "nav", "footer", "header"]):
                script.decompose()
            
            # Get text and clean whitespace
            text = soup.get_text()
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            text = ' '.join(chunk for chunk in chunks if chunk)
            
            return text
            
        except Exception as e:
            logger.error(f"❌ Failed to clean HTML: {e}")
            return html_content
    
    @staticmethod
    def clean_api_response(data: Dict[str, Any], content_fields: List[str]) -> str:
        """Extract and clean text from API response"""
        text_parts = []
        
        for field in content_fields:
            if field in data and data[field]:
                if isinstance(data[field], str):
                    text_parts.append(data[field])
                elif isinstance(data[field], list):
                    text_parts.extend([str(item) for item in data[field]])
        
        combined_text = ' '.join(text_parts)
        
        # Clean extra whitespace and normalize
        combined_text = re.sub(r'\s+', ' ', combined_text).strip()
        
        return combined_text
    
    @staticmethod
    def extract_key_information(text: str) -> Dict[str, Any]:
        """Extract key information from text for metadata"""
        # Calculate reading difficulty
        reading_ease = flesch_reading_ease(text)
        
        # Extract potential locations (basic regex)
        location_pattern = r'\b([A-Z][a-z]+ (?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln))\b'
        locations = re.findall(location_pattern, text)
        
        # Extract phone numbers
        phone_pattern = r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b'
        phones = re.findall(phone_pattern, text)
        
        # Extract email addresses
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, text)
        
        # Extract prices
        price_pattern = r'\$\d+(?:\.\d{2})?'
        prices = re.findall(price_pattern, text)
        
        return {
            "reading_ease": reading_ease,
            "locations": locations[:5],  # Limit to first 5
            "phone_numbers": phones[:3],
            "email_addresses": emails[:3],
            "prices": prices[:10],
            "word_count": len(text.split())
        }

class TextChunker:
    """Handles intelligent text chunking for optimal vector storage"""
    
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        
        # Initialize tokenizer for accurate token counting
        try:
            self.encoding = tiktoken.get_encoding("cl100k_base")
        except Exception:
            self.encoding = None
            logger.warning("⚠️ Tiktoken not available, using word-based chunking")
    
    def chunk_by_tokens(self, text: str) -> List[str]:
        """Chunk text by token count for optimal embedding"""
        if not self.encoding:
            return self.chunk_by_words(text)
        
        tokens = self.encoding.encode(text)
        chunks = []
        
        start = 0
        while start < len(tokens):
            end = min(start + self.chunk_size, len(tokens))
            chunk_tokens = tokens[start:end]
            chunk_text = self.encoding.decode(chunk_tokens)
            chunks.append(chunk_text)
            
            # Move start position with overlap
            start = end - self.chunk_overlap
            if start >= len(tokens):
                break
        
        return chunks
    
    def chunk_by_words(self, text: str) -> List[str]:
        """Fallback word-based chunking"""
        words = text.split()
        chunks = []
        
        start = 0
        while start < len(words):
            end = min(start + self.chunk_size, len(words))
            chunk_words = words[start:end]
            chunk_text = ' '.join(chunk_words)
            chunks.append(chunk_text)
            
            start = end - self.chunk_overlap
            if start >= len(words):
                break
        
        return chunks
    
    def smart_chunk(self, text: str, preserve_structure: bool = True) -> List[str]:
        """Intelligent chunking that preserves document structure"""
        if not preserve_structure:
            return self.chunk_by_tokens(text)
        
        # Try to split by paragraphs first
        paragraphs = text.split('\n\n')
        chunks = []
        current_chunk = ""
        
        for paragraph in paragraphs:
            paragraph = paragraph.strip()
            if not paragraph:
                continue
            
            # Check if adding this paragraph would exceed chunk size
            potential_chunk = current_chunk + "\n\n" + paragraph if current_chunk else paragraph
            
            if self._get_token_count(potential_chunk) <= self.chunk_size:
                current_chunk = potential_chunk
            else:
                # Add current chunk if it exists
                if current_chunk:
                    chunks.append(current_chunk.strip())
                
                # If paragraph itself is too large, split it
                if self._get_token_count(paragraph) > self.chunk_size:
                    sub_chunks = self.chunk_by_tokens(paragraph)
                    chunks.extend(sub_chunks)
                    current_chunk = ""
                else:
                    current_chunk = paragraph
        
        # Add the last chunk
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        return chunks
    
    def _get_token_count(self, text: str) -> int:
        """Get token count for text"""
        if self.encoding:
            return len(self.encoding.encode(text))
        else:
            return len(text.split())  # Rough approximation

class DocumentProcessor:
    """Main document processing service"""
    
    def __init__(self, vector_store: VectorKnowledgeBase):
        self.vector_store = vector_store
        self.cleaner = ContentCleaner()
        self.chunker = TextChunker()
        self.session = None
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session"""
        if not self.session:
            timeout = aiohttp.ClientTimeout(total=30)
            self.session = aiohttp.ClientSession(timeout=timeout)
        return self.session
    
    async def close(self):
        """Close the aiohttp session"""
        if self.session:
            await self.session.close()
            self.session = None
    
    async def process_web_content(
        self, 
        url: str, 
        content_type: str = "general",
        collection_name: str = "general_knowledge"
    ) -> List[str]:
        """Process web content and store in vector database"""
        try:
            session = await self._get_session()
            
            async with session.get(url) as response:
                if response.status != 200:
                    raise Exception(f"HTTP {response.status}: {await response.text()}")
                
                html_content = await response.text()
            
            # Clean HTML and extract text
            clean_text = self.cleaner.clean_html(html_content)
            
            if not clean_text or len(clean_text) < 100:
                logger.warning(f"⚠️ Insufficient content from {url}")
                return []
            
            # Extract metadata
            metadata = self.cleaner.extract_key_information(clean_text)
            
            # Add source information
            parsed_url = urlparse(url)
            base_metadata = {
                "url": url,
                "domain": parsed_url.netloc,
                "content_type": content_type,
                "processed_at": datetime.utcnow().isoformat(),
                **metadata
            }
            
            # Chunk the content
            chunks = self.chunker.smart_chunk(clean_text)
            
            # Create document chunks
            documents = []
            for i, chunk in enumerate(chunks):
                chunk_metadata = {
                    **base_metadata,
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                    "chunk_hash": hashlib.md5(chunk.encode()).hexdigest()
                }
                
                doc = DocumentChunk(
                    content=chunk,
                    metadata=chunk_metadata,
                    source=f"web_scraping:{parsed_url.netloc}",
                    created_at=datetime.utcnow()
                )
                documents.append(doc)
            
            # Store in vector database
            chunk_ids = await self.vector_store.add_documents(collection_name, documents)
            
            logger.info(f"✅ Processed {url}: {len(chunks)} chunks stored")
            return chunk_ids
            
        except Exception as e:
            logger.error(f"❌ Failed to process web content from {url}: {e}")
            return []
    
    async def process_api_data(
        self, 
        data: Dict[str, Any], 
        source: str,
        content_fields: List[str],
        collection_name: str = "local_businesses"
    ) -> List[str]:
        """Process API response data and store in vector database"""
        try:
            # Extract text from specified fields
            clean_text = self.cleaner.clean_api_response(data, content_fields)
            
            if not clean_text or len(clean_text) < 50:
                logger.warning(f"⚠️ Insufficient content from API data")
                return []
            
            # Create metadata from API data
            metadata = {
                "source_api": source,
                "processed_at": datetime.utcnow().isoformat(),
                "api_data": {
                    key: value for key, value in data.items() 
                    if key not in content_fields and isinstance(value, (str, int, float, bool))
                }
            }
            
            # Add location data if available
            if "latitude" in data and "longitude" in data:
                metadata["latitude"] = float(data["latitude"])
                metadata["longitude"] = float(data["longitude"])
            
            if "address" in data:
                metadata["address"] = data["address"]
            
            # Extract additional metadata
            extracted_metadata = self.cleaner.extract_key_information(clean_text)
            metadata.update(extracted_metadata)
            
            # For API data, usually don't need chunking, but check size
            if len(clean_text) > 2000:
                chunks = self.chunker.chunk_by_tokens(clean_text)
            else:
                chunks = [clean_text]
            
            # Create document chunks
            documents = []
            for i, chunk in enumerate(chunks):
                chunk_metadata = {
                    **metadata,
                    "chunk_index": i,
                    "total_chunks": len(chunks)
                }
                
                doc = DocumentChunk(
                    content=chunk,
                    metadata=chunk_metadata,
                    source=f"api:{source}",
                    created_at=datetime.utcnow()
                )
                documents.append(doc)
            
            # Store in vector database
            chunk_ids = await self.vector_store.add_documents(collection_name, documents)
            
            logger.info(f"✅ Processed API data from {source}: {len(chunks)} chunks stored")
            return chunk_ids
            
        except Exception as e:
            logger.error(f"❌ Failed to process API data from {source}: {e}")
            return []
    
    async def process_location_data(
        self,
        location_info: Dict[str, Any],
        user_location: Tuple[float, float]
    ) -> List[str]:
        """Process location-specific data with geographic context"""
        try:
            # Extract location details
            name = location_info.get("name", "Unknown Location")
            description = location_info.get("description", "")
            address = location_info.get("address", "")
            
            # Combine text content
            content_parts = [name]
            if description:
                content_parts.append(description)
            if address:
                content_parts.append(f"Located at: {address}")
            
            content = " | ".join(content_parts)
            
            # Calculate distance from user if coordinates available
            distance = None
            if "latitude" in location_info and "longitude" in location_info:
                lat_diff = float(location_info["latitude"]) - user_location[0]
                lon_diff = float(location_info["longitude"]) - user_location[1]
                distance = (lat_diff**2 + lon_diff**2)**0.5 * 111  # Rough km conversion
            
            # Create metadata
            metadata = {
                "location_type": location_info.get("type", "general"),
                "latitude": location_info.get("latitude"),
                "longitude": location_info.get("longitude"),
                "address": address,
                "distance_km": distance,
                "user_latitude": user_location[0],
                "user_longitude": user_location[1],
                "processed_at": datetime.utcnow().isoformat()
            }
            
            # Add any additional fields
            for key, value in location_info.items():
                if key not in ["name", "description", "address", "latitude", "longitude", "type"]:
                    if isinstance(value, (str, int, float, bool)):
                        metadata[key] = value
            
            doc = DocumentChunk(
                content=content,
                metadata=metadata,
                source="location_data",
                created_at=datetime.utcnow()
            )
            
            chunk_ids = await self.vector_store.add_documents("location_data", [doc])
            
            logger.info(f"✅ Processed location: {name}")
            return chunk_ids
            
        except Exception as e:
            logger.error(f"❌ Failed to process location data: {e}")
            return []
    
    async def batch_process_urls(
        self, 
        urls: List[str], 
        content_type: str = "general",
        max_concurrent: int = 5
    ) -> Dict[str, List[str]]:
        """Process multiple URLs concurrently"""
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def process_single_url(url: str) -> Tuple[str, List[str]]:
            async with semaphore:
                chunk_ids = await self.process_web_content(url, content_type)
                await asyncio.sleep(1)  # Rate limiting
                return url, chunk_ids
        
        tasks = [process_single_url(url) for url in urls]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        processed_results = {}
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"❌ Batch processing error: {result}")
                continue
            
            url, chunk_ids = result
            processed_results[url] = chunk_ids
        
        return processed_results