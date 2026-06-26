# VLM MCP Server

**中文文档** | [English](README.md)

![VLM MCP Server 横幅图](assets/vlm-mcp-server-hero.png)

一个模型上下文协议（MCP）服务器，提供图像与视频分析工具，**可配置任意模型提供商**。

这是 `@z_ai/mcp-server` 的逆向工程并扩展的重新实现。原服务器硬编码到 Z.AI / 智谱 Chat Completions API。本项目引入了**提供商抽象层**，使同一套工具可以运行在三种 API 族上：

- **Chat Completions** — 兼容 OpenAI 的 `POST {base}/chat/completions`（OpenAI、Z.AI、智谱、OpenRouter、Together、Groq、DeepSeek、Moonshot、本地 Ollama / LM Studio 等）
- **Responses** — OpenAI `POST {base}/responses`（gpt-4o、o 系列推理模型）
- **Anthropic Messages** — `POST {base}/v1/messages`（Claude 及兼容 Anthropic 的网关）

> 基于原 `@z_ai/mcp-server` 设计（Apache-2.0）。工具、提示词与架构的功劳归原作者（Chao Gong、Lei Yuan / Z.AI）。本项目在其之上扩展了可插拔的提供商层。

## 支持的工具

本服务器为不同图像与视频分析任务提供专项工具：

### 图像分析工具

1. **`ui_to_artifact`** — 将 UI 截图转换为各种产物
   - 从设计生成前端代码（`code`）
   - 为 UI 复刻创建 AI 提示词（`prompt`）
   - 提取设计规范（`spec`）
   - 生成 UI 的自然语言描述（`description`）

2. **`extract_text_from_screenshot`** — OCR 与文字提取
   - 从截图提取代码并保留格式
   - 提取终端输出与日志
   - 支持编程语言提示以提升准确度

3. **`diagnose_error_screenshot`** — 错误诊断与排查
   - 分析错误信息与堆栈跟踪
   - 定位根因并提供可执行的解决方案

4. **`understand_technical_diagram`** — 技术图纸分析
   - 分析架构图、流程图、UML、ER 图、时序图
   - 识别设计模式并解释结构

5. **`analyze_data_visualization`** — 数据可视化洞察
   - 从图表中提取洞察、趋势与异常

6. **`ui_diff_check`** — 视觉回归对比
   - 对比预期与实际 UI 实现
   - 按严重程度排列问题

7. **`analyze_image`** — 通用图像分析（兜底）

### 视频分析工具

8. **`analyze_video`** — 视频内容分析（本地文件或 URL，≤8MB，MP4/MOV/M4V）

## 配置

### 选择提供商

配置提供商最简单的方式是填入下列三组 `OPENAI_*` 环境变量之一 —— 服务器会自动检测哪一组已设置：

| 变量组 | API 族 | 追加到 base URL 的端点 |
|-------|------------|-------------------------------|
| `OPENAI_CHAT_COMPLETIONS_*` | OpenAI Chat Completions | `/chat/completions` |
| `OPENAI_RESPONSES_*` | OpenAI Responses | `/responses` |
| `OPENAI_ANTHROPIC_*` | Anthropic Messages | `/v1/messages`（若 base URL 已以 `/messages` 结尾则保持原样） |

若同时配置了多组，可通过 `VLM_PROVIDER` 显式指定：

| 取值 | API 族 |
|-------|------------|
| `chat-completions` | OpenAI Chat Completions |
| `responses` | OpenAI Responses |
| `anthropic` | Anthropic Messages |
| `auto` *(默认)* | 第一个已配置的 `OPENAI_*` 组，否则自动推断 |

在 `auto` 模式下（未设置任何 `OPENAI_*` 组时），提供商按以下规则推断：
- 内置 Z.AI / 智谱平台模式（`Z_AI_MODE=ZAI|ZHIPU`）→ `chat-completions`
- base URL 包含 `anthropic`，或 key 以 `sk-ant` 开头 → `anthropic`
- 否则 → `chat-completions`（兼容性最广的默认值）

### 环境变量

服务器启动时会从工作目录的 `.env` 文件加载变量（真实环境变量优先）。支持三层配置；优先级为 **按提供商分组 > 通用 > 旧版**。

**按提供商分组**（独立配置每个 API 族 —— `auto` 选择首个同时配置了 key 和 base URL 的组）：

| 变量 | 说明 |
|----------|-------------|
| `OPENAI_CHAT_COMPLETIONS_API_KEY` / `OPENAI_CHAT_COMPLETIONS_BASE_URL` / `OPENAI_CHAT_COMPLETIONS_MODEL` | Chat Completions 提供商 |
| `OPENAI_RESPONSES_API_KEY` / `OPENAI_RESPONSES_BASE_URL` / `OPENAI_RESPONSES_MODEL` | Responses 提供商 |
| `OPENAI_ANTHROPIC_API_KEY` / `OPENAI_ANTHROPIC_BASE_URL` / `OPENAI_ANTHROPIC_MODEL` | Anthropic Messages 提供商 |

**通用：**

| 变量 | 说明 | 默认值 |
|----------|-------------|---------|
| `VLM_API_KEY` | 提供商 API Key | *(必填)* |
| `VLM_BASE_URL` | 提供商 API 根地址（带或不带末尾斜杠） | 智谱默认 |
| `VLM_VISION_MODEL` | 模型名 | `glm-4.6v` |
| `VLM_PROVIDER` | 提供商族（见上） | `auto` |
| `VLM_VISION_MODEL_TEMPERATURE` | 采样温度 | `0.8` |
| `VLM_VISION_MODEL_TOP_P` | Top-p | `0.6` |
| `VLM_VISION_MODEL_MAX_TOKENS` | 最大输出 token | `32768` |
| `VLM_TIMEOUT` | 请求超时（毫秒） | `300000` |
| `VLM_RETRY_COUNT` | 重试次数 | `1` |
| `VLM_ANTHROPIC_VERSION` | `anthropic-version` 头（仅 Anthropic） | `2023-06-01` |
| `VLM_LOG_PATH` | 自定义日志文件路径 | `~/.vlm/vlm-mcp-YYYY-MM-DD.log` |

**旧版（Z.AI / 智谱，与 `@z_ai/mcp-server` 向后兼容）：**

| 变量 | 说明 |
|----------|-------------|
| `Z_AI_API_KEY` / `ZAI_API_KEY` | API Key（未设 `VLM_API_KEY` 时使用） |
| `Z_AI_BASE_URL` | API 根地址 |
| `Z_AI_MODE` / `PLATFORM_MODE` | `ZAI` → `https://api.z.ai/api/paas/v4/`，`ZHIPU` → `https://open.bigmodel.cn/api/paas/v4/` |
| `Z_AI_VISION_MODEL` | 模型名 |
| `Z_AI_VISION_MODEL_TEMPERATURE` / `Z_AI_VISION_MODEL_TOP_P` / `Z_AI_VISION_MODEL_MAX_TOKENS` | 采样参数 |
| `Z_AI_TIMEOUT` / `Z_AI_RETRY_COUNT` | 超时 / 重试 |
| `ANTHROPIC_AUTH_TOKEN` | 未设 `VLM_API_KEY`/`Z_AI_API_KEY` 时的兜底 key |

按提供商分组的变量优先于通用变量，通用变量优先于旧版变量。当前提供商由 `VLM_PROVIDER` 解析，或在 `auto` 模式下由已配置的 `OPENAI_<FAMILY>_*` 组决定。

## 使用方式

服务器通过 stdio 使用 MCP 协议。配置通过环境变量完成 —— 从下列三种提供商族中**任选其一**，填入对应的 `OPENAI_*` 组。服务器会自动检测已配置的组；也可显式设置 `VLM_PROVIDER` 为 `chat-completions` / `responses` / `anthropic`。

| 提供商族 | 环境变量 |
|-----------------|----------------------|
| **Chat Completions**（OpenAI / Z.AI / 智谱 / OpenRouter / Together / Groq / DeepSeek / Moonshot / 本地） | `OPENAI_CHAT_COMPLETIONS_API_KEY` · `OPENAI_CHAT_COMPLETIONS_BASE_URL` · `OPENAI_CHAT_COMPLETIONS_MODEL` |
| **Responses**（OpenAI gpt-4o、o 系列） | `OPENAI_RESPONSES_API_KEY` · `OPENAI_RESPONSES_BASE_URL` · `OPENAI_RESPONSES_MODEL` |
| **Anthropic Messages**（Claude） | `OPENAI_ANTHROPIC_API_KEY` · `OPENAI_ANTHROPIC_BASE_URL` · `OPENAI_ANTHROPIC_MODEL` |

> 同样的值也可通过工作目录的 `.env` 文件，或通用的 `VLM_*` / 旧版 `Z_AI_*` 变量提供。见[配置](#配置)。

### GitHub Packages registry

本包只发布到 GitHub Packages，包名为 `@syntx-ai/vlm-mcp-server`。
在使用下面的 `npx` 命令前，先用具备 `read:packages` 权限的 GitHub token 登录 npm：

```shell
npm login --scope=@syntx-ai --auth-type=legacy --registry=https://npm.pkg.github.com
```

也可以手动配置 `~/.npmrc`：

```ini
@syntx-ai:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

### Claude Code

**一键安装命令**（以 Chat Completions 为例，替换为你的 API Key / Base URL / 模型）：

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

**手动配置** — 编辑 `~/.claude.json` 的 MCP 部分（以 Anthropic 为例）：

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
<summary>Responses API 配置示例</summary>

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

在 Cline 扩展设置中添加 MCP 服务器配置（以 Chat Completions 为例）：

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

参考 [OpenCode MCP 文档](https://opencode.ai/docs/mcp-servers)（以 Anthropic 为例）：

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

### Roo Code / Kilo Code 等其它 MCP 客户端

对于 Roo Code、Kilo Code 等其它支持 MCP 协议的客户端，参考以下通用配置（以 Chat Completions 为例）：

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

### 从源码本地运行

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

## 使用示例

将视觉 MCP 服务器安装到客户端后，即可在 Coding 客户端通过对话直接使用。例如在 Claude Code 中，对话输入 `hi describe this xx.png`，MCP Server 会处理图片并返回描述结果（前置条件是当前目录下有该图片）。

> 除了 Claude Code 之外，直接在客户端粘贴图片不会调用此 MCP Server —— 客户端默认会将图片转码后直接调用模型接口。**最佳实践**是将图片放到本地目录，通过对话指定图片名称或路径来调用 MCP Server，例如：`What does demo.png describe?`

## 故障排除

在本地命令行直接执行下面的命令，验证服务器是否能正常启动，用于排查环境、权限等问题：

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

- 若启动成功，则表示环境正确，问题可能在客户端配置上，请检查客户端的 MCP 配置。
- 若启动失败，请根据错误信息排查，建议将错误信息粘贴给大模型分析。

其它常见问题：

**连接失败**
1. 检查本地是否存在 Node.js 18 或更新版本。
2. 执行 `node -v` 和 `npx -v` 查看是否拥有执行环境。
3. 确认环境变量（`OPENAI_*` 三元组或 `VLM_*`）是否正确配置。

**API Key 无效**
1. 确认 API Key 是否正确复制。
2. 检查 API Key 是否已激活。
3. 确认所选 provider 族与 API Key 匹配（Chat Completions / Responses / Anthropic）。
4. 检查 API Key 是否有足够余额。

**连接超时**
1. 检查网络连接。
2. 确认防火墙设置。
3. 尝试切换到不同的 provider 族或 base URL。
4. 增加超时时间设置（`VLM_TIMEOUT`，默认 300000ms）。

## 架构

```
src/
├── index.ts                  # 入口：启动 MCP 服务器，注册所有工具
├── types/                    # 错误类型（McpError、ApiError、ValidationError 等）
├── core/
│   ├── environment.ts        # 环境配置（通用 VLM_* + 旧版 Z_AI_*）、URL 解析
│   ├── chat-service.ts       # 委托给当前 VisionProvider
│   ├── file-service.ts       # 文件校验 + base64 编码（图像/视频）
│   ├── base-image-service.ts # 所有图像工具共享的图像处理逻辑
│   ├── api-common.ts         # 消息构造、响应辅助、重试封装
│   ├── error-handler.ts      # 错误层级 + 处理/恢复策略
│   └── logger.ts             # stderr + 文件日志（保持 stdout 的 JSON 纯净）
├── providers/                # ← 新增：可插拔的模型提供商抽象
│   ├── types.ts              # VisionProvider 接口、ChatMessage、postJson 辅助
│   ├── chat-completions.ts   # 兼容 OpenAI 的 Chat Completions
│   ├── responses.ts          # OpenAI Responses API
│   ├── anthropic.ts          # Anthropic Messages API
│   └── index.ts              # 提供商选择（VLM_PROVIDER / 自动推断）
├── prompts/                  # 各专项工具的系统提示词
└── tools/                    # 8 个工具注册（7 个图像 + 1 个视频）
```

**提供商层**（`src/providers/`）是关键扩展。每个 provider 实现 `VisionProvider` 接口，接收规范化的 `ChatMessage[]`（以 OpenAI Chat Completions 的 content-part 格式作为内部通用格式）并转换为各 provider 的传输格式。`chat-service.ts` 仅委托给解析出的 provider，因此所有工具代码无需改动。

## 许可证

Apache-2.0
