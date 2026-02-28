type LogLevel = 'error' | 'warn' | 'info' | 'debug';

class Logger {
    private level: LogLevel;
    private levels: Record<LogLevel, number> = {
        error: 0,
        warn: 1,
        info: 2,
        debug: 3
    };

    constructor() {
        const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined;
        if (envLevel && envLevel in this.levels) {
            this.level = envLevel;
        } else {
            this.level = 'warn';
        }
    }

    private shouldLog(level: LogLevel): boolean {
        return this.levels[level] <= this.levels[this.level];
    }

    private formatMessage(prefix: string, ...args: any[]): any[] {
        if (args.length === 0) return [prefix];
        if (typeof args[0] === 'string') {
            return [`[${prefix}] ${args[0]}`, ...args.slice(1)];
        }
        return [`[${prefix}]`, ...args];
    }

    error(prefix: string, ...args: any[]): void {
        console.error(...this.formatMessage(prefix, ...args));
    }

    warn(prefix: string, ...args: any[]): void {
        if (this.shouldLog('warn')) {
            console.warn(...this.formatMessage(prefix, ...args));
        }
    }

    info(prefix: string, ...args: any[]): void {
        if (this.shouldLog('info')) {
            console.log(...this.formatMessage(prefix, ...args));
        }
    }

    debug(prefix: string, ...args: any[]): void {
        if (this.shouldLog('debug')) {
            console.log(...this.formatMessage(prefix, ...args));
        }
    }

    setLevel(level: LogLevel): void {
        if (this.levels[level] !== undefined) {
            this.level = level;
        }
    }

    getLevel(): LogLevel {
        return this.level;
    }
}

export const logger = new Logger();
export type { LogLevel };
