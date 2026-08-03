"""DateTime utilities for database operations."""

from datetime import datetime


def get_utc_timestamp() -> str:
    """Get current UTC timestamp in ISO format."""
    return datetime.utcnow().isoformat()
