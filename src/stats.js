const fs = require("fs");
const path = require("path");

const STATS_FILE = path.join(__dirname, "../stats.json");

// Default stats structure
const defaultStats = {
  startTime: Date.now(),
  searches: 0,
  movies: 0,
  ascii: 0,
  errors: 0,
  recentSearches: [],
};

// Load stats from file or create new
function loadStats() {
  try {
    if (fs.existsSync(STATS_FILE)) {
      return JSON.parse(fs.readFileSync(STATS_FILE, "utf8"));
    }
  } catch (err) {
    console.error("Error loading stats:", err);
  }
  return { ...defaultStats };
}

// Save stats to file
function saveStats(stats) {
  try {
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
  } catch (err) {
    console.error("Error saving stats:", err);
  }
}

let stats = loadStats();

function recordSearch(query, type = "search") {
  stats.searches++;
  stats[type]++;
  stats.recentSearches.unshift({
    query: query.substring(0, 100),
    type,
    timestamp: new Date().toISOString(),
  });
  // Keep only last 50
  if (stats.recentSearches.length > 50) {
    stats.recentSearches.pop();
  }
  saveStats(stats);
}

function recordError(error) {
  stats.errors++;
  saveStats(stats);
}

function getStats() {
  const uptime = Date.now() - stats.startTime;
  return {
    ...stats,
    uptime: formatUptime(uptime),
    uptimeMs: uptime,
  };
}

function formatUptime(ms) {
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return `${days}d ${hours}h ${minutes}m`;
}

function resetStats() {
  stats = { ...defaultStats, startTime: Date.now() };
  saveStats(stats);
}

module.exports = { recordSearch, recordError, getStats, resetStats };
