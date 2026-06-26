# 客户端配置

**中文文档** | [English](clients.md)

各 MCP 客户端的详细配置指南。所有示例均以 Chat Completions API 为例 —— 请替换为你选择的提供商。

## Claude Code

### 一键安装命令

```shell
claude mcp add -s user vlm-mcp-server \
  --env OPENAI_CHAT_COMPLETIONS_API_KEY=sk-... \
       OPENAI_CHAT_COMPLETIONS_BASE_URL=https://api.openai.com/v1/ \
       OPENAI_CHAT_COMPLETIONS_MODEL=gpt-4o \
  -- npx -y @syntx-ai/vlm-mcp-server
```

若忘记替换 API Key，重新执行前先卸载旧配置：

```shell
claude mcp list
claude mcp remove vlm-mcp-server
```

> 在 Windows PowerShell 中遇到 `-y` 参数问题时，请使用命令提示符 (CMD) 执行相同命令。若出现 `Windows requires 'cmd /c' wrapper` 告警，可忽略。

### 手动配置

编辑 `~/.claude.json` 的 MCP 部分：

<details>
<summary>Chat Completions（OpenAI / Z.AI / 智谱 / OpenRouter / ...）</summary>

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
<summary>Responses API（OpenAI gpt-4o、o 系列）</summary>

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
<summary>Anthropic Messages（Claude）</summary>

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

在 Cline 扩展设置中添加 MCP 服务器配置：

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

参考 [OpenCode MCP 文档](https://opencode.ai/docs/mcp-servers)：

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

## Roo Code / Kilo Code 等其它 MCP 客户端

使用以下通用配置：

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

> 切换到其他 API 族时，把 `env` 替换为对应的 `OPENAI_RESPONSES_*` 或 `OPENAI_ANTHROPIC_*` 三元组即可。也可使用通用的 `VLM_*` 变量配合 `VLM_PROVIDER` 显式指定。

## 从源码本地运行

```shell
npm install
npm run build

# 直接通过环境变量启动
OPENAI_CHAT_COMPLETIONS_API_KEY=sk-... \
OPENAI_CHAT_COMPLETIONS_BASE_URL=https://api.openai.com/v1/ \
OPENAI_CHAT_COMPLETIONS_MODEL=gpt-4o \
npm start

# 或将上述变量写入 .env 文件后直接启动（服务器会自动加载）
npm start
```
