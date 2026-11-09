"""Estimate endpoints. Neither route requires an API key."""

from fastapi import APIRouter, Request

from app.config import Settings
from app.schemas import CompareRequest, CompareResponse, EstimateRequest, EstimateResponse
from app.services.catalog import get_catalog
from app.services.estimator import estimate_prompt
from app.services.tokenizer import TokenizerService

router = APIRouter(tags=["estimate"])


def _settings(request: Request) -> Settings:
    return request.app.state.settings


@router.post("/estimate", response_model=EstimateResponse)
def estimate(body: EstimateRequest, request: Request) -> EstimateResponse:
    settings = _settings(request)
    model = get_catalog().get(body.model_id)
    tokenizer = TokenizerService(settings)
    return estimate_prompt(
        model,
        body.prompt,
        body.system_prompt,
        body.expected_output_tokens,
        settings,
        tokenizer,
        remote_tokenizer=True,
    )


@router.post("/estimate/compare", response_model=CompareResponse)
def compare(body: CompareRequest, request: Request) -> CompareResponse:
    settings = _settings(request)
    catalog = get_catalog()
    models = catalog.select(body.model_ids)
    tokenizer = TokenizerService(settings)
    results = [
        estimate_prompt(
            model,
            body.prompt,
            body.system_prompt,
            body.expected_output_tokens,
            settings,
            tokenizer,
            remote_tokenizer=False,
        )
        for model in models
    ]
    results.sort(key=lambda item: (item.cost_usd.expected, item.model.display_name))
    return CompareResponse(results=results)
