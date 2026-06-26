import { ApiError, ValidationError } from '../types/index.js';

/**
 * Error severity levels
 */
export enum ErrorSeverity {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

/**
 * Error categories
 */
export enum ErrorCategory {
    VALIDATION = 'validation',
    AUTHENTICATION = 'authentication',
    AUTHORIZATION = 'authorization',
    NETWORK = 'network',
    API = 'api',
    SYSTEM = 'system',
    BUSINESS = 'business',
    UNKNOWN = 'unknown'
}

/**
 * Base error class
 */
export abstract class BaseError extends Error {
    code: string;
    severity: ErrorSeverity;
    category: ErrorCategory;
    context: Record<string, unknown>;
    cause?: unknown;
    recoverable: boolean;

    constructor(message: string, code: string, severity: ErrorSeverity, category: ErrorCategory, context: Record<string, unknown> = {}, cause?: unknown, recoverable = true) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.severity = severity;
        this.category = category;
        this.context = {
            timestamp: Date.now(),
            ...context
        };
        this.cause = cause;
        this.recoverable = recoverable;
        // Preserve stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    /**
     * Convert to JSON format
     */
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            severity: this.severity,
            category: this.category,
            context: this.context,
            recoverable: this.recoverable,
            stack: this.stack,
            cause: this.cause ? {
                name: (this.cause as Error).name,
                message: (this.cause as Error).message,
                stack: (this.cause as Error).stack
            } : undefined
        };
    }
}

/**
 * Business logic error
 */
export class BusinessError extends BaseError {
    constructor(message: string, code = 'BUSINESS_ERROR', context: Record<string, unknown> = {}, cause?: unknown) {
        super(message, code, ErrorSeverity.MEDIUM, ErrorCategory.BUSINESS, context, cause, true);
    }
    getUserMessage() {
        return this.message;
    }
}

/**
 * System error
 */
export class SystemError extends BaseError {
    constructor(message: string, code = 'SYSTEM_ERROR', context: Record<string, unknown> = {}, cause?: unknown) {
        super(message, code, ErrorSeverity.HIGH, ErrorCategory.SYSTEM, context, cause, false);
    }
    getUserMessage() {
        return 'An internal system error occurred. Please try again later.';
    }
}

/**
 * Network error
 */
export class NetworkError extends BaseError {
    constructor(message: string, code = 'NETWORK_ERROR', context: Record<string, unknown> = {}, cause?: unknown) {
        super(message, code, ErrorSeverity.MEDIUM, ErrorCategory.NETWORK, context, cause, true);
    }
    getUserMessage() {
        return 'Network connection error. Please check your connection and try again.';
    }
}

/**
 * Authentication error
 */
export class AuthenticationError extends BaseError {
    constructor(message: string, code = 'AUTHENTICATION_ERROR', context: Record<string, unknown> = {}, cause?: unknown) {
        super(message, code, ErrorSeverity.HIGH, ErrorCategory.AUTHENTICATION, context, cause, false);
    }
    getUserMessage() {
        return 'Authentication failed. Please check your credentials.';
    }
}

/**
 * Authorization error
 */
export class AuthorizationError extends BaseError {
    constructor(message: string, code = 'AUTHORIZATION_ERROR', context: Record<string, unknown> = {}, cause?: unknown) {
        super(message, code, ErrorSeverity.HIGH, ErrorCategory.AUTHORIZATION, context, cause, false);
    }
    getUserMessage() {
        return 'Access denied. You do not have permission to perform this action.';
    }
}

/**
 * Tool execution error
 */
export class ToolExecutionError extends BaseError {
    constructor(message: string, toolName: string, code = 'TOOL_EXECUTION_ERROR', context: Record<string, unknown> = {}, cause?: unknown) {
        super(message, code, ErrorSeverity.MEDIUM, ErrorCategory.BUSINESS, { ...context, toolName }, cause, true);
    }
    getUserMessage() {
        return `Tool execution failed: ${this.message}`;
    }
}

/**
 * Default error handling strategy
 */
export class DefaultErrorHandlingStrategy {
    canHandle(_error: Error): boolean {
        return true; // Default strategy handles all errors
    }
    async handle(error: Error, context: Record<string, unknown> = { timestamp: Date.now() }): Promise<BaseError> {
        // If already a standardized error, return directly
        if (error instanceof BaseError) {
            return error;
        }
        // Handle known error types
        if (error instanceof ValidationError) {
            return new BusinessError(error.message, 'VALIDATION_ERROR', context, error);
        }
        if (error instanceof ApiError) {
            return new SystemError(error.message, 'API_ERROR', context, error);
        }
        // Handle unknown errors
        return new SystemError(error.message || 'An unknown error occurred', 'UNKNOWN_ERROR', context, error);
    }
}

/**
 * Network error handling strategy
 */
export class NetworkErrorHandlingStrategy {
    canHandle(error: Error): boolean {
        return error.message.includes('network') ||
            error.message.includes('timeout') ||
            error.message.includes('connection') ||
            error.name === 'NetworkError';
    }
    async handle(error: Error, context: Record<string, unknown> = { timestamp: Date.now() }): Promise<BaseError> {
        return new NetworkError(error.message, 'NETWORK_CONNECTION_ERROR', context, error);
    }
}

/**
 * Retry recovery strategy
 */
export class RetryRecoveryStrategy {
    maxRetries: number;
    retryDelay: number;
    constructor(maxRetries = 3, retryDelay = 1000) {
        this.maxRetries = maxRetries;
        this.retryDelay = retryDelay;
    }
    canRecover(error: BaseError): boolean {
        return error.recoverable &&
            (error.category === ErrorCategory.NETWORK ||
                error.category === ErrorCategory.API);
    }
    async recover(error: BaseError): Promise<{ recovered: boolean; strategy: string }> {
        console.info(`Attempting recovery for error: ${error.code}`, {
            maxRetries: this.maxRetries,
            retryDelay: this.retryDelay
        });
        // Implement specific retry logic here
        // For example, re-execute the failed operation
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return { recovered: true, strategy: 'retry' };
    }
}

export interface ErrorHandlingStrategy {
    canHandle(error: Error): boolean;
    handle(error: Error, context?: Record<string, unknown>): Promise<BaseError>;
}

export interface RecoveryStrategy {
    canRecover(error: BaseError): boolean;
    recover(error: BaseError): Promise<{ recovered: boolean; strategy: string }>;
}

/**
 * Unified error handler
 */
export class ErrorHandler {
    strategies: ErrorHandlingStrategy[] = [];
    recoveryStrategies: RecoveryStrategy[] = [];

    constructor() {
        // Register default strategy
        this.addStrategy(new NetworkErrorHandlingStrategy());
        this.addStrategy(new DefaultErrorHandlingStrategy()); // Default strategy goes last
        // Register recovery strategies
        this.addRecoveryStrategy(new RetryRecoveryStrategy());
    }

    /**
     * Add error handling strategy
     * @param strategy Error handling strategy
     */
    addStrategy(strategy: ErrorHandlingStrategy) {
        this.strategies.push(strategy);
    }

    /**
     * Add error recovery strategy
     * @param strategy Error recovery strategy
     */
    addRecoveryStrategy(strategy: RecoveryStrategy) {
        this.recoveryStrategies.push(strategy);
    }

    /**
     * Handle error
     * @param error Original error
     * @param context Error context
     * @returns Standardized error
     */
    async handleError(error: Error, context?: Record<string, unknown>): Promise<BaseError> {
        const errorContext = {
            timestamp: Date.now(),
            ...context
        };
        try {
            // Find appropriate handling strategy
            const strategy = this.strategies.find(s => s.canHandle(error));
            if (!strategy) {
                console.warn('No suitable error handling strategy found', { error: error.message });
                return new SystemError('No error handler available', 'NO_HANDLER_ERROR', errorContext, error);
            }
            // Handle error
            const standardError = await strategy.handle(error, errorContext);
            // Log error
            this.logError(standardError);
            // Attempt recovery
            await this.attemptRecovery(standardError);
            return standardError;
        }
        catch (handlingError) {
            console.error('Error occurred while handling error', {
                originalError: error.message,
                handlingError: handlingError instanceof Error ? handlingError.message : handlingError
            });
            return new SystemError('Error handling failed', 'ERROR_HANDLER_FAILURE', errorContext, error);
        }
    }

    /**
     * Attempt error recovery
     * @param error Standardized error
     */
    async attemptRecovery(error: BaseError): Promise<void> {
        const recoveryStrategy = this.recoveryStrategies.find(s => s.canRecover(error));
        if (recoveryStrategy) {
            try {
                await recoveryStrategy.recover(error);
                console.info('Error recovery successful', { errorCode: error.code });
            }
            catch (recoveryError) {
                console.warn('Error recovery failed', {
                    errorCode: error.code,
                    recoveryError: recoveryError instanceof Error ? recoveryError.message : recoveryError
                });
            }
        }
    }

    /**
     * Log error
     * @param error Standardized error
     */
    logError(error: BaseError) {
        const logData = {
            code: error.code,
            message: error.message,
            severity: error.severity,
            category: error.category,
            context: error.context,
            recoverable: error.recoverable
        };
        switch (error.severity) {
            case ErrorSeverity.CRITICAL:
                console.error('Critical error occurred', logData);
                break;
            case ErrorSeverity.HIGH:
                console.error('High severity error occurred', logData);
                break;
            case ErrorSeverity.MEDIUM:
                console.warn('Medium severity error occurred', logData);
                break;
            case ErrorSeverity.LOW:
                console.info('Low severity error occurred', logData);
                break;
            default:
                console.warn('Unknown severity error occurred', logData);
        }
    }

    /**
     * Create error context
     * @param options Context options
     */
    static createContext(options: Record<string, unknown> = {}): Record<string, unknown> {
        return {
            timestamp: Date.now(),
            ...options
        };
    }
}

/**
 * Global error handler instance
 */
export const globalErrorHandler = new ErrorHandler();

/**
 * Convenience function: handle error
 * @param error Error object
 * @param context Error context
 */
export async function handleError(error: Error, context?: Record<string, unknown>): Promise<BaseError> {
    return globalErrorHandler.handleError(error, context);
}

/**
 * Convenience function: create business error
 * @param message Error message
 * @param code Error code
 * @param context Error context
 */
export function createBusinessError(message: string, code: string, context: Record<string, unknown>): BusinessError {
    return new BusinessError(message, code, context);
}

/**
 * Convenience function: create system error
 * @param message Error message
 * @param code Error code
 * @param context Error context
 */
export function createSystemError(message: string, code: string, context: Record<string, unknown>): SystemError {
    return new SystemError(message, code, context);
}

/**
 * Error handling decorator
 * @param errorHandler Error handler (optional)
 */
export function HandleErrors(errorHandler?: ErrorHandler) {
    return function (target: object, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
        const originalMethod = descriptor.value;
        const handler = errorHandler || globalErrorHandler;
        descriptor.value = async function (...args: unknown[]) {
            try {
                return await originalMethod.apply(this, args);
            }
            catch (error) {
                const context = ErrorHandler.createContext({
                    operation: `${(target as { constructor: { name: string } }).constructor.name}.${propertyKey}`
                });
                const standardError = await handler.handleError(error as Error, context);
                throw standardError;
            }
        };
        return descriptor;
    };
}
