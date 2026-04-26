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

    if (both && result.inverted) {
      // Send normal version (single message)
      await interaction.editReply({
        content: `**ASCII Art (Normal)** - Width: ${width}\n\n\`\`\`\n${result.normal}\n\`\`\``,
      });

      // Send inverted version (single message)
      await interaction.followUp({
        content: `**ASCII Art (Inverted)** - Width: ${width}\n\n\`\`\`\n${result.inverted}\n\`\`\``,
      });
    } else {
      const label = inverted ? "(Inverted)" : "(Normal)";
      await interaction.editReply({
        content: `**ASCII Art ${label}** - Width: ${width}\n\n\`\`\`\n${result.normal}\n\`\`\``,
      });
    }
  } catch (error) {
    console.error("ASCII command error:", error);
    await interaction.editReply({
      content: `❌ Error: ${error.message}`,
    });
  }
}

module.exports = { data, execute };
