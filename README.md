# torrent-bot

A Discord bot that searches torrents using natural language. Type what you want, get magnet links back.

## How it works

1. You run `/search terminator 2 4k`
2. Claude Haiku parses the query into structured parameters
3. Prowlarr searches across all configured indexers
4. Bot returns top 10 results sorted by seeders, with magnet links

## Commands

- `/search <query>` — Search for torrents using natural language

**Examples:**
- `/search terminator 2 4k`
- `/search breaking bad s03e05 1080p`
- `/search ubuntu 24.04 iso`
- `/search daft punk random access memories flac`

## Setup

### Prerequisites
- Node.js v20+
- Prowlarr instance with indexers configured
- Discord bot application
- Anthropic API key

### Installation

```bash
git clone https://github.com/iasonS/torrent-bot.git
cd torrent-bot
npm install
cp .env.example .env
```

Edit `.env` with your values, then:

```bash
npm run dev    # development (auto-reload)
npm start      # production
```

### Docker

```bash
docker build -t torrent-bot .
docker run --env-file .env torrent-bot
```

## Stack

- **discord.js** v14
- **@anthropic-ai/sdk** — Claude Haiku for NLP parsing
- **Prowlarr** — torrent indexer aggregation
