import type { Script, Sentence } from "@/types";

const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_KEY;
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o-mini";
const apiVersion = "2024-08-01-preview";

export async function generateScript(
  theme: string,
  searchContext?: string
): Promise<Script> {
  const contextSection = searchContext
    ? `\n\nUse the following recent information to create relevant, up-to-date sentences:\n${searchContext}\n`
    : "";

  const prompt = `Generate 5 natural English sentences for shadowing practice on the theme: "${theme}".${contextSection}

Requirements:
- Each sentence should be 10-20 words
- Use natural, everyday English expressions
- Include a mix of statements, questions, and responses
- Make them progressively slightly more complex

Return the response as a JSON object with this structure:
{
  "sentences": [
    { "id": 1, "text": "English sentence here", "translation": "Japanese translation" },
    ...
  ]
}

Only return valid JSON, no markdown or explanation.`;

  const url = `${endpoint}openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey!,
    },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content:
            "You are an English teacher creating shadowing practice materials. Always respond with valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    throw new Error(`Azure OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";

  try {
    const parsed = JSON.parse(content);
    return {
      theme,
      sentences: parsed.sentences as Sentence[],
    };
  } catch {
    // Fallback if JSON parsing fails
    return {
      theme,
      sentences: [
        {
          id: 1,
          text: "Could not generate sentences. Please try again.",
          translation: "文章を生成できませんでした。もう一度お試しください。",
        },
      ],
    };
  }
}
