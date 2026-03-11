const PROWLARR_URL = process.env.PROWLARR_URL || "http://prowlarr:9696";
const PROWLARR_API_KEY = process.env.PROWLARR_API_KEY;

// Known bad quality tags to filter out unless user explicitly requests them
const BAD_QUALITY_TAGS = ["CAM", "CAMRIP", "TS", "TELESYNC", "SCR", "SCREENER", "HDCAM", "R5", "DVDSCR"];

function isBadQuality(title) {
  const upper = title.toUpperCase();
  return BAD_QUALITY_TAGS.some((tag) => {
    // Match as a whole word to avoid false positives
    const regex = new RegExp("(^|[\\s\\.\\-_\\[\\(])" + tag + "([\\s\\.\\-_\\]\\)]|$)");
    return regex.test(upper);
  });
}

function titleMatchesQuery(resultTitle, parsedTitle) {
  if (!parsedTitle) return true;
  const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
  const queryWords = normalize(parsedTitle).split(" ").filter((w) => w.length > 2);
  const resultNorm = normalize(resultTitle);
  // At least half the query words must appear in the result title
  const matchCount = queryWords.filter((w) => resultNorm.includes(w)).length;
  return matchCount >= Math.ceil(queryWords.length / 2);
}

async function search(parsed) {
  // Build search query from parsed fields
  let query = parsed.title;
  if (parsed.quality) query += " " + parsed.quality;
  if (parsed.language) query += " " + parsed.language;
  if (parsed.season != null)
    query += " S" + String(parsed.season).padStart(2, "0");
  if (parsed.episode != null)
    query += "E" + String(parsed.episode).padStart(2, "0");

  const params = new URLSearchParams({ query });

  // Map type to Prowlarr categories
  const categoryMap = {
    movie: [2000],
    tv: [5000],
    game: [4000],
    music: [3000],
    software: [4000],
  };
  if (parsed.type && categoryMap[parsed.type]) {
    for (const cat of categoryMap[parsed.type]) {
      params.append("categories", cat);
    }
  }

  const url = PROWLARR_URL + "/api/v1/search?" + params;

  const res = await fetch(url, {
    headers: { "X-Api-Key": PROWLARR_API_KEY },
  });

  if (!res.ok) {
    throw new Error("Prowlarr API error: " + res.status + " " + res.statusText);
  }

  const results = await res.json();

  // Filter: must have seeders and either magnet or download link
  let valid = results.filter(
    (r) => r.seeders > 0 && (r.magnetUrl || r.downloadUrl)
  );

  // Filter out bad quality releases (CAM, TS, SCR, etc.)
  const goodQuality = valid.filter((r) => !isBadQuality(r.title));
  if (goodQuality.length > 0) valid = goodQuality;
  // If filtering removes everything, fall back to unfiltered (user may want CAM)

  // Filter out results that don't match the queried title
  const titleMatched = valid.filter((r) => titleMatchesQuery(r.title, parsed.title));
  if (titleMatched.length > 0) valid = titleMatched;

  // Sort by seeders descending
  valid.sort((a, b) => b.seeders - a.seeders);

  // Filter by subtitle language if requested (check title string)
  let filtered = valid;
  if (parsed.subtitles) {
    const sub = parsed.subtitles.toLowerCase();
    const withSubs = valid.filter((r) => r.title.toLowerCase().includes(sub));
    if (withSubs.length > 0) filtered = withSubs;
  }

  return filtered.slice(0, 10);
}

module.exports = { search };
