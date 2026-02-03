import type { Script, Sentence } from "@/types";

const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_KEY;
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o-mini";
const apiVersion = "2024-08-01-preview";

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

interface GenerateOptions {
  theme: string;
  searchContext?: string;
  sentenceCount?: number;
  excludeTopics?: string[];
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Retry on server errors (5xx) or rate limiting (429)
      if (response.status >= 500 || response.status === 429) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt); // Exponential backoff
        console.warn(
          `API error ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`
        );
        await sleep(delay);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(
        `Network error, retrying in ${RETRY_DELAY_MS}ms (attempt ${attempt + 1}/${retries}):`,
        lastError.message
      );
      await sleep(RETRY_DELAY_MS * Math.pow(2, attempt));
    }
  }

  throw lastError || new Error("Max retries exceeded");
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

  // Retry the entire generation process if JSON parsing fails
  for (let parseAttempt = 0; parseAttempt < 2; parseAttempt++) {
    const response = await fetchWithRetry(url, {
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
      // Try to extract JSON from the content (sometimes wrapped in markdown)
      let jsonContent = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonContent = jsonMatch[1];
      }

      const parsed = JSON.parse(jsonContent);

      // Validate the parsed content
      if (!parsed.sentences || !Array.isArray(parsed.sentences) || parsed.sentences.length === 0) {
        console.warn("Invalid response structure, retrying...");
        continue;
      }

      // Validate each sentence
      const validSentences = parsed.sentences.filter(
        (s: Sentence) => s && typeof s.text === "string" && s.text.length > 0
      );

      if (validSentences.length === 0) {
        console.warn("No valid sentences in response, retrying...");
        continue;
      }

      return {
        theme,
        sentences: validSentences as Sentence[],
      };
    } catch (parseError) {
      console.warn(
        `JSON parsing failed (attempt ${parseAttempt + 1}/2):`,
        parseError instanceof Error ? parseError.message : parseError
      );
      // Continue to retry
    }
  }

  // All retries failed
  throw new Error("Failed to generate valid sentences after multiple attempts");
}
