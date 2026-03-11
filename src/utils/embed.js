const { EmbedBuilder } = require("discord.js");

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

function buildResultsEmbed(query, parsed, results, timing) {
  if (results.length === 0) {
    return {
      embeds: [
        new EmbedBuilder()
          .setTitle(`No results for: ${parsed.title}`)
          .setDescription("Try a broader search or different keywords.")
          .setColor(0xff4444),
      ],
    };
  }

  const lines = results.map((r, i) => {
    const size = formatSize(r.size);
    const seeders = r.seeders || 0;
    const leechers = r.leechers || 0;
    const indexer = r.indexer || "unknown";
    return `**${i + 1}.** ${r.title}\n\`${size}\` · \`${seeders}S/${leechers}L\` · ${indexer}`;
  });

  const footerParts = [`Query: "${query}" · ${results.length} results`];
  if (timing) {
    const parts = [`⏱ Parse: ${timing.parseMs}ms`];
    if (timing.titlerMs != null) parts.push(`Title: ${timing.titlerMs}ms`);
    if (timing.tmdbMs != null) parts.push(`TMDb: ${timing.tmdbMs}ms`);
    parts.push(`Prowlarr: ${timing.searchMs}ms`);
    if (timing.filterMs != null) parts.push(`Filter: ${timing.filterMs}ms`);
    parts.push(`Total: ${timing.totalMs}ms`);
    footerParts.push(parts.join(" | "));
  }

  const embed = new EmbedBuilder()
    .setTitle(`🔍 ${parsed.title}${parsed.quality ? ` [${parsed.quality}]` : ""}`)
    .setDescription(lines.join("\n\n"))
    .setColor(0x00cc88)
    .setFooter({ text: footerParts.join(" | ") })
    .setTimestamp();

  return { embeds: [embed] };
}

function buildMagnetMessage(results) {
  const hasLongMagnets = results.some((r) => (r.magnetUrl || "").length > 1800);

  if (hasLongMagnets) {
    const plain = results.map((r, i) => {
      const link = r.magnetUrl || r.downloadUrl;
      return `**${i + 1}.** ${truncate(r.title, 60)}\n${link}`;
    });
    return plain.join("\n\n");
  }

  const lines = results.map((r, i) => {
    const link = r.magnetUrl || r.downloadUrl;
    return `**${i + 1}.** [${truncate(r.title, 60)}](${link})`;
  });
  return lines.join("\n");
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

function splitMessage(text, maxLen) {
  if (text.length <= maxLen) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) { chunks.push(remaining); break; }
    let split = remaining.lastIndexOf("\n\n", maxLen);
    if (split === -1) split = remaining.lastIndexOf("\n", maxLen);
    if (split === -1) split = maxLen;
    chunks.push(remaining.slice(0, split));
    remaining = remaining.slice(split).trimStart();
  }
  return chunks;
}

module.exports = { buildResultsEmbed, buildMagnetMessage, splitMessage };
