import { NextRequest, NextResponse } from "next/server";
import { QdrantVectorStore } from "@langchain/qdrant";
import {
  chunkDocs,
  getEmbeddings,
  getQdrantConfig,
  loadDocument,
  newCollectionId,
} from "@/lib/rag";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const docs = await loadDocument(file);
    if (docs.length === 0 || docs.every((d) => !d.pageContent.trim())) {
      return NextResponse.json(
        { error: "Document appears to be empty" },
        { status: 400 },
      );
    }

    const chunks = await chunkDocs(docs);
    const docId = newCollectionId();

    await QdrantVectorStore.fromDocuments(chunks, getEmbeddings(), {
      ...getQdrantConfig(),
      collectionName: docId,
    });

    return NextResponse.json({
      docId,
      filename: file.name,
      chunkCount: chunks.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("[upload]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
