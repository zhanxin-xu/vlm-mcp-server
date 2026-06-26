import { ApiError } from '../types/index.js';
import { configurationService } from '../core/environment.js';
import { postJson, resolveModel } from './types.js';
import type { VisionProvider, VisionRequest, ChatMessage, ContentPart } from './types.js';

/**
 * Provider for the Anthropic Messages API (POST {base}/v1/messages).
 *
 * Differences from Chat Completions:
 *  - System prompt is a top-level `system` field, not a message.
 *  - Auth uses `x-api-key` header plus a required `anthropic-version` header.
 *  - Image parts use `{ type: 'image', source: { type: 'base64'|'url', ... } }`.
 *  - Responses return `content: [{ type: 'text', text }]`.
 *  - Extended thinking is enabled via `thinking: { type: 'enabled', budget_tokens }`.
 *
 * Also works with Anthropic-compatible gateways (e.g. some proxies) and with
 * providers that expose an Anthropic-compatible endpoint.
 */
export class AnthropicProvider implements VisionProvider {
    readonly kind = 'anthropic';

    async complete(request: VisionRequest): Promise<string> {
        const config = configurationService.getVisionConfig();
        const { system, messages } = this.toAnthropicMessages(request.messages);

        const body = {
            model: resolveModel(request),
            messages,
            ...(system ? { system } : {}),
            max_tokens: request.maxTokens ?? config.maxTokens,
            temperature: request.temperature ?? config.temperature,
            top_p: request.topP ?? config.topP,
            stream: false,
            ...(request.thinking
                ? { thinking: { type: 'enabled', budget_tokens: Math.min(config.maxTokens, 16000) } }
                : {})
        };
        console.info('Request anthropic messages API for vision analysis', {
            model: body.model,
            messageCount: messages.length
        });
        try {
            const response = await postJson(
                config.url,
                configurationService.getApiKey(),
                {
                    'anthropic-version': configurationService.getAnthropicVersion(),
                    'Accept-Language': 'en-US,en'
                },
                body,
                config.timeout,
                '' // Anthropic uses x-api-key via header, not Bearer
            );
            const result = this.extractText(response);
            if (!result) {
                throw new ApiError('Invalid Anthropic API response: missing content', { model: body.model });
            }
            console.info('anthropic messages API vision analysis successful');
            return result;
        }
        catch (error) {
            console.error('anthropic messages API vision analysis failed', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error instanceof ApiError ? error : new ApiError(`API call failed: ${error}`);
        }
    }

    /** Split normalized messages into Anthropic's system field + message list. */
    private toAnthropicMessages(messages: ChatMessage[]): { system?: string; messages: unknown[] } {
        const systemParts: string[] = [];
        const out: unknown[] = [];
        for (const msg of messages) {
            if (msg.role === 'system') {
                systemParts.push(typeof msg.content === 'string' ? msg.content : this.asText(msg.content));
                continue;
            }
            out.push({
                role: msg.role,
                content: this.toAnthropicContent(msg.content)
            });
        }
        const system = systemParts.join('\n\n');
        return { system: system || undefined, messages: out };
    }

    private toAnthropicContent(content: string | ContentPart[]): unknown[] {
        if (typeof content === 'string') {
            return [{ type: 'text', text: content }];
        }
        return content.map((part) => {
            if (part.type === 'text') {
                return { type: 'text', text: part.text };
            }
            if (part.type === 'image_url') {
                return { type: 'image', source: this.toAnthropicSource(part.image_url.url) };
            }
            // Anthropic has no native video type; pass URLs through as-is in a
            // text hint so at least the URL is visible to the model.
            if (part.type === 'video_url') {
                return { type: 'text', text: `(video) ${part.video_url.url}` };
            }
            return part;
        });
    }

    /** Convert a data URL or http(s) URL to an Anthropic image source. */
    private toAnthropicSource(url: string): { type: 'base64'; media_type: string; data: string } | { type: 'url'; url: string } {
        const dataMatch = /^data:([^;]+);base64,(.*)$/.exec(url);
        if (dataMatch) {
            return { type: 'base64', media_type: dataMatch[1], data: dataMatch[2] };
        }
        return { type: 'url', url };
    }

    private asText(content: ContentPart[]): string {
        return content.filter((p) => p.type === 'text').map((p) => p.text).join('');
    }

    /** Extract concatenated text from an Anthropic Messages response. */
    private extractText(response: any): string | undefined {
        const blocks = Array.isArray(response.content) ? response.content : [];
        const text = blocks
            .filter((b: any) => b?.type === 'text')
            .map((b: any) => b.text ?? '')
            .join('');
        return text || undefined;
    }
}
