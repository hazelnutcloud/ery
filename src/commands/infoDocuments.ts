import type { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { db } from "../database/connection";
import { infoDocuments } from "../database/schema";
import { eq, and } from "drizzle-orm";
import { generateId } from "../utils/uuid";
import { logger } from "../utils/logger";

// Command definition for registration
export const infoDocCommand = {
  data: new SlashCommandBuilder()
    .setName("info-doc")
    .setDescription("Manage server information documents")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Create a new information document")
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("Document name (unique identifier)")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("description")
            .setDescription("Brief description of what this document contains")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("content")
            .setDescription("Document content (supports markdown)")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create-from-file")
        .setDescription("Create a new document from uploaded file")
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("Document name (unique identifier)")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("description")
            .setDescription("Brief description of what this document contains")
            .setRequired(true)
        )
        .addAttachmentOption((option) =>
          option
            .setName("file")
            .setDescription("Markdown or text file to upload")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("read")
        .setDescription("Display a document")
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("Document name to read")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("update")
        .setDescription("Update an existing document")
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("Document name to update")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("content")
            .setDescription("New document content")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("delete")
        .setDescription("Delete a document")
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("Document name to delete")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("list")
        .setDescription("List all documents in this server")
    ),
};

export async function handleInfoDocumentCommands(
  interaction: ChatInputCommandInteraction
) {
  const subcommand = interaction.options.getSubcommand();

  // Verify user has administrator permissions
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      content:
        "❌ You need Administrator permissions to manage info documents.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (!interaction.guildId) {
    await interaction.reply({
      content: "❌ This command can only be used in a server.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  switch (subcommand) {
    case "create":
      await handleCreate(interaction);
      break;
    case "create-from-file":
      await handleCreateFromFile(interaction);
      break;
    case "read":
      await handleRead(interaction);
      break;
    case "update":
      await handleUpdate(interaction);
      break;
    case "delete":
      await handleDelete(interaction);
      break;
    case "list":
      await handleList(interaction);
      break;
    default:
      await interaction.reply({
        content: "❌ Unknown subcommand.",
        flags: MessageFlags.Ephemeral,
      });
  }
}

async function handleCreate(interaction: ChatInputCommandInteraction) {
  const name = interaction.options.getString("name", true);
  const description = interaction.options.getString("description", true);
  const content = interaction.options.getString("content", true);
  const guildId = interaction.guildId!;

  try {
    // Check if document already exists
    const [existing] = await db
      .select()
      .from(infoDocuments)
      .where(
        and(eq(infoDocuments.guildId, guildId), eq(infoDocuments.name, name))
      );

    if (existing) {
      await interaction.reply({
        content: `❌ A document named "${name}" already exists.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Create new document
    const id = generateId();
    await db.insert(infoDocuments).values({
      id,
      guildId,
      name,
      description,
      content,
      createdBy: interaction.user.id,
    });

    logger.info(
      `Created info document "${name}" in guild ${guildId} by ${interaction.user.tag}`
    );

    await interaction.reply({
      content: `✅ Successfully created document "${name}".`,
      flags: MessageFlags.Ephemeral
    });
  } catch (error) {
    logger.error("Error creating info document:", error);
    await interaction.reply({
      content: "❌ Failed to create document.",
      flags: MessageFlags.Ephemeral
    });
  }
}

async function handleCreateFromFile(interaction: ChatInputCommandInteraction) {
  const name = interaction.options.getString("name", true);
  const description = interaction.options.getString("description", true);
  const attachment = interaction.options.getAttachment("file", true);
  const guildId = interaction.guildId!;

  try {
    // Validate file type
    if (
      !attachment.name?.endsWith(".md") &&
      !attachment.name?.endsWith(".txt")
    ) {
      await interaction.reply({
        content: "❌ File must be a .md or .txt file.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Validate file size (1MB limit)
    if (attachment.size > 1024 * 1024) {
      await interaction.reply({
        content: "❌ File must be smaller than 1MB.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Check if document already exists
    const [existing] = await db
      .select()
      .from(infoDocuments)
      .where(
        and(eq(infoDocuments.guildId, guildId), eq(infoDocuments.name, name))
      );
    if (existing) {
      await interaction.reply({
        content: `❌ A document named "${name}" already exists.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Fetch file content
    const response = await fetch(attachment.url);
    const content = await response.text();

    // Create new document
    const id = generateId();
    await db.insert(infoDocuments).values({
      id,
      guildId,
      name,
      description,
      content,
      createdBy: interaction.user.id,
    });

    logger.info(
      `Created info document "${name}" from file in guild ${guildId} by ${interaction.user.tag}`
    );

    await interaction.reply({
      content: `✅ Successfully created document "${name}" from uploaded file.`,
      flags: MessageFlags.Ephemeral
    });
  } catch (error) {
    logger.error("Error creating info document from file:", error);
    await interaction.reply({
      content: "❌ Failed to create document from file.",
      flags: MessageFlags.Ephemeral
    });
  }
}

async function handleRead(interaction: ChatInputCommandInteraction) {
  const name = interaction.options.getString("name", true);
  const guildId = interaction.guildId!;

  try {
    const [document] = await db
      .select()
      .from(infoDocuments)
      .where(
        and(eq(infoDocuments.guildId, guildId), eq(infoDocuments.name, name))
      );
    if (!document) {
      await interaction.reply({
        content: `❌ Document "${name}" not found.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Create embed for better formatting
    const embed = {
      title: `📄 ${document.name}`,
      description:
        document.content.length > 4000
          ? document.content.substring(0, 4000) + "\n\n*...content truncated*"
          : document.content,
      color: 0x5865f2,
      footer: {
        text: `Created by ${
          document.createdBy
        } • ${document.createdAt.toLocaleDateString()}`,
      },
    };

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    logger.error("Error reading info document:", error);
    await interaction.reply({
      content: "❌ Failed to read document.",
      flags: MessageFlags.Ephemeral
    });
  }
}

async function handleUpdate(interaction: ChatInputCommandInteraction) {
  const name = interaction.options.getString("name", true);
  const content = interaction.options.getString("content", true);
  const guildId = interaction.guildId!;

  try {
    const document = await db
      .select()
      .from(infoDocuments)
      .where(
        and(eq(infoDocuments.guildId, guildId), eq(infoDocuments.name, name))
      );
    if (!document) {
      await interaction.reply({
        content: `❌ Document "${name}" not found.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Update document
    await db
      .update(infoDocuments)
      .set({
        content,
        updatedAt: new Date(),
      })
      .where(
        and(eq(infoDocuments.guildId, guildId), eq(infoDocuments.name, name))
      );

    logger.info(
      `Updated info document "${name}" in guild ${guildId} by ${interaction.user.tag}`
    );

    await interaction.reply({
      content: `✅ Successfully updated document "${name}".`,
      flags: MessageFlags.Ephemeral
    });
  } catch (error) {
    logger.error("Error updating info document:", error);
    await interaction.reply({
      content: "❌ Failed to update document.",
      flags: MessageFlags.Ephemeral
    });
  }
}

async function handleDelete(interaction: ChatInputCommandInteraction) {
  const name = interaction.options.getString("name", true);
  const guildId = interaction.guildId!;

  try {
    const document = await db
      .select()
      .from(infoDocuments)
      .where(
        and(eq(infoDocuments.guildId, guildId), eq(infoDocuments.name, name))
      );
    if (!document) {
      await interaction.reply({
        content: `❌ Document "${name}" not found.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Delete document
    await db
      .delete(infoDocuments)
      .where(
        and(eq(infoDocuments.guildId, guildId), eq(infoDocuments.name, name))
      );

    logger.info(
      `Deleted info document "${name}" in guild ${guildId} by ${interaction.user.tag}`
    );

    await interaction.reply({
      content: `✅ Successfully deleted document "${name}".`,
      flags: MessageFlags.Ephemeral
    });
  } catch (error) {
    logger.error("Error deleting info document:", error);
    await interaction.reply({
      content: "❌ Failed to delete document.",
      flags: MessageFlags.Ephemeral
    });
  }
}

async function handleList(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;

  try {
    const documents = await db
      .select({
        name: infoDocuments.name,
        description: infoDocuments.description,
        createdAt: infoDocuments.createdAt,
        createdBy: infoDocuments.createdBy,
      })
      .from(infoDocuments)
      .where(eq(infoDocuments.guildId, guildId))
      .orderBy(infoDocuments.createdAt);

    if (documents.length === 0) {
      await interaction.reply({
        content: "📄 No information documents found in this server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const documentList = documents
      .map(
        (doc) =>
          `• **${doc.name}** - ${
            doc.description
          }\n  *Created ${doc.createdAt.toLocaleDateString()}*`
      )
      .join("\n\n");

    const embed = {
      title: "📚 Server Information Documents",
      description: documentList,
      color: 0x5865f2,
      footer: {
        text: `${documents.length} document${
          documents.length === 1 ? "" : "s"
        } total`,
      },
    };

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    logger.error("Error listing info documents:", error);
    await interaction.reply({
      content: "❌ Failed to list documents.",
      flags: MessageFlags.Ephemeral
    });
  }
}
