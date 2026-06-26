import { ApiError } from '../types/index.js';
import { configurationService } from '../core/environment.js';
import { postJson, resolveModel } from './types.js';
import type { VisionProvider, VisionRequest, ChatMessage } from './types.js';

/**
 * Provider for OpenAI-compatible Chat Completions APIs.
 *
 * Wire format: POST {base}/chat/completions with { model, messages, stream, ... }.
 * Used by Z.AI / Zhipu (glm-4.6v), OpenAI (gpt-4o), OpenRouter, Together,
 * Groq, DeepSeek, Moonshot, local Ollama/LM Studio, etc.
 */
export class ChatCompletionsProvider implements VisionProvider {
    readonly kind = 'chat-completions';

    async complete(request: VisionRequest): Promise<string> {
        const config = configurationService.getVisionConfig();
        const body = {
            model: resolveModel(request),
            messages: request.messages,
            ...(request.thinking ? { thinking: { type: 'enabled' } } : {}),
            stream: false,
            temperature: request.temperature ?? config.temperature,
            top_p: request.topP ?? config.topP,
            max_tokens: request.maxTokens ?? config.maxTokens
        };
        console.info('Request chat-completions API for vision analysis', {
            model: body.model,
            messageCount: request.messages.length
        });
        try {
            const response = await postJson(
                config.url,
                configurationService.getApiKey(),
                { 'X-Title': '4.5V MCP Local', 'Accept-Language': 'en-US,en' },
                body,
                config.timeout
            );
            const result = response.choices?.[0]?.message?.content;
            if (!result) {
                throw new ApiError('Invalid API response: missing content', { model: body.model });
            }
            console.info('chat-completions API vision analysis successful');
            return typeof result === 'string' ? result : this.flattenContent(result);
        }
        catch (error) {
            console.error('chat-completions API vision analysis failed', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error instanceof ApiError ? error : new ApiError(`API call failed: ${error}`);
        }
    }

    /** Some OpenAI-compatible servers return content as an array of parts. */
    private flattenContent(content: unknown): string {
        if (Array.isArray(content)) {
            return content
                .map((part) => (typeof part === 'string' ? part : part?.text ?? ''))
                .join('');
        }
        return String(content);
    }
}

/** Type guard kept for symmetry; messages already conform to the wire format. */
export function toChatCompletionsMessages(messages: ChatMessage[]): unknown[] {
    return messages as unknown as unknown[];
}
