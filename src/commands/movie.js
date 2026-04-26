const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { parseQuery } = require("../services/parser");
const { extractTitleForTmdb } = require("../services/titler");
const { lookupMovie, isReleased, formatReleaseDate } = require("../services/tmdb");
const { search } = require("../services/prowlarr");
const { filterRelevant } = require("../services/relevance");
const { buildResultsEmbed, buildMagnetMessage, splitMessage } = require("../utils/embed");
const { recordSearch, recordError } = require("../stats");

const TIMEOUT_MS = 25000;

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
  recordSearch(query, "movie");
  const t0 = Date.now();

  await interaction.deferReply();

  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Search timed out after ${TIMEOUT_MS / 1000}s. Use /cancel if the bot is stuck.`)), TIMEOUT_MS)
  );

  try {
    await Promise.race([runSearch(interaction, query, t0), timeout]);
  } catch (err) {
    console.error("Movie search error:", err);
    if (err.message?.includes("rate limit") || err.message?.includes("Rate limit")) {
      await interaction.editReply({ content: "Claude is currently rate limited. Please try again in a moment." });
      return;
    }
    await interaction.editReply({ content: `❌ ${err.message}` });
  }
}

async function runSearch(interaction, query, t0) {
  // Step 1: Parse query
  const t1 = Date.now();
  const parsed = await parseQuery(query);
  parsed.type = "movie";
  const parseMs = Date.now() - t1;

  // Step 2: Extract clean title for TMDb
  const t2 = Date.now();
  const cleanTitle = await extractTitleForTmdb(query);
  const titlerMs = Date.now() - t2;
  console.log(`Title extractor: "${query}" → "${cleanTitle}"`);

  // Step 3: TMDb lookup
  const t3 = Date.now();
  const movie = await lookupMovie(cleanTitle);
  const tmdbMs = Date.now() - t3;

  if (!movie) {
    await interaction.editReply({
      content: `**Movie not found:** \`${cleanTitle}\`\nCouldn't find this movie on TMDb. Check the title and try again.`,
    });
    return;
  }

  if (!isReleased(movie)) {
    const releaseStr = movie.releaseDate
      ? `releases **${formatReleaseDate(movie.releaseDate)}**`
      : "has no confirmed release date yet";
    await interaction.editReply({
      content: `🎬 **${movie.title} (${movie.year || "TBA"})** ${releaseStr} — not available yet.\n\n> ${movie.overview || ""}`,
    });
    return;
  }

  // Step 4: Search Prowlarr
  const canonicalParsed = { ...parsed, title: `${movie.title} ${movie.year}` };
  const t4 = Date.now();
  let results = await search(canonicalParsed);
  const searchMs = Date.now() - t4;

  // Step 5: Relevance filter
  const t5 = Date.now();
  results = await filterRelevant(`${movie.title} (${movie.year})`, canonicalParsed, results);
  const filterMs = Date.now() - t5;

  const totalMs = Date.now() - t0;

  if (results.length === 0) {
    await interaction.editReply({
      content: `**No torrents found** for **${movie.title} (${movie.year})**\nThe movie exists but no results were found. Try again later.\n\`⏱ Parse: ${parseMs}ms | Title: ${titlerMs}ms | TMDb: ${tmdbMs}ms | Prowlarr: ${searchMs}ms | Filter: ${filterMs}ms | Total: ${totalMs}ms\``,
    });
    return;
  }

  const embed = buildResultsEmbed(query, { ...parsed, title: movie.title, year: movie.year }, results, { parseMs, titlerMs, tmdbMs, searchMs, filterMs, totalMs });
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
}

module.exports = { data, execute };
