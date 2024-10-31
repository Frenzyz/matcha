type LogLevel = 'info' | 'warn' | 'error';

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private logHistory = new Set<string>();
  private readonly MAX_HISTORY = 100;
  private readonly DEDUP_INTERVAL = 5000; // 5 seconds

  private createLogKey(level: LogLevel, message: string, args: any[]): string {
    return `${level}:${message}:${JSON.stringify(args)}`;
  }

  private shouldLog(key: string): boolean {
    if (this.logHistory.has(key)) {
      return false;
    }

    this.logHistory.add(key);
    if (this.logHistory.size > this.MAX_HISTORY) {
      const firstKey = this.logHistory.values().next().value;
      this.logHistory.delete(firstKey);
    }

    setTimeout(() => {
      this.logHistory.delete(key);
    }, this.DEDUP_INTERVAL);

    return true;
  }

  private log(level: LogLevel, message: string, ...args: any[]) {
    if (!this.isDevelopment) return;

    const key = this.createLogKey(level, message, args);
    if (!this.shouldLog(key)) return;

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}]`;

    switch (level) {
      case 'info':
        console.log(prefix, message, ...args);
        break;
      case 'warn':
        console.warn(prefix, message, ...args);
        break;
      case 'error':
        console.error(prefix, message, ...args);
        break;
    }
  }

  info(message: string, ...args: any[]) {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: any[]) {
    this.log('warn', message, ...args);
  }

  error(message: string, ...args: any[]) {
    this.log('error', message, ...args);
  }
}

export const logger = new Logger();