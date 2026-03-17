import * as vscode from 'vscode';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

class VSCodeLogger {
    private outputChannel: vscode.OutputChannel;
    private level: LogLevel;
    private levels: Record<LogLevel, number> = {
        error: 0,
        warn: 1,
        info: 2,
        debug: 3
    };

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Semantic Code Search');
        const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined;
        if (envLevel && envLevel in this.levels) {
            this.level = envLevel;
        } else {
            this.level = 'info';
        }
    }

    private shouldLog(level: LogLevel): boolean {
        return this.levels[level] <= this.levels[this.level];
    }

    private formatMessage(prefix: string, ...args: any[]): string {
        const timestamp = new Date().toISOString();
        const formattedArgs = args.map(arg => {
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch {
                    return String(arg);
                }
            }
            return String(arg);
        }).join(' ');
        
        if (formattedArgs) {
            return `[${timestamp}] [${prefix}] ${formattedArgs}`;
        }
        return `[${timestamp}] [${prefix}]`;
    }

    error(prefix: string, ...args: any[]): void {
        const message = this.formatMessage(prefix, ...args);
        this.outputChannel.appendLine(`[ERROR] ${message}`);
        console.error(`[${prefix}]`, ...args);
    }

    warn(prefix: string, ...args: any[]): void {
        if (this.shouldLog('warn')) {
            const message = this.formatMessage(prefix, ...args);
            this.outputChannel.appendLine(`[WARN] ${message}`);
            console.warn(`[${prefix}]`, ...args);
        }
    }

    info(prefix: string, ...args: any[]): void {
        if (this.shouldLog('info')) {
            const message = this.formatMessage(prefix, ...args);
            this.outputChannel.appendLine(`[INFO] ${message}`);
            console.log(`[${prefix}]`, ...args);
        }
    }

    debug(prefix: string, ...args: any[]): void {
        if (this.shouldLog('debug')) {
            const message = this.formatMessage(prefix, ...args);
            this.outputChannel.appendLine(`[DEBUG] ${message}`);
            console.log(`[${prefix}]`, ...args);
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

    show(): void {
        this.outputChannel.show();
    }

    dispose(): void {
        this.outputChannel.dispose();
    }
}

export const logger = new VSCodeLogger();
export type { LogLevel };
