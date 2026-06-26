# Client Configuration

[中文文档](clients.zh-CN.md) | **English**

Detailed configuration guides for each MCP client. All examples use Chat Completions API — replace with your preferred provider.

## Claude Code

### One-line install

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

### Manual config

Edit the `mcpServers` section of `~/.claude.json`:

<details>
<summary>Chat Completions (OpenAI / Z.AI / Zhipu / OpenRouter / ...)</summary>

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
</details>

<details>
<summary>Responses API (OpenAI gpt-4o, o-series)</summary>

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

<details>
<summary>Anthropic Messages (Claude)</summary>

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
</details>

## Cline (VS Code)

Add the MCP server config in the Cline extension settings:

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

## OpenCode

See the [OpenCode MCP docs](https://opencode.ai/docs/mcp-servers):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "vlm-mcp-server": {
      "type": "local",
      "command": ["npx", "-y", "@syntx-ai/vlm-mcp-server"],
      "environment": {
        "OPENAI_CHAT_COMPLETIONS_API_KEY": "sk-...",
        "OPENAI_CHAT_COMPLETIONS_BASE_URL": "https://api.openai.com/v1/",
        "OPENAI_CHAT_COMPLETIONS_MODEL": "gpt-4o"
      }
    }
  }
}
```

## Crush

```json
{
  "$schema": "https://charm.land/crush.json",
  "mcp": {
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

## Roo Code / Kilo Code and other MCP clients

Use the following generic config:

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

## Run locally from source

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
