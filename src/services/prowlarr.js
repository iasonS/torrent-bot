const PROWLARR_URL = process.env.PROWLARR_URL || "http://prowlarr:9696";
const PROWLARR_API_KEY = process.env.PROWLARR_API_KEY;

async function search(parsed) {
  // Build search query from parsed fields
  let query = parsed.title;
  if (parsed.quality) query += ` ${parsed.quality}`;
  if (parsed.language) query += ` ${parsed.language}`;
  if (parsed.season != null)
    query += ` S${String(parsed.season).padStart(2, "0")}`;
  if (parsed.episode != null)
    query += `E${String(parsed.episode).padStart(2, "0")}`;

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

  const url = `${PROWLARR_URL}/api/v1/search?${params}`;

  const res = await fetch(url, {
    headers: { "X-Api-Key": PROWLARR_API_KEY },
  });

  if (!res.ok) {
    throw new Error(`Prowlarr API error: ${res.status} ${res.statusText}`);
  }

  const results = await res.json();

  // Filter: must have seeders and either magnet or download link
  const valid = results.filter(
    (r) => r.seeders > 0 && (r.magnetUrl || r.downloadUrl)
  );

  // Sort by seeders descending
  valid.sort((a, b) => b.seeders - a.seeders);

  // Filter by subtitle language if requested (check title string)
  let filtered = valid;
  if (parsed.subtitles) {
    const sub = parsed.subtitles.toLowerCase();
    const withSubs = valid.filter((r) => r.title.toLowerCase().includes(sub));
    if (withSubs.length > 0) filtered = withSubs;
    // If no subtitle matches, return all results anyway
  }

  return filtered.slice(0, 10);
}

module.exports = { search };
