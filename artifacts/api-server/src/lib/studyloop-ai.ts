import { logger } from "./logger";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export async function askStudyLoopAI(system: string, prompt: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      logger.warn({ status: response.status }, "StudyLoop AI request was not successful");
      return null;
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    return payload.choices?.[0]?.message?.content ?? null;
  } catch (error) {
    logger.warn({ err: error }, "StudyLoop AI request failed");
    return null;
  }
}

export function parseAIJson<T>(content: string | null): T | null {
  if (!content) return null;
  try {
    return JSON.parse(content) as T;
  } catch (error) {
    logger.warn({ err: error }, "StudyLoop AI returned invalid JSON");
    return null;
  }
}