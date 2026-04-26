const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { parseQuery } = require("../services/parser");
const { search } = require("../services/prowlarr");
const { buildResultsEmbed, buildMagnetMessage } = require("../utils/embed");
const { recordSearch, recordError } = require("../stats");

// Rate limiting: max 1 search per user every 5 seconds
const userCooldowns = new Map();
const COOLDOWN_MS = 5000;

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
  const userId = interaction.user.id;
  const now = Date.now();
  const lastSearch = userCooldowns.get(userId) || 0;

  if (now - lastSearch < COOLDOWN_MS) {
    const waitTime = Math.ceil((COOLDOWN_MS - (now - lastSearch)) / 1000);
    await interaction.reply({
      content: `⏳ Please wait ${waitTime}s before searching again.`,
      ephemeral: true,
    });
    return;
  }

  userCooldowns.set(userId, now);
  const query = interaction.options.getString("query");
  const t0 = Date.now();

  await interaction.deferReply();

  try {
    recordSearch(query, "search");
    const t1 = Date.now();
    const parsed = await parseQuery(query);
    const parseMs = Date.now() - t1;

    const t2 = Date.now();
    const results = await search(parsed);
    const searchMs = Date.now() - t2;
    const totalMs = Date.now() - t0;

    if (results.length === 0) {
      await interaction.editReply({
        content: `**No results found** for \`${query}\`
Try a different search term or check if Prowlarr has relevant indexers configured.
\`⏱ Claude: ${parseMs}ms | Prowlarr: ${searchMs}ms | Total: ${totalMs}ms\``,
      });
      return;
    }

    const embed = buildResultsEmbed(query, parsed, results, { parseMs, searchMs, totalMs });
    const magnets = buildMagnetMessage(results);

    const clearButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("clear_messages")
        .setLabel("🗑️ Clear")
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.editReply({
      content: magnets,
      embeds: embed.embeds,
      components: [clearButton],
    });
  } catch (err) {
    console.error("Search error:", err);
    if (err.message?.includes("rate limit") || err.message?.includes("Rate limit")) {
      await interaction.editReply({ content: "Claude is currently rate limited. Please try again in a moment." });
      return;
    }
    await interaction.editReply({ content: `Search failed: ${err.message}` });
  }
}

module.exports = { data, execute };
