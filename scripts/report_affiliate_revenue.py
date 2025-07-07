#!/usr/bin/env python3
"""Report month-to-date affiliate revenue from Supabase."""
import os
from datetime import datetime
from supabase import create_client


def get_client():
    """Initialize Supabase client using available credentials."""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
    if not url or not key:
        raise RuntimeError("Supabase credentials not provided")
    return create_client(url, key)


def fetch_month_to_date_total(client):
    """Return total affiliate revenue since the start of the current month."""
    start_of_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    response = (
        client.table("affiliate_sales")
        .select("amount_total")
        .filter("created_at", "gte", start_of_month.isoformat())
        .execute()
    )
    records = response.data or []
    total_cents = sum(r.get("amount_total", 0) or 0 for r in records)
    return total_cents / 100


def main():
    client = get_client()
    total = fetch_month_to_date_total(client)
    print(f"Affiliate revenue month-to-date: ${total:.2f}")


if __name__ == "__main__":
    main()
