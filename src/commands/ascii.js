const { SlashCommandBuilder } = require("discord.js");
const { processImage } = require("../services/ascii.js");

const data = new SlashCommandBuilder()
  .setName("ascii")
  .setDescription("Convert an image to ASCII art")
  .addStringOption((opt) =>
    opt.setName("source").setDescription("Image URL or drag/drop image file").setRequired(true)
  )
  .addIntegerOption((opt) =>
    opt
      .setName("width")
      .setDescription("ASCII art width in characters (default: 100)")
      .setMinValue(40)
      .setMaxValue(200)
  )
  .addBooleanOption((opt) =>
    opt.setName("inverted").setDescription("Use inverted color mapping (default: false)")
  )
  .addBooleanOption((opt) =>
    opt.setName("both").setDescription("Generate both normal and inverted versions")
  );

async function execute(interaction) {
  await interaction.deferReply();

  try {
    const source = interaction.options.getString("source");
    const width = interaction.options.getInteger("width") || 100;
    const inverted = interaction.options.getBoolean("inverted") || false;
    const both = interaction.options.getBoolean("both") || false;

    // Handle attachment URLs from Discord
    let imageUrl = source;
    if (interaction.options.data[0]?.attachment) {
      imageUrl = interaction.options.data[0].attachment.url;
    }

    const result = await processImage(imageUrl, { width, both });

    // Split long ASCII art into Discord message chunks (2000 char limit)
    const splitMessage = (text, maxLength = 2000) => {
      const messages = [];
      let current = "";
      for (const line of text.split("\n")) {
        if ((current + line + "\n").length > maxLength) {
          messages.push(current);
          current = line + "\n";
        } else {
          current += line + "\n";
        }
      }
      if (current) messages.push(current);
      return messages;
    };

    const splitMessage = (text, maxLength = 1950) => {
      const messages = [];
      let current = "";
      for (const line of text.split("\n")) {
        if ((current + line + "\n").length > maxLength) {
          if (current) messages.push(current);
          current = line + "\n";
        } else {
          current += line + "\n";
        }
      }
      if (current) messages.push(current);
      return messages;
    };

    if (both && result.inverted) {
      const normalChunks = splitMessage(result.normal);
      const invertedChunks = splitMessage(result.inverted);

      // Send normal version
      await interaction.editReply({
        content: `**ASCII Art (Normal)** - Width: ${width}\n\n\`\`\`\n${normalChunks[0]}\n\`\`\``,
      });

      // Send additional normal chunks if needed
      for (let i = 1; i < normalChunks.length; i++) {
        await interaction.followUp({ content: `\`\`\`\n${normalChunks[i]}\n\`\`\`` });
      }

      // Send inverted version in separate message
      await interaction.followUp({
        content: `\n**ASCII Art (Inverted)** - Width: ${width}\n\n\`\`\`\n${invertedChunks[0]}\n\`\`\``,
      });

      // Send additional inverted chunks if needed
      for (let i = 1; i < invertedChunks.length; i++) {
        await interaction.followUp({ content: `\`\`\`\n${invertedChunks[i]}\n\`\`\`` });
      }
    } else {
      const chunks = splitMessage(result.normal);
      const label = inverted ? "(Inverted)" : "(Normal)";

      await interaction.editReply({
        content: `**ASCII Art ${label}** - Width: ${width}\n\n\`\`\`\n${chunks[0]}\n\`\`\``,
      });

      for (let i = 1; i < chunks.length; i++) {
        await interaction.followUp({ content: `\`\`\`\n${chunks[i]}\n\`\`\`` });
      }
    }
  } catch (error) {
    console.error("ASCII command error:", error);
    await interaction.editReply({
      content: `❌ Error: ${error.message}`,
    });
  }
}

module.exports = { data, execute };
