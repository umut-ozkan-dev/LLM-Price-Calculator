def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_list_models_includes_required_providers(client):
    response = client.get("/api/models")
    assert response.status_code == 200
    payload = response.json()
    assert payload["version"] == "2026-11-09"
    ids = {model["id"] for model in payload["models"]}
    assert {
        "gpt-4o",
        "gpt-4o-mini",
        "gpt-4.1",
        "gpt-4.1-mini",
        "gpt-5.4",
        "o3",
        "claude-opus-5-5",
        "claude-sonnet-5-5",
        "claude-haiku-5-5",
        "gemini-4-argon",
        "gemini-3.8-flash",
        "mistral-large-4",
        "deepseek-v4-pro",
        "llama-3.3-70b-versatile",
    } <= ids
    for model in payload["models"]:
        assert model["input_price_per_1m_tokens"] > 0
        assert model["output_price_per_1m_tokens"] > 0
        assert model["source_url"].startswith("https://")
        assert model["last_updated"] == "2026-11-09"


def test_get_model_and_404(client):
    response = client.get("/api/models/gpt-4o")
    assert response.status_code == 200
    body = response.json()
    assert body["input_price_per_1m_tokens"] == 2.5
    assert body["output_price_per_1m_tokens"] == 10
    assert body["cached_input_price_per_1m_tokens"] == 1.25
    assert body["context_window"] == 128000

    missing = client.get("/api/models/not-a-model")
    assert missing.status_code == 404


def test_published_prices(client):
    models = {model["id"]: model for model in client.get("/api/models").json()["models"]}
    assert models["claude-sonnet-5-5"]["input_price_per_1m_tokens"] == 2
    assert models["claude-sonnet-5-5"]["output_price_per_1m_tokens"] == 10
    assert models["claude-haiku-5-5"]["long_context_input_price_per_1m_tokens"] == 0.5
    assert models["gemini-3.8-flash"]["input_price_per_1m_tokens"] == 0.75
    assert models["gemini-3.8-flash"]["output_price_per_1m_tokens"] == 3.75
    assert models["mistral-large-4"]["input_price_per_1m_tokens"] == 0.7
    assert models["deepseek-flash"]["output_price_per_1m_tokens"] == 1.2
    assert models["llama-3.1-8b-instant"]["input_price_per_1m_tokens"] == 0.05
    assert models["o3-pro"]["output_price_per_1m_tokens"] == 80
    assert models["gpt-5.4"]["long_context_output_price_per_1m_tokens"] == 22.5
