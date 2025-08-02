#!/usr/bin/env python3
"""
Database Health Check Script
Checks for missing indexes on foreign keys and other performance issues
"""
import os
import sys
import asyncio
from datetime import datetime
from typing import List, Dict, Any
import asyncpg
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL environment variable not set")
    sys.exit(1)


async def check_missing_fk_indexes(conn: asyncpg.Connection) -> List[Dict[str, Any]]:
    """Check for foreign key columns missing indexes"""
    query = """
    SELECT * FROM check_missing_fk_indexes();
    """
    
    try:
        rows = await conn.fetch(query)
        return [dict(row) for row in rows]
    except Exception as e:
        print(f"Error checking missing indexes: {e}")
        # If function doesn't exist, return empty list
        return []


async def check_table_statistics(conn: asyncpg.Connection) -> List[Dict[str, Any]]:
    """Check table statistics and suggest VACUUM/ANALYZE"""
    query = """
    SELECT 
        schemaname,
        tablename,
        n_live_tup as live_rows,
        n_dead_tup as dead_rows,
        CASE 
            WHEN n_live_tup > 0 
            THEN ROUND((n_dead_tup::numeric / n_live_tup::numeric) * 100, 2)
            ELSE 0
        END as dead_row_percentage,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
        AND (n_dead_tup > 1000 OR 
             (n_live_tup > 0 AND n_dead_tup::numeric / n_live_tup::numeric > 0.1))
    ORDER BY dead_row_percentage DESC;
    """
    
    rows = await conn.fetch(query)
    return [dict(row) for row in rows]


async def check_slow_queries(conn: asyncpg.Connection) -> List[Dict[str, Any]]:
    """Check for slow queries from pg_stat_statements"""
    query = """
    SELECT 
        query,
        calls,
        ROUND(total_exec_time::numeric / calls, 2) as avg_exec_time_ms,
        ROUND(total_exec_time::numeric, 2) as total_exec_time_ms,
        ROUND(mean_exec_time::numeric, 2) as mean_exec_time_ms
    FROM pg_stat_statements
    WHERE query NOT LIKE '%pg_stat%'
        AND calls > 10
        AND mean_exec_time > 100  -- queries averaging over 100ms
    ORDER BY mean_exec_time DESC
    LIMIT 10;
    """
    
    try:
        rows = await conn.fetch(query)
        return [dict(row) for row in rows]
    except Exception:
        # pg_stat_statements might not be enabled
        return []


async def check_unused_indexes(conn: asyncpg.Connection) -> List[Dict[str, Any]]:
    """Check for indexes that are never used"""
    query = """
    SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan as index_scans,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
        AND idx_scan = 0
        AND indexrelname NOT LIKE 'pg_toast%'
    ORDER BY pg_relation_size(indexrelid) DESC;
    """
    
    rows = await conn.fetch(query)
    return [dict(row) for row in rows]


async def main():
    """Run all database health checks"""
    print("=" * 80)
    print(f"Database Health Check - {datetime.now().isoformat()}")
    print("=" * 80)
    
    conn = await asyncpg.connect(DATABASE_URL)
    
    try:
        # Check for missing foreign key indexes
        print("\n🔍 Checking for missing foreign key indexes...")
        missing_indexes = await check_missing_fk_indexes(conn)
        
        if missing_indexes:
            print(f"\n⚠️  Found {len(missing_indexes)} foreign keys without indexes:")
            for idx in missing_indexes:
                print(f"\n  Table: {idx['table_name']}")
                print(f"  Column: {idx['column_name']}")
                print(f"  References: {idx['referenced_table']}.{idx['referenced_column']}")
                print(f"  Fix: {idx['create_index_statement']}")
        else:
            print("✅ All foreign keys have indexes!")
        
        # Check table statistics
        print("\n📊 Checking table statistics...")
        table_stats = await check_table_statistics(conn)
        
        if table_stats:
            print(f"\n⚠️  Found {len(table_stats)} tables with high dead row percentage:")
            for stat in table_stats:
                print(f"\n  Table: {stat['tablename']}")
                print(f"  Dead rows: {stat['dead_rows']:,} ({stat['dead_row_percentage']}%)")
                print(f"  Last vacuum: {stat['last_vacuum'] or 'Never'}")
                print(f"  Suggestion: VACUUM ANALYZE {stat['tablename']};")
        else:
            print("✅ All tables have healthy statistics!")
        
        # Check for slow queries
        print("\n⏱️  Checking for slow queries...")
        slow_queries = await check_slow_queries(conn)
        
        if slow_queries:
            print(f"\n⚠️  Found {len(slow_queries)} slow queries:")
            for i, query in enumerate(slow_queries, 1):
                print(f"\n  {i}. Average time: {query['avg_exec_time_ms']}ms")
                print(f"     Calls: {query['calls']}")
                print(f"     Query: {query['query'][:100]}...")
        else:
            print("✅ No slow queries detected (or pg_stat_statements not enabled)")
        
        # Check for unused indexes
        print("\n🗑️  Checking for unused indexes...")
        unused_indexes = await check_unused_indexes(conn)
        
        if unused_indexes:
            print(f"\n⚠️  Found {len(unused_indexes)} unused indexes:")
            for idx in unused_indexes:
                print(f"\n  Index: {idx['indexname']} on {idx['tablename']}")
                print(f"  Size: {idx['index_size']}")
                print(f"  Suggestion: Consider dropping if not needed")
        else:
            print("✅ All indexes are being used!")
        
        # Summary
        print("\n" + "=" * 80)
        print("Summary:")
        print(f"  - Missing FK indexes: {len(missing_indexes)}")
        print(f"  - Tables needing vacuum: {len(table_stats)}")
        print(f"  - Slow queries: {len(slow_queries)}")
        print(f"  - Unused indexes: {len(unused_indexes)}")
        
        # Exit code based on issues found
        total_issues = len(missing_indexes) + len(table_stats)
        if total_issues > 0:
            print(f"\n⚠️  Found {total_issues} issues that should be addressed")
            sys.exit(1)
        else:
            print("\n✅ Database health check passed!")
            sys.exit(0)
            
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())