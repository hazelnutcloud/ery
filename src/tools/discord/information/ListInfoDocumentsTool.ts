import type { ToolContext, ToolResult, ToolParameter, ToolPermissions } from '../../base/Tool';
import { Tool } from '../../base/Tool';
import { db } from '../../../database/connection';
import { infoDocuments } from '../../../database/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../../../utils/logger';

export class ListInfoDocumentsTool extends Tool {
  constructor() {
    const parameters: ToolParameter[] = [];

    const permissions: ToolPermissions = {
      botPermissions: [],
      allowInDMs: false, // Server-specific documents
    };

    super(
      'list_info_documents',
      'List all available information documents in the current server',
      parameters,
      permissions
    );
  }

  async execute(context: ToolContext, parameters: Record<string, unknown>): Promise<ToolResult> {
    try {
      if (!context.guild) {
        return {
          success: false,
          error: 'This tool can only be used in a server.'
        };
      }

      // Fetch all documents for this guild
      const documents = await db
        .select({
          name: infoDocuments.name,
          description: infoDocuments.description,
          createdAt: infoDocuments.createdAt,
          createdBy: infoDocuments.createdBy,
        })
        .from(infoDocuments)
        .where(eq(infoDocuments.guildId, context.guild.id))
        .orderBy(infoDocuments.createdAt);

      if (documents.length === 0) {
        return {
          success: true,
          data: [],
          message: 'No information documents found in this server.'
        };
      }

      logger.info(`Listed ${documents.length} info documents for guild ${context.guild.id}`);

      const documentSummary = documents
        .map(doc => `${doc.name}: ${doc.description}`)
        .join(', ');

      return {
        success: true,
        data: documents,
        message: `Found ${documents.length} information document${documents.length === 1 ? '' : 's'}: ${documentSummary}`
      };
    } catch (error) {
      logger.error('Error listing info documents:', error);
      return {
        success: false,
        error: 'Failed to list information documents.'
      };
    }
  }
}
