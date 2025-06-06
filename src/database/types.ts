// Database schema types for JSON columns

import type { MessageBatch } from "../taskThreads/types";

// Task Thread Result Types
export interface TaskThreadResult {
  success: boolean;
  summary: string;
  actions: Array<{
    type: string;
    description: string;
    success: boolean;
    details?: {
      toolName: string;
      executionId: string;
      result: unknown;
      error: string | undefined;
      executionTimeMs: number;
    };
  }>;
  aiResponse?: string;
  processingTime: number;
  metadata?: Record<string, unknown>;
}

// Re-export MessageBatch for convenience
export type { MessageBatch };
