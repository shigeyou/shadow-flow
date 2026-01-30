import type { Script, Sentence } from "@/types";

const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_KEY;
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o-mini";
const apiVersion = "2024-08-01-preview";

interface GenerateOptions {
  theme: string;
  searchContext?: string;
  sentenceCount?: number;
  excludeTopics?: string[];
}

export async function generateScript(
  theme: string,
  searchContext?: string,
  options?: { sentenceCount?: number; excludeTopics?: string[] }
): Promise<Script> {
  const hasSearchContext = !!searchContext;
  const sentenceCount = options?.sentenceCount ?? (hasSearchContext ? 3 : 5);
  const excludeTopics = options?.excludeTopics ?? [];

  const contextSection = searchContext
    ? `\n\n${searchContext}\n`
    : "";

  const excludeSection = excludeTopics.length > 0
    ? `\nIMPORTANT: Do NOT use any of these topics that were already covered:\n${excludeTopics.map(t => `- ${t}`).join('\n')}\n\nChoose DIFFERENT news stories from the ones listed above.\n`
    : "";

  const specificRequirements = hasSearchContext
    ? `CRITICAL REQUIREMENTS FOR NEWS-BASED CONTENT:
- You MUST include specific names, companies, products, or events from the news articles above
- You MUST mention actual facts, numbers, or dates from the articles
- Each sentence should teach the user about a REAL, CURRENT topic from the news
- Do NOT write generic sentences - every sentence must reference specific information from the articles
- Example: Instead of "AI is becoming more popular", write "OpenAI's GPT-5 was announced last week with impressive new capabilities"
${excludeSection}
`
    : "";

  const prompt = `Generate ${sentenceCount} natural English sentences for shadowing practice on the theme: "${theme}".${contextSection}

${specificRequirements}General Requirements:
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

  const systemMessage = hasSearchContext
    ? "You are an English teacher creating shadowing practice materials based on current news. Your sentences MUST include specific details (names, dates, facts) from the provided news articles. Generic sentences are NOT acceptable. Always respond with valid JSON only."
    : "You are an English teacher creating shadowing practice materials. Always respond with valid JSON only.";

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
          content: systemMessage,
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
