const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { parseQuery } = require("../services/parser");
const { search } = require("../services/prowlarr");
const { filterRelevant } = require("../services/relevance");
const { lookupMovie, isReleased, formatReleaseDate } = require("../services/tmdb");
const { buildResultsEmbed, buildMagnetMessage, splitMessage } = require("../utils/embed");

const data = new SlashCommandBuilder()
  .setName("movie")
  .setDescription("Search for a movie torrent")
  .addStringOption((opt) =>
    opt
      .setName("query")
      .setDescription('e.g. "terminator 2 4k english subtitles"')
      .setRequired(true)
  );

async function execute(interaction) {
  const query = interaction.options.getString("query");
  const t0 = Date.now();

  await interaction.deferReply();

  try {
    // Step 1: Parse query with Claude
    const t1 = Date.now();
    const parsed = await parseQuery(query);
    parsed.type = "movie";
    const parseMs = Date.now() - t1;

    // Step 2: TMDb lookup — validate movie exists and is released
    const t2 = Date.now();
    const movie = await lookupMovie(parsed.title);
    const tmdbMs = Date.now() - t2;

    if (!movie) {
      await interaction.editReply({
        content: `**Movie not found:** \`${parsed.title}\`\nCouldn't find this movie on TMDb. Check the title and try again.`,
      });
      return;
    }

    if (!isReleased(movie)) {
      const releaseStr = movie.releaseDate
        ? `releases **${formatReleaseDate(movie.releaseDate)}**`
        : "has no release date yet";
      await interaction.editReply({
        content: `**${movie.title} (${movie.year || "TBA"})** ${releaseStr} — not available yet.`,
      });
      return;
    }

    // Step 3: Search Prowlarr using canonical title + year
    const canonicalParsed = {
      ...parsed,
      title: `${movie.title} ${movie.year}`,
    };

    const t3 = Date.now();
    let results = await search(canonicalParsed);
    const searchMs = Date.now() - t3;

    // Step 4: Claude relevance filter
    const t4 = Date.now();
    results = await filterRelevant(`${movie.title} (${movie.year})`, canonicalParsed, results);
    const filterMs = Date.now() - t4;

    const totalMs = Date.now() - t0;

    if (results.length === 0) {
      await interaction.editReply({
        content: `**No torrents found** for **${movie.title} (${movie.year})**\nThe movie exists but no results were found. Try again later or check your indexers.\n\`⏱ Claude: ${parseMs}ms | TMDb: ${tmdbMs}ms | Prowlarr: ${searchMs}ms | Filter: ${filterMs}ms | Total: ${totalMs}ms\``,
      });
      return;
    }

    const embed = buildResultsEmbed(query, { ...parsed, title: movie.title, year: movie.year }, results, { parseMs, tmdbMs, searchMs, filterMs, totalMs });
    const magnets = buildMagnetMessage(results);
    const magnetChunks = splitMessage(magnets, 1900);

    const clearButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("clear_messages")
        .setLabel("🗑️ Clear")
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.editReply({
      content: magnetChunks[0],
      embeds: embed.embeds,
      components: [clearButton],
    });

    for (let i = 1; i < magnetChunks.length; i++) {
      await interaction.followUp({ content: magnetChunks[i] });
    }
  } catch (err) {
    console.error("Movie search error:", err);
    if (err.message?.includes("rate limit") || err.message?.includes("Rate limit")) {
      await interaction.editReply({ content: "Claude is currently rate limited. Please try again in a moment." });
      return;
    }
    await interaction.editReply({ content: `Search failed: ${err.message}` });
  }
}

module.exports = { data, execute };
