import { logger } from '../utils/logger';

interface RequestConfig {
  signal?: AbortSignal;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
}

export class RequestManager {
  private static instance: RequestManager;
  private controllers: Map<string, AbortController>;
  private timeouts: Map<string, number>;
  private readonly DEFAULT_TIMEOUT = 15000;
  private readonly DEFAULT_RETRY_COUNT = 3;
  private readonly DEFAULT_RETRY_DELAY = 2000;

  private constructor() {
    this.controllers = new Map();
    this.timeouts = new Map();
  }

  static getInstance(): RequestManager {
    if (!RequestManager.instance) {
      RequestManager.instance = new RequestManager();
    }
    return RequestManager.instance;
  }

  createRequest(requestId: string, config: RequestConfig = {}): { 
    signal: AbortSignal; 
    cleanup: () => void;
    retry: () => Promise<void>;
  } {
    // Cancel any existing request with the same ID
    this.cancelRequest(requestId);

    const controller = new AbortController();
    this.controllers.set(requestId, controller);

    const timeoutId = window.setTimeout(() => {
      if (this.controllers.has(requestId)) {
        this.cancelRequest(requestId);
        logger.warn(`Request ${requestId} timed out after ${config.timeout || this.DEFAULT_TIMEOUT}ms`);
      }
    }, config.timeout || this.DEFAULT_TIMEOUT);

    this.timeouts.set(requestId, timeoutId);

    let retryCount = 0;
    const maxRetries = config.retryCount ?? this.DEFAULT_RETRY_COUNT;
    const retryDelay = config.retryDelay ?? this.DEFAULT_RETRY_DELAY;

    const retry = async () => {
      if (retryCount < maxRetries) {
        retryCount++;
        const delay = retryDelay * Math.pow(2, retryCount - 1);
        logger.info(`Retrying request ${requestId} (attempt ${retryCount}/${maxRetries}) after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return;
      }
      throw new Error(`Max retry attempts (${maxRetries}) reached for request ${requestId}`);
    };

    const cleanup = () => {
      const timeoutId = this.timeouts.get(requestId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        this.timeouts.delete(requestId);
      }
      this.controllers.delete(requestId);
    };

    return {
      signal: controller.signal,
      cleanup,
      retry
    };
  }

  cancelRequest(requestId: string): void {
    const controller = this.controllers.get(requestId);
    const timeoutId = this.timeouts.get(requestId);

    if (controller) {
      controller.abort();
      this.controllers.delete(requestId);
    }

    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeouts.delete(requestId);
    }
  }

  cancelAllRequests(): void {
    this.controllers.forEach((controller, requestId) => {
      this.cancelRequest(requestId);
    });
  }

  isRequestActive(requestId: string): boolean {
    return this.controllers.has(requestId);
  }
}