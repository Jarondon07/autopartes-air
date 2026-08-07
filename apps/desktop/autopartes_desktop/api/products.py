"""Llamadas al recurso de productos y catálogos auxiliares."""

from __future__ import annotations

from typing import Any, Optional

from .client import ApiClient


def list_products(
    client: ApiClient,
    *,
    page: int = 1,
    limit: int = 20,
    q: Optional[str] = None,
    category_id: Optional[int] = None,
    brand_id: Optional[int] = None,
) -> tuple[list[dict], dict]:
    """Devuelve (productos, meta) donde meta = {page, limit, total}."""
    params: dict[str, Any] = {"page": page, "limit": limit}
    if q:
        params["q"] = q
    if category_id:
        params["categoryId"] = category_id
    if brand_id:
        params["brandId"] = brand_id
    body = client.get("/products", params=params)
    meta = body.get("meta") or {"page": page, "limit": limit, "total": len(body["data"])}
    return body["data"], meta


def list_categories(client: ApiClient) -> list[dict]:
    return client.get("/categories")["data"]


def list_brands(client: ApiClient) -> list[dict]:
    return client.get("/brands")["data"]
