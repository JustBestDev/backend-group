import OpenAI from "openai";

const MODEL = "gpt-5.6-luna";
let client;

function getClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

export async function generateZodiacExplanation(match, openai = getClient()) {
  if (!openai) return null;

  try {
    const response = await openai.responses.create(
      {
        model: MODEL,
        instructions:
          "Explain why this zodiac mix may work for roommates. Treat astrology as light entertainment, not science. Be friendly, practical, concise, and do not change or recalculate the supplied score. Return 2-4 short reasons.",
        input: JSON.stringify({
          userZodiac: match.userZodiac,
          memberZodiacs: match.memberZodiacs,
          compatibilityScore: match.compatibilityScore,
          deterministicReasons: match.compatibilityReasons,
        }),
        reasoning: { effort: "none" },
        max_output_tokens: 250,
        store: false,
        text: {
          verbosity: "low",
          format: {
            type: "json_schema",
            name: "zodiac_roommate_explanation",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                summary: { type: "string" },
                reasons: {
                  type: "array",
                  minItems: 2,
                  maxItems: 4,
                  items: { type: "string" },
                },
              },
              required: ["summary", "reasons"],
            },
          },
        },
      },
      { timeout: 4_000, maxRetries: 0 },
    );

    const explanation = JSON.parse(response.output_text);
    if (
      typeof explanation.summary !== "string" ||
      !explanation.summary.trim() ||
      !Array.isArray(explanation.reasons) ||
      explanation.reasons.length < 2 ||
      explanation.reasons.length > 4 ||
      explanation.reasons.some(
        (reason) => typeof reason !== "string" || !reason.trim(),
      )
    ) {
      return null;
    }

    return {
      summary: explanation.summary.trim(),
      reasons: explanation.reasons.map((reason) => reason.trim()),
    };
  } catch {
    return null;
  }
}
