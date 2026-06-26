// Error types
export class McpError extends Error {
    code: string;
    context?: Record<string, unknown>;
    constructor(message: string, code: string, context?: Record<string, unknown>) {
        super(message);
        this.code = code;
        this.context = context;
        this.name = 'McpError';
    }
}
export class ValidationError extends McpError {
    field?: string;
    constructor(message: string, context?: Record<string, unknown>, field?: string) {
        super(message, 'VALIDATION_ERROR', context);
        this.field = field;
        this.name = 'ValidationError';
    }
}
export class ApiError extends McpError {
    statusCode?: number;
    details?: unknown;
    constructor(message: string, context?: Record<string, unknown>, statusCode?: number, details?: unknown) {
        super(message, 'API_ERROR', context);
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'ApiError';
    }
}
export class FileNotFoundError extends McpError {
    constructor(filePath: string) {
        super(`File not found: ${filePath}`, 'FILE_NOT_FOUND', { filePath });
        this.name = 'FileNotFoundError';
    }
}
