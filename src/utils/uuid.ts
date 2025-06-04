import { randomUUID } from 'crypto';

/**
 * Generate a new UUID v4
 */
export function generateId(): string {
  return randomUUID();
}

/**
 * Create a composite ID from multiple parts
 */
export function createCompositeId(...parts: string[]): string {
  return parts.join('_');
}

/**
 * Parse a composite ID into its parts
 */
export function parseCompositeId(compositeId: string): string[] {
  return compositeId.split('_');
}
