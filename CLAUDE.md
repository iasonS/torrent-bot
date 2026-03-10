# CLAUDE.md — torrent-bot

## Overview

Discord bot that searches torrent indexers via Prowlarr and posts results with magnet links. Uses Claude Haiku to parse natural language queries into structured search parameters.

**Repo**: `iasonS/torrent-bot` (public)
**Owner**: iasonS <sklavenitisi6@gmail.com>

## Architecture

```
Discord /search → parser.js (Claude Haiku) → prowlarr.js (Prowlarr API) → embed.js → Discord
```

## Project Structure

```
torrent-bot/
├── CLAUDE.md
├── Dockerfile
├── package.json
├── .env.example
├── .gitignore
└── src/
    ├── index.js              # Discord client, command registration
    ├── commands/
    │   └── search.js         # /search slash command handler
    ├── services/
    │   ├── parser.js         # Claude Haiku: natural language → JSON
    │   └── prowlarr.js       # Prowlarr API client
    └── utils/
        └── embed.js          # Discord embed + magnet link formatting
```

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DISCORD_BOT_TOKEN` | Yes | Discord bot authentication |
| `DISCORD_CHANNEL_ID` | No | Restrict bot to specific channel |
| `PROWLARR_URL` | Yes | Prowlarr instance (default: http://prowlarr:9696) |
| `PROWLARR_API_KEY` | Yes | Prowlarr API key |
| `ANTHROPIC_API_KEY` | Yes | Claude Haiku for query parsing |

## Development

```bash
npm install
cp .env.example .env  # Fill in values
npm run dev           # Runs with --watch
```

## Deployment

Deployed as Docker container in is-infra's docker-compose.yml. Connects to Prowlarr via `self-hosted` Docker network.

## Bot Commands

- `/search <query>` — Search torrents with natural language
  - Examples: "terminator 2 4k", "breaking bad s03e05 1080p", "ubuntu 24.04 iso"

## Git Rules

- **Author**: `iasonS <sklavenitisi6@gmail.com>`
- **Branch**: Feature branches + PRs, never push to main directly
