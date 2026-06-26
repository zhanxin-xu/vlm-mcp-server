import { ApiError } from '../types/index.js';
import { configurationService } from '../core/environment.js';

/**
 * A normalized chat message. The OpenAI Chat Completions format is the
 * internal lingua franca: content is an array of typed parts
 * ({ text | image_url | video_url }). Providers translate this to their
 * own wire format.
 */
export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string | ContentPart[];
}

export type ContentPart =
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }
    | { type: 'video_url'; video_url: { url: string } };

export interface VisionRequest {
    messages: ChatMessage[];
    /** Optional override for the configured model. */
    model?: string;
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    /** Whether to request extended thinking / reasoning. */
    thinking?: boolean;
}

/**
 * A model provider capable of running vision analysis against some backend.
 * Implementations wrap a specific HTTP API family
 * (OpenAI Chat Completions, OpenAI Responses, Anthropic Messages).
 */
export interface VisionProvider {
    /** Identifier of the API family, e.g. "chat-completions". */
    readonly kind: string;
    /** Run a vision request and return the assistant's text content. */
    complete(request: VisionRequest): Promise<string>;
}

/**
 * Shared HTTP helper: POST JSON with bearer auth, timeout, and rich error
 * reporting. Returns parsed JSON or throws ApiError.
 */
export async function postJson(
    url: string,
    apiKey: string,
    headers: Record<string, string>,
    body: unknown,
    timeoutMs: number,
    bearerPrefix = 'Bearer'
): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        // Auth: Bearer token by default; when bearerPrefix is empty (Anthropic),
        // use x-api-key instead and skip the Authorization header entirely.
        const requestHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            // Node's undici fetch can stall on some proxies/gateways without an
            // explicit keep-alive; setting it ensures the request completes
            // instead of hanging on connection negotiation.
            'Connection': 'keep-alive',
            ...headers
        };
        if (bearerPrefix) {
            requestHeaders['Authorization'] = `${bearerPrefix} ${apiKey}`;
        }
        else {
            requestHeaders['x-api-key'] = apiKey;
        }
        const response = await fetch(url, {
            method: 'POST',
            headers: requestHeaders,
            body: JSON.stringify(body),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
            const errorText = await response.text();
            throw new ApiError(`HTTP ${response.status}: ${errorText}`, { url }, response.status, errorText);
        }
        return await response.json();
    }
    catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof ApiError) {
            throw error;
        }
        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                throw new ApiError(`Request timeout after ${timeoutMs}ms when calling ${url}`, { url });
            }
            if (error.message.includes('fetch failed')) {
                const causeInfo = error.cause ? ` | Cause: ${error.cause}` : '';
                throw new ApiError(`Network error: Failed to connect to ${url}. Original error: ${error.message}${causeInfo}`, { url });
            }
            throw new ApiError(`Network error: ${error.message}`, { url });
        }
        throw new ApiError(`Network error: ${String(error)}`, { url });
    }
}

/** Resolve the configured vision model, allowing per-request overrides. */
export function resolveModel(request: VisionRequest): string {
    return request.model || configurationService.getVisionConfig().model;
}
