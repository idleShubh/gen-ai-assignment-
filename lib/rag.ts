import { Document } from "@langchain/core/documents";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { WebPDFLoader } from "@langchain/community/document_loaders/web/pdf";

export const EMBEDDING_MODEL = "gemini-embedding-001";
export const CHAT_MODEL = "gemini-2.5-flash";

export const CHUNK_SIZE = 1000;
export const CHUNK_OVERLAP = 200;

export function getEmbeddings() {
  return new GoogleGenerativeAIEmbeddings({
    model: EMBEDDING_MODEL,
    apiKey: process.env.GOOGLE_API_KEY,
  });
}

export function getQdrantConfig() {
  const url = process.env.QDRANT_URL;
  const apiKey = process.env.QDRANT_API_KEY;
  if (!url) throw new Error("QDRANT_URL is not set");
  return { url, apiKey };
}

export async function loadDocument(file: File): Promise<Document[]> {
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    const blob = new Blob([await file.arrayBuffer()], {
      type: "application/pdf",
    });
    const loader = new WebPDFLoader(blob, { splitPages: true });
    const docs = await loader.load();
    return docs.map(
      (d) =>
        new Document({
          pageContent: d.pageContent,
          metadata: { ...d.metadata, source: file.name },
        }),
    );
  }

  const text = await file.text();
  return [
    new Document({
      pageContent: text,
      metadata: { source: file.name },
    }),
  ];
}

export async function chunkDocs(docs: Document[]): Promise<Document[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
  });
  return splitter.splitDocuments(docs);
}

export function newCollectionId(): string {
  const rand = crypto.randomUUID().replace(/-/g, "");
  return `doc_${rand.slice(0, 24)}`;
}
