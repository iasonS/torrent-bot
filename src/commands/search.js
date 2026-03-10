const { SlashCommandBuilder } = require("discord.js");
const { parseQuery } = require("../services/parser");
const { search } = require("../services/prowlarr");
const { buildResultsEmbed, buildMagnetMessage } = require("../utils/embed");

const data = new SlashCommandBuilder()
  .setName("search")
  .setDescription("Search for torrents using natural language")
  .addStringOption((opt) =>
    opt
      .setName("query")
      .setDescription('e.g. "terminator 2 4k german subtitles"')
      .setRequired(true)
  );

async function execute(interaction) {
  const query = interaction.options.getString("query");

  await interaction.deferReply();

  try {
    // Step 1: Parse natural language query with Claude Haiku
    const parsed = await parseQuery(query);
    console.log(`Parsed "${query}" →`, JSON.stringify(parsed));

    // Step 2: Search Prowlarr
    const results = await search(parsed);
    console.log(`Found ${results.length} results`);

    // Step 3: Send results embed
    const embed = buildResultsEmbed(query, parsed, results);
    await interaction.editReply(embed);

    // Step 4: Send magnet links as follow-up if results exist
    if (results.length > 0) {
      const magnets = buildMagnetMessage(results);
      // Split into chunks if too long for Discord (2000 char limit)
      const chunks = splitMessage(magnets, 1900);
      for (const chunk of chunks) {
        await interaction.followUp({ content: chunk });
      }
    }
  } catch (err) {
    console.error("Search error:", err);
    await interaction.editReply({
      content: `Search failed: ${err.message}`,
    });
  }
}

function splitMessage(text, maxLen) {
  if (text.length <= maxLen) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }
    // Find a good split point (newline)
    let split = remaining.lastIndexOf("\n\n", maxLen);
    if (split === -1) split = remaining.lastIndexOf("\n", maxLen);
    if (split === -1) split = maxLen;
    chunks.push(remaining.slice(0, split));
    remaining = remaining.slice(split).trimStart();
  }
  return chunks;
}

module.exports = { data, execute };
