import { getVisionProvider } from '../providers/index.js';
import type { ChatMessage } from '../providers/types.js';

/**
 * Vision chat service. Delegates to the configured VisionProvider so the
 * same tooling works against any model API family
 * (Chat Completions / Responses / Anthropic).
 */
export class ChatService {
    /**
     * Run a vision completion against the active provider.
     */
    async visionCompletions(messages: ChatMessage[]): Promise<string> {
        const provider = getVisionProvider();
        return provider.complete({ messages, thinking: true });
    }
}

/**
 * Vision chat service instance
 */
export const chatService = new ChatService();
