import type { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { db } from '../database/connection';
import { infoDocuments } from '../database/schema';
import { eq, and } from 'drizzle-orm';
import { generateId } from '../utils/uuid';
import { logger } from '../utils/logger';

// Command definition for registration
export const infoDocCommand = {
  data: new SlashCommandBuilder()
    .setName('info-doc')
    .setDescription('Manage server information documents')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Create a new information document')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('Document name (unique identifier)')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('description')
            .setDescription('Brief description of what this document contains')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('content')
            .setDescription('Document content (supports markdown)')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('create-from-file')
        .setDescription('Create a new document from uploaded file')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('Document name (unique identifier)')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('description')
            .setDescription('Brief description of what this document contains')
            .setRequired(true)
        )
        .addAttachmentOption(option =>
          option
            .setName('file')
            .setDescription('Markdown or text file to upload')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('read')
        .setDescription('Display a document')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('Document name to read')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('update')
        .setDescription('Update an existing document')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('Document name to update')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('content')
            .setDescription('New document content')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('delete')
        .setDescription('Delete a document')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('Document name to delete')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all documents in this server')
    ),
};

export async function handleInfoDocumentCommands(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand();
  
  // Verify user has administrator permissions
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      content: '❌ You need Administrator permissions to manage info documents.',
      ephemeral: true,
    });
    return;
  }

  if (!interaction.guildId) {
    await interaction.reply({
      content: '❌ This command can only be used in a server.',
      ephemeral: true,
    });
    return;
  }

  switch (subcommand) {
    case 'create':
      await handleCreate(interaction);
      break;
    case 'create-from-file':
      await handleCreateFromFile(interaction);
      break;
    case 'read':
      await handleRead(interaction);
      break;
    case 'update':
      await handleUpdate(interaction);
      break;
    case 'delete':
      await handleDelete(interaction);
      break;
    case 'list':
      await handleList(interaction);
      break;
    default:
      await interaction.reply({
        content: '❌ Unknown subcommand.',
        ephemeral: true,
      });
  }
}

async function handleCreate(interaction: ChatInputCommandInteraction) {
  const name = interaction.options.getString('name', true);
  const description = interaction.options.getString('description', true);
  const content = interaction.options.getString('content', true);
  const guildId = interaction.guildId!;

  try {
    // Check if document already exists
    const existing = await db
      .select()
      .from(infoDocuments)
      .where(and(eq(infoDocuments.guildId, guildId), eq(infoDocuments.name, name)))
      .get();

    if (existing) {
      await interaction.reply({
        content: `❌ A document named "${name}" already exists.`,
        ephemeral: true,
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

    logger.info(`Created info document "${name}" in guild ${guildId} by ${interaction.user.tag}`);

    await interaction.reply({
      content: `✅ Successfully created document "${name}".`,
      ephemeral: true,
    });
  } catch (error) {
    logger.error('Error creating info document:', error);
    await interaction.reply({
      content: '❌ Failed to create document.',
      ephemeral: true,
    });
  }
}

async function handleCreateFromFile(interaction: ChatInputCommandInteraction) {
  const name = interaction.options.getString('name', true);
  const description = interaction.options.getString('description', true);
  const attachment = interaction.options.getAttachment('file', true);
  const guildId = interaction.guildId!;

  try {
    // Validate file type
    if (!attachment.name?.endsWith('.md') && !attachment.name?.endsWith('.txt')) {
      await interaction.reply({
        content: '❌ File must be a .md or .txt file.',
        ephemeral: true,
      });
      return;
    }

    // Validate file size (1MB limit)
    if (attachment.size > 1024 * 1024) {
      await interaction.reply({
        content: '❌ File must be smaller than 1MB.',
        ephemeral: true,
      });
      return;
    }

    // Check if document already exists
    const existing = await db
      .select()
      .from(infoDocuments)
      .where(and(eq(infoDocuments.guildId, guildId), eq(infoDocuments.name, name)))
      .get();

    if (existing) {
      await interaction.reply({
        content: `❌ A document named "${name}" already exists.`,
        ephemeral: true,
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

    logger.info(`Created info document "${name}" from file in guild ${guildId} by ${interaction.user.tag}`);

    await interaction.reply({
      content: `✅ Successfully created document "${name}" from uploaded file.`,
      ephemeral: true,
    });
  } catch (error) {
    logger.error('Error creating info document from file:', error);
    await interaction.reply({
      content: '❌ Failed to create document from file.',
      ephemeral: true,
    });
  }
}

async function handleRead(interaction: ChatInputCommandInteraction) {
  const name = interaction.options.getString('name', true);
  const guildId = interaction.guildId!;

  try {
    const document = await db
      .select()
      .from(infoDocuments)
      .where(and(eq(infoDocuments.guildId, guildId), eq(infoDocuments.name, name)))
      .get();

    if (!document) {
      await interaction.reply({
        content: `❌ Document "${name}" not found.`,
        ephemeral: true,
      });
      return;
    }

    // Create embed for better formatting
    const embed = {
      title: `📄 ${document.name}`,
      description: document.content.length > 4000 
        ? document.content.substring(0, 4000) + '\n\n*...content truncated*'
        : document.content,
      color: 0x5865F2,
      footer: {
        text: `Created by ${document.createdBy} • ${document.createdAt.toLocaleDateString()}`,
      },
    };

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    logger.error('Error reading info document:', error);
    await interaction.reply({
      content: '❌ Failed to read document.',
      ephemeral: true,
    });
  }
}

async function handleUpdate(interaction: ChatInputCommandInteraction) {
  const name = interaction.options.getString('name', true);
  const content = interaction.options.getString('content', true);
  const guildId = interaction.guildId!;

  try {
    const document = await db
      .select()
      .from(infoDocuments)
      .where(and(eq(infoDocuments.guildId, guildId), eq(infoDocuments.name, name)))
      .get();

    if (!document) {
      await interaction.reply({
        content: `❌ Document "${name}" not found.`,
        ephemeral: true,
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
      .where(and(eq(infoDocuments.guildId, guildId), eq(infoDocuments.name, name)));

    logger.info(`Updated info document "${name}" in guild ${guildId} by ${interaction.user.tag}`);

    await interaction.reply({
      content: `✅ Successfully updated document "${name}".`,
      ephemeral: true,
    });
  } catch (error) {
    logger.error('Error updating info document:', error);
    await interaction.reply({
      content: '❌ Failed to update document.',
      ephemeral: true,
    });
  }
}

async function handleDelete(interaction: ChatInputCommandInteraction) {
  const name = interaction.options.getString('name', true);
  const guildId = interaction.guildId!;

  try {
    const document = await db
      .select()
      .from(infoDocuments)
      .where(and(eq(infoDocuments.guildId, guildId), eq(infoDocuments.name, name)))
      .get();

    if (!document) {
      await interaction.reply({
        content: `❌ Document "${name}" not found.`,
        ephemeral: true,
      });
      return;
    }

    // Delete document
    await db
      .delete(infoDocuments)
      .where(and(eq(infoDocuments.guildId, guildId), eq(infoDocuments.name, name)));

    logger.info(`Deleted info document "${name}" in guild ${guildId} by ${interaction.user.tag}`);

    await interaction.reply({
      content: `✅ Successfully deleted document "${name}".`,
      ephemeral: true,
    });
  } catch (error) {
    logger.error('Error deleting info document:', error);
    await interaction.reply({
      content: '❌ Failed to delete document.',
      ephemeral: true,
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
        content: '📄 No information documents found in this server.',
        ephemeral: true,
      });
      return;
    }

    const documentList = documents
      .map(doc => `• **${doc.name}** - ${doc.description}\n  *Created ${doc.createdAt.toLocaleDateString()}*`)
      .join('\n\n');

    const embed = {
      title: '📚 Server Information Documents',
      description: documentList,
      color: 0x5865F2,
      footer: {
        text: `${documents.length} document${documents.length === 1 ? '' : 's'} total`,
      },
    };

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    logger.error('Error listing info documents:', error);
    await interaction.reply({
      content: '❌ Failed to list documents.',
      ephemeral: true,
    });
  }
}
