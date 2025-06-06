// Database schema types for JSON columns

import type { MessageBatch } from '../taskThreads/types';

// Task Thread Result Types
export interface TaskThreadResult {
  success: boolean;
  summary: string;
  actions: Array<{
    type: string;
    description: string;
    success: boolean;
    details?: any;
  }>;
  aiResponse?: string;
  processingTime: number;
  metadata?: Record<string, any>;
}

// Tool Execution Types
export interface ToolParameters {
  [key: string]: any;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    executionTime?: number;
    retries?: number;
    rateLimited?: boolean;
  };
}

// Re-export MessageBatch for convenience
export type { MessageBatch };
