"""Load and look up the versioned pricing catalog."""

import json
from functools import lru_cache
from pathlib import Path

from fastapi import HTTPException

from app.schemas import CatalogResponse, ModelSpec

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "models.json"


class Catalog:
    def __init__(self, version: str, models: list[ModelSpec]) -> None:
        self.version = version
        self.models = models
        self._by_id = {model.id: model for model in models}

    def get(self, model_id: str) -> ModelSpec:
        model = self._by_id.get(model_id)
        if model is None:
            raise HTTPException(status_code=404, detail=f"Model '{model_id}' was not found.")
        return model

    def select(self, model_ids: list[str] | None) -> list[ModelSpec]:
        if not model_ids:
            return list(self.models)
        missing = [model_id for model_id in model_ids if model_id not in self._by_id]
        if missing:
            raise HTTPException(
                status_code=404,
                detail=f"Unknown model id(s): {', '.join(missing)}.",
            )
        return [self._by_id[model_id] for model_id in model_ids]


def load_catalog(path: Path = DATA_PATH) -> Catalog:
    payload = json.loads(path.read_text(encoding="utf-8"))
    models = [ModelSpec.model_validate(item) for item in payload["models"]]
    ids = [model.id for model in models]
    if len(ids) != len(set(ids)):
        raise ValueError("Pricing catalog contains duplicate model ids.")
    return Catalog(version=str(payload["version"]), models=models)


@lru_cache
def get_catalog() -> Catalog:
    return load_catalog()


def catalog_response(catalog: Catalog | None = None) -> CatalogResponse:
    current = catalog or get_catalog()
    return CatalogResponse(version=current.version, models=current.models)
