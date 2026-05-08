import { NextRequest, NextResponse } from "next/server";
import { QdrantVectorStore } from "@langchain/qdrant";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { CHAT_MODEL, getEmbeddings, getQdrantConfig } from "@/lib/rag";

export const runtime = "nodejs";
export const maxDuration = 60;

type RetrievedChunk = {
  index: number;
  pageNumber: number | null;
  content: string;
};

export async function POST(req: NextRequest) {
  try {
    const { docId, question } = (await req.json()) as {
      docId?: string;
      question?: string;
    };

    if (!docId || !question?.trim()) {
      return NextResponse.json(
        { error: "docId and question are required" },
        { status: 400 },
      );
    }

    const store = await QdrantVectorStore.fromExistingCollection(
      getEmbeddings(),
      { ...getQdrantConfig(), collectionName: docId },
    );

    const retriever = store.asRetriever({ k: 4 });
    const docs = await retriever.invoke(question);

    const context: RetrievedChunk[] = docs.map((d, i) => ({
      index: i + 1,
      pageNumber:
        (d.metadata?.loc as { pageNumber?: number } | undefined)?.pageNumber ??
        (d.metadata?.page as number | undefined) ??
        null,
      content: d.pageContent,
    }));

    const systemPrompt = `You are an AI assistant that answers user questions based STRICTLY on the provided context from a single document.

Rules:
- Answer ONLY using the provided context. Do NOT use outside knowledge.
- If the answer is not in the context, reply: "I couldn't find this in the document."
- When you use information from a chunk that has a pageNumber, cite it like "(page 3)".
- Be concise and direct.

Context (JSON array of chunks):
${JSON.stringify(context, null, 2)}`;

    const llm = new ChatGoogleGenerativeAI({
      model: CHAT_MODEL,
      temperature: 0,
      apiKey: process.env.GOOGLE_API_KEY,
    });

    const response = await llm.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: question },
    ]);

    const answer =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    return NextResponse.json({
      answer,
      sources: context.map((c) => ({
        pageNumber: c.pageNumber,
        snippet: c.content.slice(0, 240),
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Chat failed";
    console.error("[chat]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
