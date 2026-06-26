import { ApiError } from '../types/index.js';
import { configurationService } from '../core/environment.js';
import { postJson, resolveModel } from './types.js';
import type { VisionProvider, VisionRequest, ChatMessage, ContentPart } from './types.js';

/**
 * Provider for the OpenAI Responses API (POST {base}/responses).
 *
 * The Responses API uses a flat `input` array of items rather than the
 * messages/conversation shape. System instructions go in a top-level
 * `instructions` field; user text/images become message items with an
 * `input_text`/`input_image` content array.
 *
 * Used by OpenAI's Responses endpoint (gpt-4o, o-series reasoning models).
 */
export class ResponsesProvider implements VisionProvider {
    readonly kind = 'responses';

    async complete(request: VisionRequest): Promise<string> {
        const config = configurationService.getVisionConfig();
        const { instructions, input } = this.toResponsesInput(request.messages);

        const body = {
            model: resolveModel(request),
            input,
            ...(instructions ? { instructions } : {}),
            stream: false,
            temperature: request.temperature ?? config.temperature,
            top_p: request.topP ?? config.topP,
            max_output_tokens: request.maxTokens ?? config.maxTokens,
            ...(request.thinking ? { reasoning: { effort: 'medium' } } : {})
        };
        console.info('Request responses API for vision analysis', {
            model: body.model,
            inputItems: input.length
        });
        try {
            const response = await postJson(
                config.url,
                configurationService.getApiKey(),
                { 'Accept-Language': 'en-US,en' },
                body,
                config.timeout
            );
            const result = this.extractOutput(response);
            if (!result) {
                throw new ApiError('Invalid Responses API response: missing output text', { model: body.model });
            }
            console.info('responses API vision analysis successful');
            return result;
        }
        catch (error) {
            console.error('responses API vision analysis failed', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error instanceof ApiError ? error : new ApiError(`API call failed: ${error}`);
        }
    }

    /** Convert normalized chat messages into Responses API input items. */
    private toResponsesInput(messages: ChatMessage[]): { instructions?: string; input: unknown[] } {
        let instructions: string | undefined;
        const input = [];
        for (const msg of messages) {
            if (msg.role === 'system') {
                instructions = typeof msg.content === 'string' ? msg.content : this.asText(msg.content);
                continue;
            }
            input.push({
                role: msg.role,
                content: this.toResponsesContent(msg.content)
            });
        }
        return { instructions, input };
    }

    private toResponsesContent(content: string | ContentPart[]): unknown[] {
        if (typeof content === 'string') {
            return [{ type: 'input_text', text: content }];
        }
        return content.map((part) => {
            if (part.type === 'text') {
                return { type: 'input_text', text: part.text };
            }
            if (part.type === 'image_url') {
                return { type: 'input_image', image_url: part.image_url.url };
            }
            // The Responses API has no native video type; pass as image_url so
            // providers that understand it can still handle it.
            if (part.type === 'video_url') {
                return { type: 'input_image', image_url: part.video_url.url };
            }
            return part;
        });
    }

    private asText(content: ContentPart[]): string {
        return content.filter((p) => p.type === 'text').map((p) => p.text).join('');
    }

    /** Pull assistant text out of a Responses API result. */
    private extractOutput(response: any): string | undefined {
        // Preferred: output_text convenience field
        if (typeof response.output_text === 'string' && response.output_text.length > 0) {
            return response.output_text;
        }
        const items = Array.isArray(response.output) ? response.output : [];
        for (const item of items) {
            if (item?.type === 'message' && Array.isArray(item.content)) {
                const text = item.content
                    .filter((c: any) => c?.type === 'output_text' || c?.type === 'text')
                    .map((c: any) => c.text ?? '')
                    .join('');
                if (text) {
                    return text;
                }
            }
        }
        return undefined;
    }
}
