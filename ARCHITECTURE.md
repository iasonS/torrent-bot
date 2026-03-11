# Architecture

## Data Flow

```
User types: /search breaking bad s03e05 1080p english subs
                          |
                    index.js (Discord client)
                          |
                    commands/search.js
                    - defer reply (show loading)
                    - call parseQuery()
                          |
                    services/parser.js
                    - sends to Claude Haiku
                    - returns structured JSON:
                      {
                        title: "breaking bad",
                        quality: "1080p",
                        type: "tv",
                        season: 3,
                        episode: 5,
                        subtitles: "english"
                      }
                          |
                    services/prowlarr.js
                    - builds query string: "breaking bad s03e05 1080p"
                    - maps type "tv" → category 5000
                    - GET /api/v1/search?query=...&categories[]=5000
                    - filters: seeders > 0, has magnet/download URL
                    - filters by subtitle language in title
                    - sorts by seeders desc
                    - returns top 10
                          |
                    utils/embed.js
                    - buildResultsEmbed() → Discord EmbedBuilder
                    - buildMagnetMessage() → chunked magnet links
                          |
                    Discord: embed reply + follow-up magnet messages
```

## Components

### src/index.js
- Initialises Discord client (Guilds intent only)
- Registers slash commands (guild-specific if DISCORD_CHANNEL_ID set, else global)
- Routes interactions to command handlers
- Validates channel restriction if DISCORD_CHANNEL_ID is set

### src/commands/search.js
- Handles the `/search` slash command end-to-end
- Defers reply immediately (Discord requires response within 3s)
- Chains: parseQuery → search → format → reply
- Error handling: user-friendly messages on failure

### src/services/parser.js
- Claude Haiku (`claude-haiku-4-5-20251001`), max_tokens: 256
- System prompt instructs it to extract: title, quality, language, subtitles, type, season, episode
- Quality normalisation: "4k" → "2160p", "8k" → "4320p"
- Returns `{ title: rawQuery }` as fallback on parse failure

### src/services/prowlarr.js
- HTTP client for Prowlarr API (`GET /api/v1/search`)
- Auth via `X-Api-Key` header
- Category mapping:
  - movie → 2000
  - tv → 5000
  - game / software → 4000
  - music → 3000
- Post-processing: filter zero-seeder results, sort by seeders, cap at 10

### src/utils/embed.js
- `formatSize(bytes)` — bytes to human-readable string
- `buildResultsEmbed(query, parsed, results)` — Discord EmbedBuilder with result list
- `buildMagnetMessage(results)` — plain text magnet links, chunked to 1900 chars
- `splitMessage(text, maxLen)` — splits by newline to respect Discord 2000 char limit
- `truncate(str, max)` — ellipsis truncation

## External Dependencies

| Service | Role | Connection |
|---|---|---|
| Discord API | Bot platform, slash commands | discord.js via bot token |
| Prowlarr | Torrent indexer aggregation | HTTP REST at PROWLARR_URL |
| Anthropic Claude Haiku | NLP query parsing | @anthropic-ai/sdk |

## Deployment

Runs as a Docker container on the home server (192.168.1.9).
Managed by `/home/tt/is-infra/projects/self-hosted/docker-compose.yml`.
Connected to the `self-hosted` Docker network — reaches Prowlarr at `prowlarr:9696`.

No database. Fully stateless.
