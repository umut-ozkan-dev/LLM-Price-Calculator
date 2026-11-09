"""Catalog endpoints."""

from fastapi import APIRouter

from app.schemas import CatalogResponse, ModelSpec
from app.services.catalog import get_catalog

router = APIRouter(tags=["models"])


@router.get("/models", response_model=CatalogResponse)
def list_models() -> CatalogResponse:
    catalog = get_catalog()
    return CatalogResponse(version=catalog.version, models=catalog.models)


@router.get("/models/{model_id}", response_model=ModelSpec)
def get_model(model_id: str) -> ModelSpec:
    return get_catalog().get(model_id)
