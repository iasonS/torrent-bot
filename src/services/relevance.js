const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic();

async function filterRelevant(query, parsed, results) {
  if (results.length === 0) return results;

  const resultList = results.map((r, i) => `${i + 1}. ${r.title}`).join("\n");

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system: "You are a torrent result filter. Given a search query and a list of results, return ONLY a JSON array of the result numbers that are genuinely relevant to the query. Be strict — exclude anything that is a different title or clearly unrelated. Return only the JSON array, nothing else. Example: [1,2,4,7]",
      messages: [{ role: "user", content: `Query: "${query}"\n\nResults:\n${resultList}` }],
    });

    const text = message.content[0].text.trim();
    const indices = JSON.parse(text);
    return indices
      .filter((i) => i >= 1 && i <= results.length)
      .map((i) => results[i - 1]);
  } catch (err) {
    console.error("Relevance filter error:", err.message);
    return results; // fallback: return all
  }
}

module.exports = { filterRelevant };
