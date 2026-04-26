const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
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
    console.log(`ASCII command: both=${both}, has inverted=${!!result.inverted}`);

    if (both && result.inverted) {
      // Send normal version as file
      const normalFile = new AttachmentBuilder(Buffer.from(result.normal), { name: `ascii_normal_w${width}.txt` });
      await interaction.editReply({
        content: `**ASCII Art (Normal)** - Width: ${width}`,
        files: [normalFile],
      });

      // Send inverted version as file
      const invertedFile = new AttachmentBuilder(Buffer.from(result.inverted), { name: `ascii_inverted_w${width}.txt` });
      await interaction.followUp({
        content: `**ASCII Art (Inverted)** - Width: ${width}`,
        files: [invertedFile],
      });
    } else {
      const label = inverted ? "(Inverted)" : "(Normal)";
      const file = new AttachmentBuilder(Buffer.from(result.normal), { name: `ascii_${label.toLowerCase()}_w${width}.txt` });
      await interaction.editReply({
        content: `**ASCII Art ${label}** - Width: ${width}`,
        files: [file],
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
