# LLM Prompt Price Calculator

Estimate what a prompt will cost, in USD, before you send it to an LLM API. Paste a prompt, pick a model, and the app returns a low / expected / high price plus a comparison across the catalog. If you supply an API key, it can run the prompt and price the provider's real token usage.

## Screenshots

Placeholder for a capture of the estimator and a capture of the `/models` catalog.

## Catalog

Prices were copied from the providers' public pricing pages on **2026-11-09**. Each row in `backend/app/data/models.json` stores that date and a `source_url`. The models are:

| Model | Input / 1M | Output / 1M | Source |
| --- | --- | --- | --- |
| GPT-5.4 | $2.50 | $15.00 | [OpenAI](https://developers.openai.com/api/docs/models/gpt-5.4) |
| GPT-5 mini | $0.25 | $2.00 | [OpenAI](https://developers.openai.com/api/docs/models/gpt-5-mini) |
| GPT-4.1 | $2.00 | $8.00 | [OpenAI](https://developers.openai.com/api/docs/models/gpt-4.1) |
| GPT-4.1 mini | $0.40 | $1.60 | [OpenAI](https://developers.openai.com/api/docs/models/gpt-4.1-mini) |
| GPT-4o | $2.50 | $10.00 | [OpenAI](https://developers.openai.com/api/docs/models/gpt-4o) |
| GPT-4o mini | $0.15 | $0.60 | [OpenAI](https://developers.openai.com/api/docs/models/gpt-4o-mini) |
| o3 | $2.00 | $8.00 | [OpenAI](https://developers.openai.com/api/docs/models/o3) |
| o3-pro | $20.00 | $80.00 | [OpenAI](https://developers.openai.com/api/docs/models/o3-pro) |
| Claude Opus 5.5 | $4.00 | $20.00 | [Anthropic](https://platform.claude.com/docs/en/about-claude/pricing) |
| Claude Sonnet 5.5 | $2.00 | $10.00 | [Anthropic](https://platform.claude.com/docs/en/about-claude/pricing) |
| Claude Haiku 5.5 | $0.10 | $0.50 | [Anthropic](https://platform.claude.com/docs/en/about-claude/pricing) |
| Gemini 4 Argon | $2.00 | $10.00 | [Google](https://ai.google.dev/gemini-api/docs/pricing) |
| Gemini 3.8 Flash | $0.75 | $3.75 | [Google](https://ai.google.dev/gemini-api/docs/pricing) |
| Gemini 3.1 Pro | $2.00 | $12.00 | [Google](https://ai.google.dev/gemini-api/docs/pricing) |
| Mistral Large 4 | $0.70 | $2.10 | [Mistral](https://docs.mistral.ai/models/mistral-large-4-0.md) |
| Mistral Small 4 | $0.15 | $0.60 | [Mistral](https://docs.mistral.ai/inference/pricing) |
| DeepSeek V4 Pro | $1.32 | $3.96 | [DeepSeek](https://api-docs.deepseek.com/quick_start/pricing/) |
| DeepSeek Flash | $0.30 | $1.20 | [DeepSeek](https://api-docs.deepseek.com/quick_start/pricing/) |
| Llama 3.3 70B (Groq) | $0.59 | $0.79 | [Groq](https://home.cloud.groq.io/pricing) |
| Llama 3.1 8B Instant (Groq) | $0.05 | $0.08 | [Groq](https://home.cloud.groq.io/pricing) |

Several of those rates are introductory or tiered. The `notes` field on each model, and the long-context price fields, record the scheduled changes and the threshold where a higher tier takes over. Gemini 4 Argon's $2 / $10 rate is the paid price through November 30, 2026.

## Local development

You need Python 3.11+, [uv](https://docs.astral.sh/uv/), Node.js 22, and pnpm 10.

```bash
cp .env.example .env
```

Backend:

```bash
cd backend
uv sync --dev
uv run uvicorn app.main:app --reload --port 8010
```

Frontend, in another terminal:

```bash
cd frontend
pnpm install
NEXT_PUBLIC_API_URL=http://localhost:8010 pnpm dev
```

Open http://localhost:3000. The catalog is also at http://localhost:3000/models. Interactive API docs are at http://localhost:8010/docs.

### Checks

```bash
cd backend && uv run ruff check app tests && uv run pytest
cd frontend && pnpm lint && pnpm typecheck && pnpm test
```

Regenerate the TypeScript types after an API change, with the backend running:

```bash
cd frontend && pnpm gen:types
```

## Docker

```bash
cp .env.example .env
docker compose up --build
```

The UI is at http://localhost:3000 and the API at http://localhost:8010. The API container still listens on port 8000; Compose publishes it on 8010 so it does not collide with another local service. `NEXT_PUBLIC_API_URL` is baked into the frontend image at build time, so if you change `BACKEND_PORT`, set `NEXT_PUBLIC_API_URL` to the same host URL and rebuild the frontend.

## Environment

See `.env.example`. Provider keys are optional. They are used only when a request to `/api/run` does not include its own `api_key`, and when Anthropic or Google token-count endpoints are available for a single-model estimate. Keys from the browser are not written to disk, logs, or the response.

## Updating prices

1. Open the provider page linked from the model's `source_url`.
2. Edit that object's prices, `context_window`, `max_output_tokens`, and `notes` in `backend/app/data/models.json`.
3. Set `last_updated` to the day you checked, and bump the catalog `version` if the set of models changed.
4. Restart the API. No migration step; the file is read at startup.

To add a provider, add a class next to the others in `backend/app/providers/` and register it in `registry.py`. OpenAI-compatible hosts can subclass `OpenAIProvider` with a `base_url`.

## Estimation heuristic

Input tokens are counted with the model's tokenizer:

- `tiktoken:<encoding>` uses tiktoken locally and is exact.
- `anthropic` and `google` call the provider's count-tokens endpoint when the matching server API key is set. The comparison endpoint skips those calls and uses the heuristic so the table stays fast.
- `heuristic`, and any failed remote count, uses `ceil(characters / CHARS_PER_TOKEN)` with `CHARS_PER_TOKEN` defaulting to 4. The response sets `is_tokenizer_exact` to false.

When `expected_output_tokens` is omitted:

- low = max(50, round(10% of input tokens))
- expected = max(150, round(50% of input tokens))
- high = min(round(2 × input tokens), the model's max output)

Those constants are the `ESTIMATE_OUTPUT_*` variables. The three values are then clamped so `low <= expected <= high <= max_output_tokens`. Passing `expected_output_tokens` makes all three that number (capped at the model's max output).

Cost is `tokens * price_per_1m / 1_000_000`. If the input is above a model's `long_context_threshold`, the long-context prices apply to the whole request. A real run prices cached input tokens at `cached_input_price_per_1m_tokens` when the provider reports them.

The count is the prompt text plus the optional system prompt. It does not add provider message-framing overhead, and it does not predict reasoning tokens. Providers that bill thinking tokens as output can therefore cost more than the estimate.
