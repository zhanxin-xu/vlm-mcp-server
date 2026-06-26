import type { ChatMessage, ContentPart } from '../providers/types.js';
import { ApiError, FileNotFoundError, ValidationError } from '../types/index.js';
import { configurationService } from './environment.js';

/**
 * Create multimodal message content
 * @param content Content array including images, text, etc.
 * @param prompt Text prompt
 * @returns Formatted message array
 */
export function createMultiModalMessage(content: ContentPart[], prompt: string): ChatMessage[] {
    return [{
        role: 'user',
        content: [...content, { type: 'text', text: prompt }]
    }];
}

/**
 * Create text message
 * @param prompt Text content
 * @returns Formatted message array
 */
export function createTextMessage(prompt: string): ChatMessage[] {
    return [{
        role: 'user',
        content: [{ type: 'text', text: prompt }]
    }];
}

/**
 * Create image message content
 * @param imageUrl Image URL or base64 data
 * @returns Image content object
 */
export function createImageContent(imageUrl: string): ContentPart {
    return {
        type: 'image_url',
        image_url: { url: imageUrl }
    };
}

/**
 * Create video message content
 * @param videoUrl Video URL or base64 data
 * @returns Video content object
 */
export function createVideoContent(videoUrl: string): ContentPart {
    return {
        type: 'video_url', // Most AI models treat video as image_url type
        video_url: { url: videoUrl }
    };
}

/**
 * Create error response
 * @param message Error message
 * @param error Optional error object
 * @returns Standardized error response
 */
export function createErrorResponse(message: string, error?: Error) {
    return {
        success: false as const,
        error: message,
        timestamp: Date.now(),
        ...(error && { context: { stack: error.stack, name: error.name } })
    };
}

/**
 * Create success response
 * @param data Response data
 * @returns Standardized success response
 */
export function createSuccessResponse<T>(data: T) {
    return {
        success: true as const,
        data,
        timestamp: Date.now()
    };
}

export type StandardResponse<T = string> = ReturnType<typeof createSuccessResponse<T>> | ReturnType<typeof createErrorResponse>;

/**
 * Format response content to MCP format
 * @param response API response
 * @returns MCP tool response format
 */
export function formatMcpResponse(response: StandardResponse) {
    if (response.success) {
        const text = typeof response.data === 'string'
            ? response.data
            : JSON.stringify(response.data, null, 2);
        return {
            content: [{ type: 'text' as const, text }]
        };
    }
    else {
        return {
            content: [{
                type: 'text' as const,
                text: `Error: ${response.error}`
            }],
            isError: true
        };
    }
}

export interface RetryOptions {
    shouldRetry?: (error: unknown, attempt: number) => boolean;
}

/**
 * Check whether an error is likely to be transient and worth retrying.
 */
export function isRetryableError(error: unknown): boolean {
    if (error instanceof FileNotFoundError || error instanceof ValidationError) {
        return false;
    }
    if (error instanceof ApiError) {
        if (typeof error.statusCode === 'number') {
            return error.statusCode === 408
                || error.statusCode === 409
                || error.statusCode === 425
                || error.statusCode === 429
                || error.statusCode >= 500;
        }
        return /timeout|network|fetch failed|econnreset|etimedout|eai_again|enotfound|econnrefused/i.test(error.message);
    }
    if (error && typeof error === 'object') {
        const code = (error as { code?: unknown }).code;
        if (code === 'VALIDATION_ERROR' || code === 'FILE_NOT_FOUND') {
            return false;
        }
        const cause = (error as { cause?: unknown }).cause;
        if (cause && cause !== error) {
            return isRetryableError(cause);
        }
    }
    return false;
}

function normalizeRetryCount(maxRetries: number): number {
    return Number.isFinite(maxRetries) && maxRetries > 0 ? Math.floor(maxRetries) : 0;
}

/**
 * Create async function with retry mechanism
 * @param fn Async function to execute
 * @param maxRetries Maximum retry attempts after the initial call
 * @param delay Retry delay in milliseconds
 * @returns Wrapped function
 */
export function withRetry<T extends (...args: any[]) => Promise<any>>(fn: T, maxRetries = 3, delay = 1000, options: RetryOptions = {}): T {
    return (async (...args: Parameters<T>) => {
        let lastError: unknown;
        const retryLimit = normalizeRetryCount(maxRetries);
        const shouldRetry = options.shouldRetry || isRetryableError;
        for (let attempt = 0; attempt <= retryLimit; attempt++) {
            try {
                return await fn(...args);
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                if (attempt === retryLimit || !shouldRetry(lastError, attempt)) {
                    throw lastError;
                }
                // Exponential backoff
                const waitTime = delay * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
        throw lastError;
    }) as T;
}

/**
 * Create a retry wrapper using the configured vision retry count.
 */
export function withConfiguredRetry<T extends (...args: any[]) => Promise<any>>(fn: T, delay = 1000): T {
    return withRetry(fn, configurationService.getVisionConfig().retryCount, delay);
}
