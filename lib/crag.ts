import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { CHAT_MODEL } from "@/lib/rag";

export type GradedChunk = {
  index: number;
  pageNumber: number | null;
  content: string;
  relevant: boolean;
};

export type WebResult = {
  title: string;
  url: string;
  content: string;
};

export type CragAction = "CORRECT" | "AMBIGUOUS" | "INCORRECT";

type RawChunk = {
  index: number;
  pageNumber: number | null;
  content: string;
};

function getGrader() {
  return new ChatGoogleGenerativeAI({
    model: CHAT_MODEL,
    temperature: 0,
    apiKey: process.env.GOOGLE_API_KEY,
  });
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1);
  }
  return text.trim();
}

export async function gradeDocuments(
  question: string,
  chunks: RawChunk[],
): Promise<GradedChunk[]> {
  if (chunks.length === 0) return [];

  const llm = getGrader();
  const prompt = `You are a strict relevance grader. For each numbered document, decide whether it contains information that helps answer the question. Output ONLY JSON of the form: {"grades":[{"index":1,"relevant":true},...]}.

Question: ${question}

Documents:
${chunks
  .map((c) => `--- Document ${c.index} ---\n${c.content}`)
  .join("\n\n")}`;

  const res = await llm.invoke([{ role: "user", content: prompt }]);
  const raw = typeof res.content === "string" ? res.content : JSON.stringify(res.content);

  let parsed: { grades?: { index: number; relevant: boolean }[] } = {};
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch {
    return chunks.map((c) => ({ ...c, relevant: true }));
  }

  const lookup = new Map<number, boolean>();
  for (const g of parsed.grades ?? []) lookup.set(g.index, Boolean(g.relevant));

  return chunks.map((c) => ({ ...c, relevant: lookup.get(c.index) ?? false }));
}

export function decideAction(graded: GradedChunk[]): CragAction {
  if (graded.length === 0) return "INCORRECT";
  const relevantCount = graded.filter((g) => g.relevant).length;
  if (relevantCount === graded.length) return "CORRECT";
  if (relevantCount === 0) return "INCORRECT";
  return "AMBIGUOUS";
}

export async function rewriteQueryForWeb(question: string): Promise<string> {
  const llm = getGrader();
  const prompt = `Rewrite the following user question into a concise web search query (max 15 words). Strip conversational filler, keep entities and qualifiers. Reply with ONLY the query text, no quotes.

Question: ${question}`;
  const res = await llm.invoke([{ role: "user", content: prompt }]);
  const text =
    typeof res.content === "string" ? res.content : JSON.stringify(res.content);
  return text.trim().replace(/^["']|["']$/g, "") || question;
}

export async function webSearch(query: string, maxResults = 4): Promise<WebResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: maxResults,
      search_depth: "basic",
      include_answer: false,
    }),
  });

  if (!res.ok) {
    console.error("[crag] tavily error", res.status, await res.text());
    return [];
  }

  const data = (await res.json()) as {
    results?: { title?: string; url?: string; content?: string }[];
  };

  return (data.results ?? []).map((r) => ({
    title: r.title ?? "",
    url: r.url ?? "",
    content: r.content ?? "",
  }));
}
