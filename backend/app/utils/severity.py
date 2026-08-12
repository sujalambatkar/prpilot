"""Helpers for ranking and comparing finding severities."""

SEVERITY_ORDER = ["info", "low", "medium", "high", "critical"]


def severity_rank(severity: str) -> int:
    """Return the ordinal rank of a severity string, lowest to highest."""
    try:
        return SEVERITY_ORDER.index(severity)
    except ValueError:
        return 0


def meets_threshold(severity: str, min_severity: str) -> bool:
    """Return True if `severity` is at or above `min_severity`."""
    return severity_rank(severity) >= severity_rank(min_severity)
