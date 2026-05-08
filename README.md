# NotebookLM RAG

A minimal NotebookLM clone: upload a PDF or text file, ask questions, get answers grounded in the document. Built end-to-end as a Retrieval-Augmented Generation (RAG) pipeline with Next.js, LangChain, Google Gemini, and Qdrant.

## How it works

```
   ┌─────────────┐
   │  Upload PDF │
   │  or .txt    │
   └──────┬──────┘
          ▼
  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │ 1. Load doc  │ →  │ 2. Chunk     │ →  │ 3. Embed     │
  │ (PDFLoader / │    │ (Recursive   │    │ (Gemini      │
  │  text)       │    │  splitter)   │    │  embed-001)  │
  └──────────────┘    └──────────────┘    └──────┬───────┘
                                                 ▼
                                          ┌──────────────┐
                                          │ 4. Store in  │
                                          │   Qdrant     │
                                          └──────────────┘

  ┌─────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │  Question   │ →  │ Embed query  │ →  │ Retrieve     │ →  │ Gemini 2.5   │
  │             │    │              │    │ top-k chunks │    │ flash answers│
  └─────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                                                              (grounded only
                                                               in retrieved
                                                               context)
```

## Stack

| Layer         | Choice                                  |
| ------------- | --------------------------------------- |
| Framework     | Next.js 14 (App Router) + TypeScript    |
| LLM           | Google Gemini `gemini-2.5-flash`        |
| Embeddings    | Google `gemini-embedding-001`           |
| Vector DB     | Qdrant Cloud                            |
| Orchestration | LangChain JS                            |
| Hosting       | Vercel                                  |

## Chunking strategy

We use LangChain's **`RecursiveCharacterTextSplitter`** with:

- `chunkSize: 1000` characters
- `chunkOverlap: 200` characters

**Why recursive?** It tries to split on natural boundaries first (paragraphs `\n\n`, then lines `\n`, then sentences, then words) before falling back to hard cuts. This keeps semantic units intact, which makes retrieval more accurate.

**Why 1000/200?** A standard balance:
- Small enough that each chunk is specific and an embedding can represent its meaning precisely
- Large enough to contain a complete thought (paragraph, section)
- 20% overlap prevents losing context at chunk boundaries — a sentence that gets cut in two will still appear whole in at least one chunk

Configurable in [lib/rag.ts](lib/rag.ts) via `CHUNK_SIZE` and `CHUNK_OVERLAP`.

## Grounding

The chat endpoint passes retrieved chunks into the system prompt with strict rules:

> Answer ONLY using the provided context. Do NOT use outside knowledge. If the answer is not in the context, reply: "I couldn't find this in the document."

LLM temperature is set to `0` for deterministic, faithful answers.

## Project structure

```
app/
  api/
    upload/route.ts   # POST: load → chunk → embed → store in Qdrant
    chat/route.ts     # POST: retrieve → grounded generation
  layout.tsx
  page.tsx            # Single-page UI: upload + chat
  globals.css
lib/
  rag.ts              # Shared helpers (embeddings, Qdrant config, loading, chunking)
```

## Local setup

1. Clone & install:
   ```bash
   npm install
   ```

2. Get API keys:
   - **Google API key** → [Google AI Studio](https://aistudio.google.com/apikey)
   - **Qdrant Cloud** → [cloud.qdrant.io](https://cloud.qdrant.io) → create a free cluster → copy URL + API key

3. Create `.env.local` from `.env.example`:
   ```env
   GOOGLE_API_KEY=...
   QDRANT_URL=https://xxx.cloud.qdrant.io
   QDRANT_API_KEY=...
   ```

4. Run dev server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000), upload a PDF or .txt, ask away.

## Deployment (Vercel)

1. Push this repo to GitHub.
2. Import the repo in [Vercel](https://vercel.com/new).
3. Add the three env vars (`GOOGLE_API_KEY`, `QDRANT_URL`, `QDRANT_API_KEY`) in Project Settings → Environment Variables.
4. Deploy.

> Each upload creates a new Qdrant collection named `doc_<uuid>`. The collection name is the only handle the chat route needs — no session state on the server.

## API reference

### `POST /api/upload`
- **Body:** `multipart/form-data` with `file` (PDF or `.txt`)
- **Returns:** `{ docId, filename, chunkCount }`

### `POST /api/chat`
- **Body:** `{ docId: string, question: string }`
- **Returns:** `{ answer: string, sources: { pageNumber, snippet }[] }`

## License

MIT
