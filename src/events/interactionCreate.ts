import type { Interaction } from 'discord.js';
import { logger } from '../utils/logger';
import { handleInfoDocumentCommands } from '../commands/infoDocuments';

export async function handleInteractionCreate(interaction: Interaction) {
  try {
    if (!interaction.isChatInputCommand()) return;

    logger.info(`Received command: ${interaction.commandName} from ${interaction.user.tag}`);

    // Route to appropriate command handler
    switch (interaction.commandName) {
      case 'info-doc':
        await handleInfoDocumentCommands(interaction);
        break;
      default:
        await interaction.reply({
          content: 'Unknown command!',
          ephemeral: true,
        });
    }
  } catch (error) {
    logger.error('Error handling interaction:', error);
    
    const errorMessage = 'An error occurred while processing your command.';
    
    if (interaction.isChatInputCommand() && (interaction.replied || interaction.deferred)) {
      await interaction.followUp({
        content: errorMessage,
        ephemeral: true,
      });
    } else if (interaction.isChatInputCommand()) {
      await interaction.reply({
        content: errorMessage,
        ephemeral: true,
      });
    }
  }
}
