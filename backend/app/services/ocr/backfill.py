"""Backfill OCR text for medical records with documents but no extracted text.

Run manually after deploying the unified OCR service:
    cd backend && python -m app.services.ocr.backfill

Queries medical_records where ocr_text IS NULL and document_url IS NOT NULL,
downloads each document from Supabase storage, runs it through the OCR pipeline,
and updates the ocr_text column.
"""
import asyncio
import sys
import time

from app.core.logging import get_logger

logger = get_logger(__name__)


def get_supabase_client():
    from app.core.database import get_supabase_client as _get
    return _get()


async def backfill_medical_records(dry_run: bool = False, limit: int = 100):
    """Backfill ocr_text for medical records missing it."""
    from app.services.ocr.service import OCRService

    client = get_supabase_client()
    service = OCRService()

    # Find records with documents but no OCR text
    response = (
        client.table("medical_records")
        .select("id, document_url, title")
        .is_("ocr_text", "null")
        .not_.is_("document_url", "null")
        .limit(limit)
        .execute()
    )

    records = response.data or []
    total = len(records)
    logger.info(f"Found {total} medical records needing OCR backfill")

    if dry_run:
        for r in records:
            logger.info(f"  [DRY RUN] Would process: {r['id']} - {r.get('title', 'untitled')} ({r['document_url']})")
        return

    success = 0
    failed = 0

    for i, record in enumerate(records, 1):
        record_id = record["id"]
        doc_url = record["document_url"]
        title = record.get("title", "untitled")

        logger.info(f"[{i}/{total}] Processing: {title} ({doc_url})")

        try:
            # Download file from Supabase storage
            file_bytes = client.storage.from_("medical-documents").download(doc_url)

            if not file_bytes or len(file_bytes) == 0:
                logger.warning(f"  Empty file, skipping: {doc_url}")
                failed += 1
                continue

            # Extract filename for type detection
            filename = doc_url.rsplit("/", 1)[-1] if "/" in doc_url else doc_url

            # Run OCR with high sensitivity (medical docs)
            result = await service.extract_text(
                file_bytes=file_bytes,
                filename=filename,
                sensitivity="high",
            )

            if result.text and result.text.strip():
                # Update the record with extracted text
                client.table("medical_records").update({
                    "ocr_text": result.text
                }).eq("id", record_id).execute()

                logger.info(
                    f"  OK: {len(result.text)} chars, method={result.method}, "
                    f"confidence={result.confidence:.2f}"
                )
                success += 1
            else:
                logger.warning(f"  No text extracted (method={result.method})")
                failed += 1

        except Exception as e:
            logger.error(f"  Failed: {e}")
            failed += 1

        # Small delay between requests
        await asyncio.sleep(0.5)

    logger.info(f"Backfill complete: {success} success, {failed} failed, {total} total")


def main():
    dry_run = "--dry-run" in sys.argv
    limit = 100

    for arg in sys.argv[1:]:
        if arg.startswith("--limit="):
            limit = int(arg.split("=")[1])

    print(f"Starting medical records OCR backfill (dry_run={dry_run}, limit={limit})")
    asyncio.run(backfill_medical_records(dry_run=dry_run, limit=limit))


if __name__ == "__main__":
    main()
