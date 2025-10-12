#!/usr/bin/env python3
"""
Database Index Application Script
Applies critical performance indexes to the HRMS database
"""

import asyncio
import asyncpg
import os
from pathlib import Path
import structlog

logger = structlog.get_logger()

async def apply_database_indexes():
    """Apply all critical database indexes for performance optimization"""
    
    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        logger.error("DATABASE_URL environment variable not set")
        return False
    
    try:
        # Connect to database
        conn = await asyncpg.connect(database_url)
        logger.info("Connected to database successfully")
        
        # Read the indexes SQL file
        indexes_file = Path(__file__).parent / 'database_indexes.sql'
        if not indexes_file.exists():
            logger.error(f"Indexes file not found: {indexes_file}")
            return False
        
        with open(indexes_file, 'r', encoding='utf-8') as f:
            indexes_sql = f.read()
        
        # Split into individual statements
        statements = [stmt.strip() for stmt in indexes_sql.split(';') if stmt.strip()]
        
        logger.info(f"Found {len(statements)} index statements to apply")
        
        # Apply each index statement
        success_count = 0
        error_count = 0
        
        for i, statement in enumerate(statements, 1):
            try:
                if statement.startswith('--') or not statement:
                    continue
                    
                logger.info(f"Applying index statement {i}/{len(statements)}")
                await conn.execute(statement)
                success_count += 1
                
            except Exception as e:
                error_count += 1
                logger.warning(f"Failed to apply statement {i}: {e}")
                # Continue with other statements
                continue
        
        logger.info(f"Index application completed: {success_count} successful, {error_count} errors")
        
        # Update table statistics
        logger.info("Updating table statistics...")
        analyze_statements = [
            "ANALYZE users",
            "ANALYZE employees", 
            "ANALYZE attendance",
            "ANALYZE leave_requests",
            "ANALYZE performance_reviews",
            "ANALYZE payroll_records",
            "ANALYZE job_postings",
            "ANALYZE candidates",
            "ANALYZE expense_claims",
            "ANALYZE tickets",
            "ANALYZE documents",
            "ANALYZE workflows",
            "ANALYZE compliance_policies",
            "ANALYZE integrations",
            "ANALYZE notifications",
            "ANALYZE audit_logs"
        ]
        
        for statement in analyze_statements:
            try:
                await conn.execute(statement)
                logger.info(f"Updated statistics for {statement.split()[-1]}")
            except Exception as e:
                logger.warning(f"Failed to analyze {statement}: {e}")
        
        await conn.close()
        logger.info("Database indexes applied successfully")
        return True
        
    except Exception as e:
        logger.error(f"Failed to apply database indexes: {e}")
        return False

async def check_index_usage():
    """Check current index usage statistics"""
    
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        logger.error("DATABASE_URL environment variable not set")
        return
    
    try:
        conn = await asyncpg.connect(database_url)
        
        # Get index usage statistics
        query = """
        SELECT 
            schemaname, 
            tablename, 
            indexname, 
            idx_scan, 
            idx_tup_read, 
            idx_tup_fetch 
        FROM pg_stat_user_indexes 
        ORDER BY idx_scan DESC 
        LIMIT 20;
        """
        
        results = await conn.fetch(query)
        
        logger.info("Top 20 most used indexes:")
        for row in results:
            logger.info(f"  {row['tablename']}.{row['indexname']}: {row['idx_scan']} scans")
        
        # Get unused indexes
        unused_query = """
        SELECT schemaname, tablename, indexname, idx_scan 
        FROM pg_stat_user_indexes 
        WHERE idx_scan = 0 
        ORDER BY schemaname, tablename, indexname;
        """
        
        unused_results = await conn.fetch(unused_query)
        
        if unused_results:
            logger.warning(f"Found {len(unused_results)} unused indexes:")
            for row in unused_results:
                logger.warning(f"  {row['tablename']}.{row['indexname']}")
        else:
            logger.info("No unused indexes found")
        
        await conn.close()
        
    except Exception as e:
        logger.error(f"Failed to check index usage: {e}")

async def main():
    """Main function to apply indexes and check usage"""
    logger.info("Starting database index optimization...")
    
    # Apply indexes
    success = await apply_database_indexes()
    
    if success:
        logger.info("Indexes applied successfully")
        
        # Check index usage
        await check_index_usage()
        
        logger.info("Database optimization completed successfully")
    else:
        logger.error("Failed to apply database indexes")

if __name__ == "__main__":
    asyncio.run(main())
