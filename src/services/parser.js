const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic();

const SYSTEM_PROMPT = `You parse natural language torrent search queries into structured JSON.

Extract these fields from the user's query:
- title: the movie/show/game name (required)
- quality: resolution like 2160p, 1080p, 720p, etc. Map "4k" to "2160p", "2k" to "1440p", "8k" to "4320p", "8k" to "4320p"
- language: audio language if specified
- subtitles: subtitle language if specified
- type: "movie", "tv", "game", "music", "software", or null
- season: season number if TV show (integer)
- episode: episode number if TV show (integer)

Return ONLY valid JSON, no markdown, no explanation.

Examples:
"terminator 2 4k german subtitles" → {"title":"Terminator 2","quality":"2160p","subtitles":"german"}
"breaking bad s03e05 1080p" → {"title":"Breaking Bad","quality":"1080p","type":"tv","season":3,"episode":5}
"ubuntu 24.04 iso" → {"title":"Ubuntu 24.04","type":"software"}
"dark s02 german" → {"title":"Dark","type":"tv","season":2,"language":"german"}
"daft punk random access memories flac" → {"title":"Daft Punk Random Access Memories","type":"music","quality":"flac"}
"the office us complete series 1080p" → {"title":"The Office US","quality":"1080p","type":"tv"}`;

async function parseQuery(query) {
  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: query }],
    });

    const text = message.content[0].text.trim();
    return JSON.parse(text);
  } catch (err) {
    // Rate limit / quota exceeded
    if (err?.status === 429 || err?.message?.toLowerCase().includes("rate limit") || err?.message?.toLowerCase().includes("overloaded")) {
      throw new Error("Claude is currently rate limited. Please try again in a moment.");
    }
    console.error("Parser error:", err.message);
    // Fallback: use the raw query as-is
    return { title: query };
  }
}

module.exports = { parseQuery };
