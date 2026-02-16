"""Search Medical Records Tool for PAM

Full-text search across user's medical documents using OCR text.
Splits multi-word queries into individual terms for OR-based matching.
"""

import logging
import re
from typing import Any, Dict, List
from pydantic import ValidationError

from app.integrations.supabase import get_supabase_client
from app.services.pam.schemas.medical import SearchMedicalRecordsInput
from app.services.pam.tools.exceptions import (
    ValidationError as CustomValidationError,
    DatabaseError,
)
from app.services.pam.tools.utils import validate_uuid

logger = logging.getLogger(__name__)

SNIPPET_LENGTH = 500

# Words too common to be useful search terms
STOP_WORDS = {
    "a", "an", "the", "is", "it", "in", "on", "at", "to", "for",
    "of", "and", "or", "my", "me", "i", "do", "if", "no", "so",
    "up", "can", "you", "has", "had", "was", "are", "be", "any",
    "all", "about", "have", "what", "with", "that", "this", "from",
}


def _split_query(query: str) -> List[str]:
    """Split a query into meaningful search terms, filtering stop words."""
    words = re.split(r'\s+', query.lower().strip())
    terms = [w for w in words if len(w) >= 3 and w not in STOP_WORDS]
    # If all words were filtered out, use original words with len >= 2
    if not terms:
        terms = [w for w in words if len(w) >= 2]
    return terms


def _build_or_filter(terms: List[str]) -> str:
    """Build a PostgREST OR filter searching across ocr_text, title, summary."""
    conditions = []
    for term in terms:
        conditions.append(f"ocr_text.ilike.%{term}%")
        conditions.append(f"title.ilike.%{term}%")
        conditions.append(f"summary.ilike.%{term}%")
    return ",".join(conditions)


def _extract_snippet(text: str, terms: List[str], max_length: int = SNIPPET_LENGTH) -> str:
    """Extract a text snippet around the first matching term."""
    if not text:
        return ""

    lower_text = text.lower()

    # Find first matching term position
    best_pos = -1
    matched_term = ""
    for term in terms:
        pos = lower_text.find(term.lower())
        if pos != -1 and (best_pos == -1 or pos < best_pos):
            best_pos = pos
            matched_term = term

    if best_pos == -1:
        return text[:max_length] + ("..." if len(text) > max_length else "")

    # Center the snippet around the match
    half = max_length // 2
    start = max(0, best_pos - half)
    end = min(len(text), best_pos + len(matched_term) + half)

    snippet = text[start:end]
    if start > 0:
        snippet = "..." + snippet
    if end < len(text):
        snippet = snippet + "..."

    return snippet


async def search_medical_records(
    user_id: str,
    query: str,
    limit: int = 10,
    **kwargs,
) -> Dict[str, Any]:
    """
    Search through user's medical documents by keyword.

    Splits multi-word queries into individual terms and searches with OR logic
    across OCR text, title, and summary fields.

    Args:
        user_id: UUID of the user
        query: Search term(s) to look for in medical documents
        limit: Max results to return (default 10)

    Returns:
        Dict with matching records and relevant text snippets

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        validate_uuid(user_id, "user_id")

        try:
            validated = SearchMedicalRecordsInput(
                user_id=user_id,
                query=query,
                limit=limit,
            )
        except ValidationError as e:
            error_msg = e.errors()[0]["msg"]
            raise CustomValidationError(
                f"Invalid input: {error_msg}",
                context={"validation_errors": e.errors()},
            )

        supabase = get_supabase_client()
        terms = _split_query(validated.query)

        if not terms:
            return {
                "success": True,
                "query": validated.query,
                "results_found": 0,
                "results": [],
                "message": "Search query too short or generic. Try specific medical terms.",
            }

        logger.info(
            f"Searching medical records for terms: {terms} "
            f"(original query: '{validated.query}')"
        )

        # Single query searching across all fields with OR logic
        or_filter = _build_or_filter(terms)
        response = (
            supabase.table("medical_records")
            .select("id,type,title,summary,tags,test_date,ocr_text,content_json")
            .eq("user_id", validated.user_id)
            .or_(or_filter)
            .limit(validated.limit)
            .execute()
        )

        records = response.data if response.data else []
        found_ids = {r["id"] for r in records}

        # Also find records with no searchable text (NULL ocr_text and summary)
        # so PAM knows they exist but couldn't be text-searched
        all_response = (
            supabase.table("medical_records")
            .select("id,type,title,test_date")
            .eq("user_id", validated.user_id)
            .is_("ocr_text", "null")
            .limit(validated.limit)
            .execute()
        )
        unsearchable = []
        if all_response.data:
            for r in all_response.data:
                if r["id"] not in found_ids:
                    unsearchable.append({
                        "id": r["id"],
                        "type": r.get("type"),
                        "title": r.get("title"),
                        "test_date": r.get("test_date"),
                        "note": "No OCR text available - document exists but content could not be read",
                    })

        # Build results with snippets (strip full OCR text to save tokens)
        results = []
        for record in records:
            snippet = _extract_snippet(record.get("ocr_text", ""), terms)
            results.append({
                "id": record["id"],
                "type": record.get("type"),
                "title": record.get("title"),
                "summary": record.get("summary"),
                "tags": record.get("tags"),
                "test_date": record.get("test_date"),
                "matching_text": snippet,
                "has_structured_data": bool(record.get("content_json")),
            })

        logger.info(
            f"Search for '{validated.query}' (terms: {terms}) found {len(results)} "
            f"matching + {len(unsearchable)} unsearchable medical records "
            f"for user {validated.user_id}"
        )

        message_parts = []
        if results:
            message_parts.append(
                f"Found {len(results)} medical record(s) matching '{validated.query}'"
            )
        if unsearchable:
            message_parts.append(
                f"{len(unsearchable)} document(s) have no readable text and could not be searched"
            )
        if not results and not unsearchable:
            message_parts.append(
                f"No medical records found matching '{validated.query}'"
            )

        return {
            "success": True,
            "query": validated.query,
            "search_terms": terms,
            "results_found": len(results),
            "results": results,
            "unsearchable_records": unsearchable,
            "message": ". ".join(message_parts),
        }

    except CustomValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            "Unexpected error searching medical records",
            extra={"user_id": user_id, "query": query},
            exc_info=True,
        )
        raise DatabaseError(
            "Failed to search medical records",
            context={"user_id": user_id, "query": query, "error": str(e)},
        )
