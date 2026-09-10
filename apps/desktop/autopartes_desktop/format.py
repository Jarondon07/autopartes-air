"""Utilidades de formato (equivalentes a utils/currency.ts de la web)."""

from __future__ import annotations


def to_float(value: object) -> float:
    """Los montos llegan de la API como string (NUMERIC). Convierte seguro."""
    try:
        return float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return 0.0


def format_usd(value: object) -> str:
    return f"${to_float(value):,.2f}"
