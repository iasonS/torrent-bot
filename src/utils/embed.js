const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

function formatSize(bytes) {
  if (!bytes) return "?";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(1)} ${units[i]}`;
}

function buildResultsEmbed(query, parsed, results) {
  if (results.length === 0) {
    return {
      embeds: [
        new EmbedBuilder()
          .setTitle(`No results for: ${parsed.title}`)
          .setDescription("Try a broader search or different keywords.")
          .setColor(0xff4444),
      ],
      components: [],
    };
  }

  const lines = results.map((r, i) => {
    const size = formatSize(r.size);
    const seeders = r.seeders || 0;
    const leechers = r.leechers || 0;
    const indexer = r.indexer || "unknown";
    return `**${i + 1}.** ${r.title}\n\`${size}\` · \`${seeders}S/${leechers}L\` · ${indexer}`;
  });

  const embed = new EmbedBuilder()
    .setTitle(`🔍 ${parsed.title}${parsed.quality ? ` [${parsed.quality}]` : ""}`)
    .setDescription(lines.join("\n\n"))
    .setColor(0x00cc88)
    .setFooter({ text: `Query: "${query}" · ${results.length} results` })
    .setTimestamp();

  return { embeds: [embed], components: [] };
}

function buildMagnetMessage(results) {
  // Send magnet links as a follow-up (too long for embed usually)
  const lines = results.map((r, i) => {
    const link = r.magnetUrl || r.downloadUrl;
    // Discord truncates very long messages, so just send the magnet
    return `**${i + 1}.** [${truncate(r.title, 60)}](${link})`;
  });

  // If any magnet URLs are too long for markdown links, fall back to plain text
  const hasLongMagnets = results.some(
    (r) => (r.magnetUrl || "").length > 1800
  );

  if (hasLongMagnets) {
    // Send magnets as plain text (clickable in Discord desktop)
    const plain = results.map((r, i) => {
      const link = r.magnetUrl || r.downloadUrl;
      return `**${i + 1}.** ${truncate(r.title, 60)}\n${link}`;
    });
    return plain.join("\n\n");
  }

  return lines.join("\n");
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

module.exports = { buildResultsEmbed, buildMagnetMessage };
