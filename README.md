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

## Example

<img width="1470" height="956" alt="example" src="https://github.com/user-attachments/assets/72ee362c-1d0e-4830-9f0f-e38e2bc3181e" />
