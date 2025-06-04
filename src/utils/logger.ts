import { config } from '../config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const logLevels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const levelColors: Record<LogLevel, string> = {
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m',  // Green
  warn: '\x1b[33m',  // Yellow
  error: '\x1b[31m', // Red
};

const resetColor = '\x1b[0m';

class Logger {
  private minLevel: number;

  constructor() {
    this.minLevel = logLevels[config.logging.level as LogLevel] || logLevels.info;
  }

  private log(level: LogLevel, message: string, ...args: any[]) {
    if (logLevels[level] < this.minLevel) return;

    const timestamp = new Date().toISOString();
    const color = config.logging.colors ? levelColors[level] : '';
    const reset = config.logging.colors ? resetColor : '';
    
    const prefix = `${color}[${timestamp}] [${level.toUpperCase()}]${reset}`;
    
    console.log(prefix, message, ...args);
  }

  debug(message: string, ...args: any[]) {
    this.log('debug', message, ...args);
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
