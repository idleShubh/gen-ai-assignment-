"use client";

import { useRef, useState } from "react";

type Source = {
  pageNumber: number | null;
  snippet: string;
};

type Message =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; sources?: Source[] };

export default function Home() {
  const [docId, setDocId] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [chunkCount, setChunkCount] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    setMessages([]);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setDocId(data.docId);
      setFilename(data.filename);
      setChunkCount(data.chunkCount);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || !docId || asking) return;

    setMessages((m) => [...m, { role: "user", content: q }]);
    setQuestion("");
    setAsking(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId, question: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.answer, sources: data.sources },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Request failed";
      setMessages((m) => [...m, { role: "assistant", content: `Error: ${msg}` }]);
    } finally {
      setAsking(false);
    }
  }

  function reset() {
    setDocId(null);
    setFilename(null);
    setChunkCount(null);
    setMessages([]);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <main className="app">
      <h1>Gen Ai Assignment by Shubh</h1>
      <p className="subtitle">
        Upload a PDF or text file, then ask questions about its contents.
      </p>

      <section className="card">
        {!docId ? (
          <form onSubmit={handleUpload} className="upload-row">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,application/pdf,text/plain"
              disabled={uploading}
            />
            <button type="submit" disabled={uploading}>
              {uploading ? "Indexing…" : "Upload"}
            </button>
          </form>
        ) : (
          <div className="upload-row">
            <span className="doc-pill">
              <strong>{filename}</strong>
              <span>· {chunkCount} chunks</span>
            </span>
            <button onClick={reset} type="button">
              New document
            </button>
          </div>
        )}
        {uploadError && <p className="status error">{uploadError}</p>}
        {uploading && <p className="status">Chunking, embedding, indexing…</p>}
      </section>

      {docId && (
        <section className="chat">
          <div className="messages">
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>
                <div>{m.content}</div>
                {m.role === "assistant" && m.sources && m.sources.length > 0 && (
                  <div className="sources">
                    <details>
                      <summary>Sources ({m.sources.length})</summary>
                      {m.sources.map((s, j) => (
                        <div key={j} className="source-item">
                          {s.pageNumber !== null && (
                            <div className="pg">Page {s.pageNumber}</div>
                          )}
                          <div>{s.snippet}…</div>
                        </div>
                      ))}
                    </details>
                  </div>
                )}
              </div>
            ))}
            {asking && <div className="thinking">Thinking…</div>}
          </div>

          <form onSubmit={handleAsk} className="input-row">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAsk(e);
                }
              }}
              placeholder="Ask a question about the document…"
              disabled={asking}
            />
            <button type="submit" disabled={asking || !question.trim()}>
              Send
            </button>
          </form>
        </section>
      )}
    </main>
  );
}
