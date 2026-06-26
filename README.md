# VLM MCP Server

[中文文档](README.zh-CN.md) | **English**

![VLM MCP Server hero](assets/vlm-mcp-server-hero.png)

A Model Context Protocol (MCP) server providing vision & video analysis tools, **configurable with any model provider**.

This is a reverse-engineered and extended reimplementation of `@z_ai/mcp-server`. The original server was hard-wired to the Z.AI / Zhipu Chat Completions API. This fork introduces a **provider abstraction layer** so the same set of tools can run against any of three API families:

- **Chat Completions** — OpenAI-compatible `POST {base}/chat/completions` (OpenAI, Z.AI, Zhipu, OpenRouter, Together, Groq, DeepSeek, Moonshot, local Ollama / LM Studio, …)
- **Responses** — OpenAI `POST {base}/responses` (gpt-4o, o-series reasoning models)
- **Anthropic Messages** — `POST {base}/v1/messages` (Claude, and Anthropic-compatible gateways)

> Built on top of the original `@z_ai/mcp-server` design (Apache-2.0). All credit for the tooling, prompts, and architecture goes to the original authors (Chao Gong, Lei Yuan / Z.AI). This project extends it with a pluggable provider layer.

## Available Tools

This server provides specialized tools for different image and video analysis tasks:

### Image Analysis Tools

1. **`ui_to_artifact`** — Convert UI screenshots to various artifacts
   - Generate frontend code from designs (`code`)
   - Create AI prompts for UI recreation (`prompt`)
   - Extract design specifications (`spec`)
   - Generate natural language UI descriptions (`description`)

2. **`extract_text_from_screenshot`** — OCR and text extraction
   - Extract code from screenshots with proper formatting
   - Extract terminal output and logs
   - Supports programming language hints for better accuracy

3. **`diagnose_error_screenshot`** — Error diagnosis and troubleshooting
   - Analyze error messages and stack traces
   - Identify root causes and provide actionable solutions

4. **`understand_technical_diagram`** — Technical diagram analysis
   - Analyze architecture, flowchart, UML, ER, and sequence diagrams
   - Identify design patterns and explain structure

5. **`analyze_data_visualization`** — Data visualization insights
   - Extract insights, trends, and anomalies from charts and graphs

6. **`ui_diff_check`** — UI comparison for visual regression
   - Compare expected vs actual UI implementations
   - Prioritize issues by severity

7. **`analyze_image`** — General-purpose image analysis (fallback)

### Video Analysis Tools

8. **`analyze_video`** — Video content analysis (local files or URLs, ≤8MB, MP4/MOV/M4V)

## Configuration

### Choosing a provider

The simplest way to configure a provider is to fill in one of the three `OPENAI_*` env-var groups — the server auto-detects which group is set:

| Group | API family | Endpoint appended to base URL |
|-------|------------|-------------------------------|
| `OPENAI_CHAT_COMPLETIONS_*` | OpenAI Chat Completions | `/chat/completions` |
| `OPENAI_RESPONSES_*` | OpenAI Responses | `/responses` |
| `OPENAI_ANTHROPIC_*` | Anthropic Messages | `/v1/messages` (or kept as-is if base URL already ends with `/messages`) |

If multiple groups are configured, set `VLM_PROVIDER` explicitly to pick one:

| Value | API family |
|-------|------------|
| `chat-completions` | OpenAI Chat Completions |
| `responses` | OpenAI Responses |
| `anthropic` | Anthropic Messages |
| `auto` *(default)* | First configured `OPENAI_*` group, else inferred |

In `auto` mode (when no `OPENAI_*` group is set) the provider is inferred as follows:
- Built-in Z.AI / Zhipu platform mode (`Z_AI_MODE=ZAI|ZHIPU`) → `chat-completions`
- Base URL contains `anthropic`, or key starts with `sk-ant` → `anthropic`
- Otherwise → `chat-completions` (the most broadly compatible default)

### Environment variables

The server loads variables from a `.env` file in the working directory at
startup (real environment variables take precedence). Three configuration
layers are supported; precedence is **per-provider groups > generic > legacy**.

**Per-provider groups** (configure each family independently — `auto` picks the
first group with both a key and a base URL set):

| Variable | Description |
|----------|-------------|
| `OPENAI_CHAT_COMPLETIONS_API_KEY` / `OPENAI_CHAT_COMPLETIONS_BASE_URL` / `OPENAI_CHAT_COMPLETIONS_MODEL` | Chat Completions provider |
| `OPENAI_RESPONSES_API_KEY` / `OPENAI_RESPONSES_BASE_URL` / `OPENAI_RESPONSES_MODEL` | Responses provider |
| `OPENAI_ANTHROPIC_API_KEY` / `OPENAI_ANTHROPIC_BASE_URL` / `OPENAI_ANTHROPIC_MODEL` | Anthropic Messages provider |

**Generic:**

| Variable | Description | Default |
|----------|-------------|---------|
| `VLM_API_KEY` | API key for your provider | *(required)* |
| `VLM_BASE_URL` | Provider API root (with or without trailing slash) | Zhipu default |
| `VLM_VISION_MODEL` | Model name | `glm-4.6v` |
| `VLM_PROVIDER` | Provider family (see above) | `auto` |
| `VLM_VISION_MODEL_TEMPERATURE` | Sampling temperature | `0.8` |
| `VLM_VISION_MODEL_TOP_P` | Top-p | `0.6` |
| `VLM_VISION_MODEL_MAX_TOKENS` | Max output tokens | `32768` |
| `VLM_TIMEOUT` | Request timeout in ms | `300000` |
| `VLM_RETRY_COUNT` | Retry attempts | `1` |
| `VLM_ANTHROPIC_VERSION` | `anthropic-version` header (Anthropic only) | `2023-06-01` |
| `VLM_LOG_PATH` | Custom log file path | `~/.vlm/vlm-mcp-YYYY-MM-DD.log` |

**Legacy (Z.AI / Zhipu, backward-compatible with `@z_ai/mcp-server`):**

| Variable | Description |
|----------|-------------|
| `Z_AI_API_KEY` / `ZAI_API_KEY` | API key (used if `VLM_API_KEY` unset) |
| `Z_AI_BASE_URL` | API root |
| `Z_AI_MODE` / `PLATFORM_MODE` | `ZAI` → `https://api.z.ai/api/paas/v4/`, `ZHIPU` → `https://open.bigmodel.cn/api/paas/v4/` |
| `Z_AI_VISION_MODEL` | Model name |
| `Z_AI_VISION_MODEL_TEMPERATURE` / `Z_AI_VISION_MODEL_TOP_P` / `Z_AI_VISION_MODEL_MAX_TOKENS` | Sampling params |
| `Z_AI_TIMEOUT` / `Z_AI_RETRY_COUNT` | Timeout / retries |
| `ANTHROPIC_AUTH_TOKEN` | Fallback key if no `VLM_API_KEY`/`Z_AI_API_KEY` is set |

Per-provider group variables take precedence over generic, which take
precedence over legacy. The active provider is resolved from `VLM_PROVIDER`,
or — in `auto` mode — from whichever `OPENAI_<FAMILY>_*` group is configured.

## Usage

The server speaks MCP over stdio. Configuration is via environment variables — pick **one** of the three provider families below and fill in the corresponding `OPENAI_*` group. The server auto-detects which group is configured; you can also set `VLM_PROVIDER` explicitly to `chat-completions` / `responses` / `anthropic`.

| Provider family | Environment variables |
|-----------------|----------------------|
| **Chat Completions** (OpenAI / Z.AI / Zhipu / OpenRouter / Together / Groq / DeepSeek / Moonshot / local) | `OPENAI_CHAT_COMPLETIONS_API_KEY` · `OPENAI_CHAT_COMPLETIONS_BASE_URL` · `OPENAI_CHAT_COMPLETIONS_MODEL` |
| **Responses** (OpenAI gpt-4o, o-series) | `OPENAI_RESPONSES_API_KEY` · `OPENAI_RESPONSES_BASE_URL` · `OPENAI_RESPONSES_MODEL` |
| **Anthropic Messages** (Claude) | `OPENAI_ANTHROPIC_API_KEY` · `OPENAI_ANTHROPIC_BASE_URL` · `OPENAI_ANTHROPIC_MODEL` |

> The same values can also be supplied via a `.env` file in the working directory, or through the generic `VLM_*` / legacy `Z_AI_*` variables. See [Configuration](#configuration).

### GitHub Packages registry

This package is published only to GitHub Packages as `@syntx-ai/vlm-mcp-server`.
Before using the `npx` commands below, authenticate npm with a GitHub token that has `read:packages` access:

```shell
npm login --scope=@syntx-ai --auth-type=legacy --registry=https://npm.pkg.github.com
```

Or configure `~/.npmrc` manually:

```ini
@syntx-ai:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

### Claude Code

**One-line install** (Chat Completions example — replace with your API Key / Base URL / model):

```shell
claude mcp add -s user vlm-mcp-server \
  --env OPENAI_CHAT_COMPLETIONS_API_KEY=sk-... \
       OPENAI_CHAT_COMPLETIONS_BASE_URL=https://api.openai.com/v1/ \
       OPENAI_CHAT_COMPLETIONS_MODEL=gpt-4o \
  -- npx -y @syntx-ai/vlm-mcp-server
```

If you forgot to replace the API Key, remove the old config before re-running:

```shell
claude mcp list
claude mcp remove vlm-mcp-server
```

> On Windows PowerShell, if you hit issues with the `-y` flag, run the same command in Command Prompt (CMD). The `Windows requires 'cmd /c' wrapper` warning can be ignored.

**Manual config** — edit the `mcpServers` section of `~/.claude.json` (Anthropic example):

```json
{
  "mcpServers": {
    "vlm-mcp-server": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@syntx-ai/vlm-mcp-server"],
      "env": {
        "OPENAI_ANTHROPIC_API_KEY": "sk-ant-...",
        "OPENAI_ANTHROPIC_BASE_URL": "https://api.anthropic.com",
        "OPENAI_ANTHROPIC_MODEL": "claude-sonnet-4-5"
      }
    }
  }
}
```

<details>
<summary>Responses API config example</summary>

```json
{
  "mcpServers": {
    "vlm-mcp-server": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@syntx-ai/vlm-mcp-server"],
      "env": {
        "OPENAI_RESPONSES_API_KEY": "sk-...",
        "OPENAI_RESPONSES_BASE_URL": "https://api.openai.com/v1/",
        "OPENAI_RESPONSES_MODEL": "gpt-4o"
      }
    }
  }
}
```
</details>

### Cline (VS Code)

Add the MCP server config in the Cline extension settings (Chat Completions example):

```json
{
  "mcpServers": {
    "vlm-mcp-server": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@syntx-ai/vlm-mcp-server"],
      "env": {
        "OPENAI_CHAT_COMPLETIONS_API_KEY": "sk-...",
        "OPENAI_CHAT_COMPLETIONS_BASE_URL": "https://api.openai.com/v1/",
        "OPENAI_CHAT_COMPLETIONS_MODEL": "gpt-4o"
      }
    }
  }
}
```

### OpenCode

See the [OpenCode MCP docs](https://opencode.ai/docs/mcp-servers) (Anthropic example):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "vlm-mcp-server": {
      "type": "local",
      "command": ["npx", "-y", "@syntx-ai/vlm-mcp-server"],
      "environment": {
        "OPENAI_ANTHROPIC_API_KEY": "sk-ant-...",
        "OPENAI_ANTHROPIC_BASE_URL": "https://api.anthropic.com",
        "OPENAI_ANTHROPIC_MODEL": "claude-sonnet-4-5"
      }
    }
  }
}
```

### Crush

```json
{
  "$schema": "https://charm.land/crush.json",
  "mcp": {
    "vlm-mcp-server": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@syntx-ai/vlm-mcp-server"],
      "env": {
        "OPENAI_RESPONSES_API_KEY": "sk-...",
        "OPENAI_RESPONSES_BASE_URL": "https://api.openai.com/v1/",
        "OPENAI_RESPONSES_MODEL": "gpt-4o"
      }
    }
  }
}
```

### Roo Code / Kilo Code and other MCP clients

For Roo Code, Kilo Code, and other MCP-compatible clients, use the following generic config (Chat Completions example):

```json
{
  "mcpServers": {
    "vlm-mcp-server": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@syntx-ai/vlm-mcp-server"],
      "env": {
        "OPENAI_CHAT_COMPLETIONS_API_KEY": "sk-...",
        "OPENAI_CHAT_COMPLETIONS_BASE_URL": "https://api.openai.com/v1/",
        "OPENAI_CHAT_COMPLETIONS_MODEL": "gpt-4o"
      }
    }
  }
}
```

> To switch to another API family, replace the `env` block with the corresponding `OPENAI_RESPONSES_*` or `OPENAI_ANTHROPIC_*` triple. You can also use the generic `VLM_*` variables together with an explicit `VLM_PROVIDER`.

### Run locally from source

```shell
npm install
npm run build

# Start directly via environment variables
OPENAI_CHAT_COMPLETIONS_API_KEY=sk-... \
OPENAI_CHAT_COMPLETIONS_BASE_URL=https://api.openai.com/v1/ \
OPENAI_CHAT_COMPLETIONS_MODEL=gpt-4o \
npm start

# Or write the variables into a .env file and just start (auto-loaded)
npm start
```

## Usage Examples

Once the server is installed in your client, you can use it through conversation. For example, in Claude Code, type `hi describe this xx.png` — the MCP Server will process the image and return a description (the image must exist in the current directory).

> Outside Claude Code, pasting an image directly into the client will NOT invoke this MCP Server — the client encodes the image and calls the model API itself. **Best practice**: place images in a local directory and refer to them by name or path in conversation, e.g. `What does demo.png describe?`

## Troubleshooting

Run the server directly from the command line to verify it starts, isolating environment / permission issues:

```bash
# Linux / macOS
OPENAI_CHAT_COMPLETIONS_API_KEY=sk-... \
OPENAI_CHAT_COMPLETIONS_BASE_URL=https://api.openai.com/v1/ \
OPENAI_CHAT_COMPLETIONS_MODEL=gpt-4o \
npx -y @syntx-ai/vlm-mcp-server

# Windows CMD
set OPENAI_CHAT_COMPLETIONS_API_KEY=sk-... && set OPENAI_CHAT_COMPLETIONS_BASE_URL=https://api.openai.com/v1/ && set OPENAI_CHAT_COMPLETIONS_MODEL=gpt-4o && npx -y @syntx-ai/vlm-mcp-server

# Windows PowerShell
$env:OPENAI_CHAT_COMPLETIONS_API_KEY="sk-..."; $env:OPENAI_CHAT_COMPLETIONS_BASE_URL="https://api.openai.com/v1/"; $env:OPENAI_CHAT_COMPLETIONS_MODEL="gpt-4o"; npx -y @syntx-ai/vlm-mcp-server
```

- If it starts successfully, the environment is correct — the issue is likely in the client's MCP config; double-check it.
- If it fails, investigate the error message (pasting it to an LLM for analysis is recommended).

Other common issues:

**Connection failure**
1. Ensure Node.js 18 or newer is installed.
2. Run `node -v` and `npx -v` to confirm the runtime is available.
3. Verify the environment variables (`OPENAI_*` triple or `VLM_*`) are set correctly.

**Invalid API Key**
1. Confirm the API Key was copied correctly.
2. Check that the API Key is activated.
3. Ensure the selected provider family matches the API Key (Chat Completions / Responses / Anthropic).
4. Check that the API Key has sufficient balance.

**Connection timeout**
1. Check your network connection.
2. Check firewall settings.
3. Try switching to a different provider family or base URL.
4. Increase the timeout (`VLM_TIMEOUT`, default 300000ms).


## Architecture

```
src/
├── index.ts                  # Entry point: starts the MCP server, registers all tools
├── types/                    # Error types (McpError, ApiError, ValidationError, …)
├── core/
│   ├── environment.ts        # Env config (generic VLM_* + legacy Z_AI_*), URL resolution
│   ├── chat-service.ts       # Delegates to the active VisionProvider
│   ├── file-service.ts       # File validation + base64 encoding (image/video)
│   ├── base-image-service.ts # Shared image-processing logic for all image tools
│   ├── api-common.ts         # Message builders, response helpers, retry wrapper
│   ├── error-handler.ts      # Error hierarchy + handling/recovery strategies
│   └── logger.ts            # stderr + file logger (keeps stdout JSON-clean)
├── providers/                # ← NEW: pluggable model-provider abstraction
│   ├── types.ts              # VisionProvider interface, ChatMessage, postJson helper
│   ├── chat-completions.ts   # OpenAI-compatible Chat Completions
│   ├── responses.ts          # OpenAI Responses API
│   ├── anthropic.ts          # Anthropic Messages API
│   └── index.ts              # Provider selection (VLM_PROVIDER / auto-infer)
├── prompts/                  # System prompts for each specialized tool
└── tools/                    # 8 tool registrations (7 image + 1 video)
```

The **provider layer** (`src/providers/`) is the key extension. Each provider implements a `VisionProvider` interface that takes normalized `ChatMessage[]` (the OpenAI Chat Completions content-part format as internal lingua franca) and translates it to the provider's wire format. `chat-service.ts` simply delegates to the resolved provider, so none of the tool code needed to change.

## License

Apache-2.0
