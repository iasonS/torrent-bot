const express = require("express");
const { getStats, resetStats } = require("./stats");

const app = express();
const PORT = 8083;

app.use(express.json());

// Stats API endpoint
app.get("/api/stats", (req, res) => {
  res.json(getStats());
});

// Reset stats endpoint
app.post("/api/stats/reset", (req, res) => {
  resetStats();
  res.json({ message: "Stats reset", stats: getStats() });
});

// Dashboard HTML
app.get("/", (req, res) => {
  const stats = getStats();
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Torrent Bot Stats</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      padding: 2rem;
      min-height: 100vh;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      margin-bottom: 2rem;
      font-size: 2.5rem;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 0.5rem;
      padding: 1.5rem;
      transition: all 0.3s ease;
    }
    .stat-card:hover {
      border-color: #64748b;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
    }
    .stat-label {
      font-size: 0.875rem;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }
    .stat-value {
      font-size: 2rem;
      font-weight: bold;
      color: #3b82f6;
    }
    .recent-section {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 0.5rem;
      padding: 1.5rem;
    }
    .recent-section h2 {
      font-size: 1.25rem;
      margin-bottom: 1rem;
    }
    .recent-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-height: 400px;
      overflow-y: auto;
    }
    .recent-item {
      background: #0f172a;
      border-left: 3px solid #3b82f6;
      padding: 0.75rem;
      border-radius: 0.25rem;
      font-size: 0.875rem;
    }
    .recent-item .query {
      color: #e2e8f0;
      word-break: break-all;
      margin-bottom: 0.25rem;
    }
    .recent-item .meta {
      color: #64748b;
      font-size: 0.75rem;
    }
    .recent-item.movie {
      border-left-color: #10b981;
    }
    .recent-item.ascii {
      border-left-color: #f59e0b;
    }
    .recent-item.search {
      border-left-color: #3b82f6;
    }
    .button {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.375rem;
      cursor: pointer;
      font-size: 0.875rem;
      transition: background 0.2s;
      margin-top: 1rem;
    }
    .button:hover {
      background: #2563eb;
    }
    .empty {
      color: #64748b;
      text-align: center;
      padding: 2rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🤖 Torrent Bot Stats</h1>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total Searches</div>
        <div class="stat-value">${stats.searches}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Movie Searches</div>
        <div class="stat-value">${stats.movies}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">ASCII Conversions</div>
        <div class="stat-value">${stats.ascii}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Errors</div>
        <div class="stat-value" style="color: ${stats.errors > 0 ? '#ef4444' : '#10b981'}">${stats.errors}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Uptime</div>
        <div class="stat-value" style="font-size: 1.25rem;">${stats.uptime}</div>
      </div>
    </div>

    <div class="recent-section">
      <h2>Recent Activity</h2>
      <div class="recent-list">
        ${
          stats.recentSearches.length > 0
            ? stats.recentSearches
                .map((item) => {
                  const time = new Date(item.timestamp).toLocaleTimeString();
                  return `
                <div class="recent-item ${item.type}">
                  <div class="query">${escapeHtml(item.query)}</div>
                  <div class="meta">${item.type.toUpperCase()} • ${time}</div>
                </div>
              `;
                })
                .join("")
            : '<div class="empty">No recent activity</div>'
        }
      </div>
      <button class="button" onclick="resetStats()">Reset Stats</button>
    </div>
  </div>

  <script>
    function resetStats() {
      if (confirm("Reset all stats? This cannot be undone.")) {
        fetch("/api/stats/reset", { method: "POST" })
          .then(() => location.reload())
          .catch((err) => alert("Error resetting stats: " + err));
      }
    }

    function escapeHtml(text) {
      const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      };
      return text.replace(/[&<>"']/g, (m) => map[m]);
    }

    // Auto-refresh every 10 seconds
    setInterval(() => location.reload(), 10000);
  </script>
</body>
</html>
  `;
  res.send(html);
});

module.exports = { app, PORT };
