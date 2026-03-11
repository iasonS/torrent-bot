const TMDB_TOKEN = process.env.TMDB_TOKEN;
const BASE = "https://api.themoviedb.org/3";

async function searchTmdb(title) {
  const res = await fetch(
    `${BASE}/search/movie?query=${encodeURIComponent(title)}&include_adult=false&language=en-US&page=1`,
    { headers: { Authorization: `Bearer ${TMDB_TOKEN}`, "Content-Type": "application/json" } }
  );
  if (!res.ok) throw new Error(`TMDb API error: ${res.status}`);
  const data = await res.json();
  return data.results || [];
}

async function lookupMovie(title) {
  // Try the full title first
  let results = await searchTmdb(title);

  // If no results, progressively strip the last word and retry (handles "Iron Lung 2k" → "Iron Lung")
  if (results.length === 0) {
    const words = title.trim().split(/\s+/);
    while (words.length > 1 && results.length === 0) {
      words.pop();
      results = await searchTmdb(words.join(" "));
    }
  }

  if (results.length === 0) return null;

  const movie = results[0];
  return {
    id: movie.id,
    title: movie.title,
    originalTitle: movie.original_title,
    year: movie.release_date ? parseInt(movie.release_date.slice(0, 4)) : null,
    releaseDate: movie.release_date || null,
    overview: movie.overview,
  };
}

function isReleased(movie) {
  if (!movie.releaseDate) return false;
  return new Date(movie.releaseDate) <= new Date();
}

function formatReleaseDate(dateStr) {
  if (!dateStr) return "unknown release date";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

module.exports = { lookupMovie, isReleased, formatReleaseDate };
