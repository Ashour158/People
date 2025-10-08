"""
Database configuration and connection management for HR Management System.
"""
import os
from typing import Any, Callable, Optional
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import logging

load_dotenv()

logger = logging.getLogger(__name__)

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', '5432')),
    'database': os.getenv('DB_NAME', 'hr_system'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', ''),
    'minconn': int(os.getenv('DB_POOL_MIN', '2')),
    'maxconn': int(os.getenv('DB_POOL_MAX', '10')),
}

# Connection pool
connection_pool: Optional[pool.ThreadedConnectionPool] = None


def get_connection_pool():
    """Get or create database connection pool."""
    global connection_pool
    if connection_pool is None:
        try:
            connection_pool = pool.ThreadedConnectionPool(
                DB_CONFIG['minconn'],
                DB_CONFIG['maxconn'],
                host=DB_CONFIG['host'],
                port=DB_CONFIG['port'],
                database=DB_CONFIG['database'],
                user=DB_CONFIG['user'],
                password=DB_CONFIG['password'],
            )
            logger.info('Database connection pool created successfully')
        except Exception as e:
            logger.error(f'Failed to create connection pool: {e}')
            raise
    return connection_pool


def get_connection():
    """Get a connection from the pool."""
    pool = get_connection_pool()
    return pool.getconn()


def release_connection(conn):
    """Release a connection back to the pool."""
    pool = get_connection_pool()
    pool.putconn(conn)


def query(text: str, params: Optional[tuple] = None) -> list[dict]:
    """
    Execute a query and return results as list of dictionaries.
    
    Args:
        text: SQL query string with %s placeholders
        params: Query parameters tuple
        
    Returns:
        List of dictionaries with query results
    """
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute(text, params or ())
        
        # For SELECT queries, fetch results
        if text.strip().upper().startswith('SELECT'):
            results = cursor.fetchall()
            cursor.close()
            return [dict(row) for row in results]
        else:
            # For INSERT/UPDATE/DELETE, commit and return affected rows
            conn.commit()
            rowcount = cursor.rowcount
            cursor.close()
            return [{'rowcount': rowcount}]
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f'Database query error: {e}')
        raise
    finally:
        if conn:
            release_connection(conn)


def transaction(callback: Callable) -> Any:
    """
    Execute a callback function within a database transaction.
    
    Args:
        callback: Function that takes a cursor and returns a result
        
    Returns:
        Result from the callback function
    """
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Start transaction
        conn.autocommit = False
        
        # Execute callback
        result = callback(cursor)
        
        # Commit transaction
        conn.commit()
        cursor.close()
        return result
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f'Transaction error: {e}')
        raise
    finally:
        if conn:
            conn.autocommit = True
            release_connection(conn)


def close_all_connections():
    """Close all connections in the pool."""
    global connection_pool
    if connection_pool:
        connection_pool.closeall()
        connection_pool = None
        logger.info('All database connections closed')
