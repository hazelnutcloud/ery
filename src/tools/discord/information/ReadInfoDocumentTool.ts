import {
  AgentTool,
  type AgentExecutionContext,
  type ToolResult,
} from "../../base/AgentTool";
import { db } from "../../../database/connection";
import { infoDocuments } from "../../../database/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "../../../utils/logger";

export class ReadInfoDocumentTool extends AgentTool {
  constructor() {
    super(
      "read_info_document",
      "Bot autonomously reads information documents for context analysis",
      [
        {
          name: "name",
          type: "string",
          description: "The name of the information document to read",
          required: true,
        },
      ],
      {
        botPermissions: [],
        allowInDMs: false,
      }
    );
  }

  async execute(
    context: AgentExecutionContext,
    parameters: Record<string, unknown>
  ): Promise<ToolResult> {
    try {
      if (!context.guild) {
        return {
          success: false,
          error: "This tool can only be used in a server.",
        };
      }

      const documentName = parameters.name as string;

      // Fetch the specific document
      const document = db
        .select()
        .from(infoDocuments)
        .where(
          and(
            eq(infoDocuments.guildId, context.guild.id),
            eq(infoDocuments.name, documentName)
          )
        )
        .get();

      if (!document) {
        return {
          success: false,
          error: `Information document "${documentName}" not found in this server.`,
        };
      }

      logger.info(
        `Read info document "${documentName}" for guild ${context.guild.id}`
      );

      return {
        success: true,
        data: {
          name: document.name,
          description: document.description,
          content: document.content,
          createdAt: document.createdAt,
          updatedAt: document.updatedAt,
          createdBy: document.createdBy,
        },
        message: `Retrieved information document "${documentName}" (${document.description}). Content: ${document.content}`,
      };
    } catch (error) {
      logger.error("Error reading info document:", error);
      return {
        success: false,
        error: "Failed to read information document.",
      };
    }
  }
}
