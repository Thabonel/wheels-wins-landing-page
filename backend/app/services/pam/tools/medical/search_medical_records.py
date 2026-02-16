"""Search Medical Records Tool for PAM

Full-text search across user's medical documents using OCR text.
"""

import logging
from typing import Any, Dict
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


def _extract_snippet(text: str, query: str, max_length: int = SNIPPET_LENGTH) -> str:
    """Extract a text snippet around the first match of query."""
    if not text:
        return ""

    lower_text = text.lower()
    lower_query = query.lower()
    pos = lower_text.find(lower_query)

    if pos == -1:
        # No exact match found - return start of text
        return text[:max_length] + ("..." if len(text) > max_length else "")

    # Center the snippet around the match
    half = max_length // 2
    start = max(0, pos - half)
    end = min(len(text), pos + len(query) + half)

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

    Searches across OCR text, title, and summary fields.

    Args:
        user_id: UUID of the user
        query: Search term to look for in medical documents
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

        # Search in OCR text (primary search)
        ocr_response = (
            supabase.table("medical_records")
            .select("id,type,title,summary,tags,test_date,ocr_text,content_json")
            .eq("user_id", validated.user_id)
            .ilike("ocr_text", f"%{validated.query}%")
            .limit(validated.limit)
            .execute()
        )

        ocr_results = ocr_response.data if ocr_response.data else []
        found_ids = {r["id"] for r in ocr_results}

        # Search in title and summary as fallback
        remaining = validated.limit - len(ocr_results)
        if remaining > 0:
            title_response = (
                supabase.table("medical_records")
                .select("id,type,title,summary,tags,test_date,ocr_text,content_json")
                .eq("user_id", validated.user_id)
                .or_(
                    f"title.ilike.%{validated.query}%,"
                    f"summary.ilike.%{validated.query}%"
                )
                .limit(remaining)
                .execute()
            )

            title_results = title_response.data if title_response.data else []
            # Avoid duplicates
            for r in title_results:
                if r["id"] not in found_ids:
                    ocr_results.append(r)
                    found_ids.add(r["id"])

        # Build results with snippets (strip full OCR text to save tokens)
        results = []
        for record in ocr_results:
            snippet = _extract_snippet(record.get("ocr_text", ""), validated.query)
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
            f"Search for '{validated.query}' found {len(results)} medical records "
            f"for user {validated.user_id}"
        )

        return {
            "success": True,
            "query": validated.query,
            "results_found": len(results),
            "results": results,
            "message": (
                f"Found {len(results)} medical record(s) matching '{validated.query}'"
                if results
                else f"No medical records found matching '{validated.query}'"
            ),
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
