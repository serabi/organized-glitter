import { createLogger } from './secureLogger';

const logger = createLogger('RequestDebugger');

interface RequestInfo {
  id: string;
  source: string;
  timestamp: number;
  status: 'started' | 'completed' | 'aborted' | 'error';
  details?: unknown;
}

class RequestDebugger {
  private requests = new Map<string, RequestInfo>();
  private static instance: RequestDebugger;

  static getInstance(): RequestDebugger {
    if (!RequestDebugger.instance) {
      RequestDebugger.instance = new RequestDebugger();
    }
    return RequestDebugger.instance;
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  startRequest(source: string, details?: unknown): string {
    const id = this.generateId();
    const request: RequestInfo = {
      id,
      source,
      timestamp: Date.now(),
      status: 'started',
      details,
    };

    this.requests.set(id, request);
    logger.debug(`🚀 Request started: ${source} (${id})`, details);
    return id;
  }

  completeRequest(id: string, details?: unknown): void {
    const request = this.requests.get(id);
    if (request) {
      request.status = 'completed';
      request.details = { ...(request.details as object), ...(details as object) };
      logger.debug(
        `✅ Request completed: ${request.source} (${id}) in ${Date.now() - request.timestamp}ms`
      );
    }
  }

  abortRequest(id: string, reason?: string): void {
    const request = this.requests.get(id);
    if (request) {
      request.status = 'aborted';
      request.details = { ...(request.details as object), abortReason: reason };
      logger.debug(`🚫 Request aborted: ${request.source} (${id}) - ${reason || 'Unknown reason'}`);
    }
  }

  errorRequest(id: string, error: unknown): void {
    const request = this.requests.get(id);
    if (request) {
      request.status = 'error';
      request.details = { ...(request.details as object), error };
      logger.debug(
        `❌ Request error: ${request.source} (${id}) - ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  getActiveRequests(): RequestInfo[] {
    return Array.from(this.requests.values()).filter(r => r.status === 'started');
  }

  cleanupOldRequests(): void {
    const cutoff = Date.now() - 30000; // 30 seconds
    for (const [id, request] of this.requests.entries()) {
      if (request.timestamp < cutoff) {
        this.requests.delete(id);
      }
    }
  }

  logActiveRequests(): void {
    const active = this.getActiveRequests();
    if (active.length > 0) {
      logger.debug(
        `📊 Active requests (${active.length}):`,
        active.map(r => `${r.source} (${r.id})`)
      );
    }
  }
}

export const requestDebugger = RequestDebugger.getInstance();

// Auto cleanup every 30 seconds
setInterval(() => {
  requestDebugger.cleanupOldRequests();
}, 30000);
