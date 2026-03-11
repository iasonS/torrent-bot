const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic();

const SYSTEM_PROMPT = `You extract a clean movie title from a user's search query so it can be looked up on TMDb.

STRICT RULES — follow exactly:
1. Return ONLY the movie title. Nothing else. No JSON, no explanation, no punctuation at the end.
2. Remove ALL of the following — they are never part of a movie title:
   - Quality/resolution: 4k, 2k, 8k, 1080p, 720p, 480p, 2160p, uhd, hd, hdr, sdr, bluray, blu-ray, bdrip, brrip, webrip, web-dl, dvdrip, hdtv, remux
   - Codecs: x264, x265, hevc, avc, h264, h265, xvid, divx, av1
   - Audio: dts, atmos, dolby, truehd, aac, ac3, mp3, flac
   - Languages: english, german, french, spanish, italian, portuguese, dutch, russian, japanese, korean, chinese, hindi, arabic, greek, turkish, eng, ger, fre, spa
   - Subtitle keywords: subtitles, subs, sub, dubbed, dub
   - Release type: extended, theatrical, directors cut, unrated, remastered, criterion, imax
   - File/format hints: iso, mkv, mp4, avi, torrent
   - Year numbers (4 digits like 2024)
3. Preserve: articles (the, a, an), numbers that are part of the title (e.g. "2" in "Terminator 2"), colons, proper nouns
4. Fix obvious typos if confident (e.g. "terminater" → "Terminator")
5. Capitalise correctly
6. If the query contains no recognisable movie title, return the full cleaned query as-is

Examples:
"iron lung 2k eng subtitles" → "Iron Lung"
"terminator 2 4k german" → "Terminator 2"
"the dark knight 1080p bluray x265" → "The Dark Knight"
"inception 2010 hdrip" → "Inception"
"breakng bad s03" → "Breaking Bad"
"dune part two 2160p uhd remux atmos" → "Dune Part Two"
"avatar the way of water 4k hdr dolby vision" → "Avatar The Way of Water"
"top gun maverick web-dl eng subs 1080p" → "Top Gun Maverick"`;

async function extractTitleForTmdb(query) {
  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 64,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: query }],
    });
    return message.content[0].text.trim();
  } catch (err) {
    console.error("Title extractor error:", err.message);
    // Fallback: return the query with common quality terms stripped
    return query
      .replace(/\b(4k|2k|8k|1080p|720p|480p|2160p|uhd|hd|hdr|bluray|bdrip|webrip|web-dl|dvdrip|x264|x265|hevc|eng|ger|fre|spa|subtitles?|subs?|dubbed?)\b/gi, "")
      .replace(/\b\d{4}\b/, "")
      .replace(/\s+/g, " ")
      .trim();
  }
}

module.exports = { extractTitleForTmdb };
