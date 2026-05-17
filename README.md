# NotebookLM CRAG

A NotebookLM-style assistant powered by **Corrective Retrieval-Augmented Generation (CRAG)**: upload a PDF or text file, ask questions, and get answers grounded in the document — with a self-correcting fallback to web search when the document doesn't have the answer. Built with Next.js, LangChain, Google Gemini, Qdrant, and Tavily.

## How it works

```
   ┌─────────────┐
   │  Upload PDF │
   │  or .txt    │
   └──────┬──────┘
          ▼
  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │ 1. Load doc  │ →  │ 2. Chunk     │ →  │ 3. Embed     │ →  │ 4. Store in  │
  │              │    │              │    │ (Gemini)     │    │   Qdrant     │
  └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘

  Question
      │
      ▼
  ┌─────────────┐    ┌──────────────────┐    ┌──────────────────────────┐
  │ Embed query │ →  │ Retrieve top-k   │ →  │ Grade each chunk (LLM)   │
  └─────────────┘    │ from Qdrant      │    │  → relevant / not        │
                     └──────────────────┘    └──────────┬───────────────┘
                                                        ▼
                                       ┌──────────────────────────────┐
                                       │ Decide CRAG action           │
                                       │ all kept  → CORRECT          │
                                       │ some kept → AMBIGUOUS        │
                                       │ none kept → INCORRECT        │
                                       └──────────┬───────────────────┘
                                                  ▼
                              ┌────────────────────────────────────┐
                              │ AMBIGUOUS / INCORRECT:             │
                              │  rewrite query → Tavily web search │
                              └──────────┬─────────────────────────┘
                                         ▼
                              ┌────────────────────────────────────┐
                              │ Gemini answers from doc + web      │
                              │ context, cites pages and URLs      │
                              └────────────────────────────────────┘
```

The CRAG decision (CORRECT / AMBIGUOUS / INCORRECT), the number of kept chunks, the rewritten web query, and web sources are all surfaced in the UI for each answer.

## Stack

| Layer         | Choice                                  |
| ------------- | --------------------------------------- |
| Framework     | Next.js 14 (App Router) + TypeScript    |
| LLM           | Google Gemini `gemini-2.5-flash`        |
| Embeddings    | Google `gemini-embedding-001`           |
| Vector DB     | Qdrant Cloud                            |
| Web search    | Tavily (CRAG fallback)                  |
| Orchestration | LangChain JS                            |
| Hosting       | Vercel                                  |

## Environment

Copy `.env.example` to `.env.local` and fill in:

- `GOOGLE_API_KEY` — Google AI Studio
- `QDRANT_URL`, `QDRANT_API_KEY` — Qdrant Cloud
- `TAVILY_API_KEY` — Tavily (optional; without it CRAG runs in vector-only mode)

## Example

<img width="1470" height="956" alt="example" src="https://github.com/user-attachments/assets/72ee362c-1d0e-4830-9f0f-e38e2bc3181e" />
