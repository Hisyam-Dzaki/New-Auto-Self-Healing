# 9Router Provider Configuration

## Overview

9Router adalah Indonesian LLM routing service yang kompatibel dengan OpenRouter API. AgentForge mendukung 9Router sebagai provider utama untuk akses multi-model.

## Setup

### 1. Dapatkan API Key

Daftar di [9router.com](https://9router.com) dan dapatkan API key.

### 2. Konfigurasi Environment

Tambahkan ke `.env`:

```env
NINEROUTER_API_KEY=your_9router_api_key_here
```

### 3. Model yang Tersedia

9Router mendukung berbagai model dari berbagai provider:

#### OpenAI Models
- `openai/gpt-4`
- `openai/gpt-4-turbo`
- `openai/gpt-3.5-turbo`

#### Anthropic Models
- `anthropic/claude-3.5-sonnet`
- `anthropic/claude-3-opus`
- `anthropic/claude-3-sonnet`
- `anthropic/claude-3-haiku`

#### Google Models
- `google/gemini-pro`
- `google/gemini-1.5-pro`

#### DeepSeek Models
- `deepseek/deepseek-coder`
- `deepseek/deepseek-chat`

#### Meta Models
- `meta-llama/llama-3-70b`
- `meta-llama/llama-3-8b`

#### Mistral Models
- `mistralai/mistral-large`
- `mistralai/mistral-medium`

## Penggunaan

### Via API

```python
from src.providers.openrouter_provider import NineRouterProvider

provider = NineRouterProvider(api_key="your_key")

messages = [
    {"role": "user", "content": "Hello, how are you?"}
]

# Streaming
async for chunk in provider.stream_completion(messages, "anthropic/claude-3.5-sonnet"):
    print(chunk, end="")

# Non-streaming
response = await provider.completion(messages, "openai/gpt-4")
print(response)
```

### Via Config

Edit `config.yml`:

```yaml
agent:
  default_provider: 9router
  default_model: anthropic/claude-3.5-sonnet

workflows:
  build-app:
    planning:
      provider: 9router
      model: anthropic/claude-3.5-sonnet
    coding:
      provider: 9router
      model: deepseek/deepseek-coder
    summarization:
      provider: 9router
      model: openai/gpt-4
```

### Via Chat API

```bash
curl -X POST http://localhost:8000/api/agent/prompt \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Create a FastAPI backend",
    "model": "anthropic/claude-3.5-sonnet",
    "workflow": "build-app"
  }'
```

## Keuntungan 9Router

1. **Single API Key** - Akses semua model dengan satu API key
2. **Cost Optimization** - Routing otomatis ke model termurah
3. **Fallback Support** - Auto fallback jika model tidak tersedia
4. **Indonesian Support** - Optimized untuk bahasa Indonesia
5. **No Rate Limit** - Tidak ada rate limit per model

## Model Routing Strategy

AgentForge secara otomatis memilih model berdasarkan task:

| Task Type | Recommended Model | Reason |
|-----------|------------------|---------|
| Planning | `anthropic/claude-3.5-sonnet` | Strong reasoning |
| Coding | `deepseek/deepseek-coder` | Code specialist |
| Debugging | `openai/gpt-4` | Best debugging |
| Summarization | `openai/gpt-3.5-turbo` | Fast & cheap |
| Long Context | `google/gemini-1.5-pro` | 1M context |

## Troubleshooting

### Error: Invalid API Key

```bash
# Check API key
echo $NINEROUTER_API_KEY

# Test connection
curl https://router.9router.com/api/v1/models \
  -H "Authorization: Bearer $NINEROUTER_API_KEY"
```

### Error: Model Not Found

Pastikan model name menggunakan format: `provider/model-name`

```python
# ✅ Correct
model = "anthropic/claude-3.5-sonnet"

# ❌ Wrong
model = "claude-3.5-sonnet"
```

### Error: Rate Limit

9Router tidak memiliki rate limit, tapi provider upstream mungkin punya. Gunakan fallback:

```yaml
routing:
  primary:
    provider: 9router
    model: anthropic/claude-3.5-sonnet
  fallback:
    provider: 9router
    model: openai/gpt-4
```

## Cost Comparison

| Provider | Model | Cost per 1M tokens |
|----------|-------|-------------------|
| Direct OpenAI | gpt-4 | $30 |
| Direct Anthropic | claude-3.5-sonnet | $15 |
| Via 9Router | openai/gpt-4 | $25 |
| Via 9Router | anthropic/claude-3.5-sonnet | $12 |

## Best Practices

1. **Use 9Router as Default** - Set sebagai default provider
2. **Model Selection** - Pilih model sesuai task complexity
3. **Cost Monitoring** - Track token usage per model
4. **Fallback Strategy** - Selalu set fallback model
5. **Caching** - Enable response caching untuk query berulang

## Advanced Configuration

### Custom Model Routing

```python
from src.providers.llm_router import LLMRouter

router = LLMRouter()

# Add custom routing rule
router.add_provider("9router-custom", NineRouterProvider(api_key))

# Get provider by model
provider = router.get_provider("anthropic/claude-3.5-sonnet")
```

### Multi-Provider Fallback

```yaml
providers:
  - name: 9router
    priority: 1
    models:
      - anthropic/claude-3.5-sonnet
      - openai/gpt-4
  
  - name: openai
    priority: 2
    models:
      - gpt-4
      - gpt-3.5-turbo
```

## Support

- Documentation: https://9router.com/docs
- Discord: https://discord.gg/9router
- Email: support@9router.com