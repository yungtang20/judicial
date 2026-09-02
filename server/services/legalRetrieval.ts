import { GoogleGenAI } from "@google/genai";
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";

const nodeRequire = createRequire(import.meta.url);
let DatabaseSync: any;
try {
  DatabaseSync = nodeRequire("node:sqlite")?.DatabaseSync;
} catch {
  DatabaseSync = undefined;
}

export interface DocumentInput {
  id: string;
  source: 'statute' | 'judgment';
  citation: string;
  fullText: string;
  url: string;
  metadata?: Record<string, any>;
}

export interface RetrievedChunk {
  id: string;
  source: 'statute' | 'judgment';
  citation: string;
  excerpt: string;
  sourceUrl: string;
  score: number;
}

export interface StoredDocument {
  id: string;
  source: 'statute' | 'judgment';
  citation: string;
  fullText: string;
  url: string;
  embedding: number[];
  metadata?: Record<string, any>;
}

export interface VectorStore {
  insert(doc: StoredDocument): Promise<void>;
  getAll(sourceFilter?: 'statute' | 'judgment'): Promise<StoredDocument[]>;
  getById(id: string): Promise<StoredDocument | null>;
  clear(): Promise<void>;
  count(): Promise<number>;
}

/**
 * Deterministic fallback embedding for offline/testing environments
 * Generates a normalized 128-dimensional embedding using character n-grams and hashing
 */
function createFallbackEmbedding(text: string, dimensions = 128): number[] {
  const vec = new Float64Array(dimensions);
  const clean = text.toLowerCase().replace(/\s+/g, "");
  if (!clean) return Array.from(vec);

  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    const idx1 = (code * 31 + i) % dimensions;
    const idx2 = (code * 17 + (clean.charCodeAt(i + 1) || 0)) % dimensions;
    vec[idx1] += 1.0;
    vec[idx2] += 0.5;
  }

  let norm = 0;
  for (let i = 0; i < dimensions; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) {
      vec[i] /= norm;
    }
  }
  return Array.from(vec);
}

/**
 * Compute cosine similarity between two numeric vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return dot / denom;
}

export class LegalEmbedder {
  private apiKey?: string;

  constructor() {
    this.refreshApiKey();
  }

  public refreshApiKey(): void {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.API_KEY;
    if (key && !key.startsWith("MY_") && key !== "YOUR_API_KEY" && key !== "placeholder" && key.trim() !== "") {
      this.apiKey = key.trim();
    } else {
      this.apiKey = undefined;
    }
  }

  public async embed(text: string): Promise<number[]> {
    this.refreshApiKey();
    if (this.apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: this.apiKey });
        const res = await ai.models.embedContent({
          model: "text-embedding-004",
          contents: text,
        });
        const raw: any = res;
        const vals = raw.embedding?.values || res.embeddings?.[0]?.values;
        if (Array.isArray(vals) && vals.length > 0) {
          return vals;
        }
      } catch (err: any) {
        // Fallback to local deterministic embedding when remote API is unreachable or mock
      }
    }
    return createFallbackEmbedding(text, 128);
  }
}

/**
 * SQLite-backed vector store using Node 22 node:sqlite
 * Stores documents and embedding vectors; allows modular replacement with pgvector/sqlite-vec.
 */
export class SQLiteVectorStore implements VectorStore {
  private db: any;

  constructor(dbPath?: string) {
    if (!dbPath || dbPath === ":memory:") {
      this.db = new DatabaseSync(":memory:");
    } else {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.db = new DatabaseSync(dbPath);
    }
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS legal_documents (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        citation TEXT NOT NULL,
        full_text TEXT NOT NULL,
        url TEXT NOT NULL,
        embedding TEXT NOT NULL,
        metadata TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_legal_docs_source ON legal_documents(source);
    `);
  }

  public async insert(doc: StoredDocument): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO legal_documents (id, source, citation, full_text, url, embedding, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      doc.id,
      doc.source,
      doc.citation,
      doc.fullText,
      doc.url,
      JSON.stringify(doc.embedding),
      doc.metadata ? JSON.stringify(doc.metadata) : null
    );
  }

  public async getAll(sourceFilter?: 'statute' | 'judgment'): Promise<StoredDocument[]> {
    let rows: any[];
    if (sourceFilter) {
      const stmt = this.db.prepare(`SELECT * FROM legal_documents WHERE source = ?`);
      rows = stmt.all(sourceFilter);
    } else {
      const stmt = this.db.prepare(`SELECT * FROM legal_documents`);
      rows = stmt.all();
    }
    return rows.map((r: any) => ({
      id: r.id,
      source: r.source,
      citation: r.citation,
      fullText: r.full_text,
      url: r.url,
      embedding: JSON.parse(r.embedding),
      metadata: r.metadata ? JSON.parse(r.metadata) : undefined
    }));
  }

  public async getById(id: string): Promise<StoredDocument | null> {
    const stmt = this.db.prepare(`SELECT * FROM legal_documents WHERE id = ?`);
    const r: any = stmt.get(id);
    if (!r) return null;
    return {
      id: r.id,
      source: r.source,
      citation: r.citation,
      fullText: r.full_text,
      url: r.url,
      embedding: JSON.parse(r.embedding),
      metadata: r.metadata ? JSON.parse(r.metadata) : undefined
    };
  }

  public async clear(): Promise<void> {
    this.db.exec(`DELETE FROM legal_documents`);
  }

  public async count(): Promise<number> {
    const stmt = this.db.prepare(`SELECT COUNT(*) as cnt FROM legal_documents`);
    const r: any = stmt.get();
    return r ? Number(r.cnt) : 0;
  }
}

// Default storage instances
const defaultDbPath = process.env.LEGAL_RAG_DB_PATH || path.resolve(process.cwd(), ".cache", "legal_vectors.db");
export const defaultEmbedder = new LegalEmbedder();
export const defaultVectorStore: VectorStore = new SQLiteVectorStore(defaultDbPath);

/**
 * Index a legal document into the vector database
 */
export async function indexDocument(
  doc: DocumentInput,
  vectorStore: VectorStore = defaultVectorStore,
  embedder: LegalEmbedder = defaultEmbedder
): Promise<void> {
  const embeddingText = `${doc.citation} ${doc.fullText}`;
  const embedding = await embedder.embed(embeddingText);
  await vectorStore.insert({
    id: doc.id,
    source: doc.source,
    citation: doc.citation,
    fullText: doc.fullText,
    url: doc.url,
    embedding,
    metadata: doc.metadata
  });
}

function extractRelevantExcerpt(fullText: string, query: string, maxLength = 250): string {
  if (!fullText) return "";
  if (fullText.length <= maxLength) return fullText;

  // Search for the query keywords inside the text
  const cleanTokens = query.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, " ").split(/\s+/).filter(t => t.length >= 2);
  let bestPos = -1;

  for (const token of cleanTokens) {
    const pos = fullText.indexOf(token);
    if (pos !== -1) {
      bestPos = pos;
      break;
    }
  }

  if (bestPos === -1) {
    return fullText.slice(0, maxLength) + "…";
  }

  const start = Math.max(0, bestPos - 40);
  const end = Math.min(fullText.length, start + maxLength);
  const excerpt = fullText.slice(start, end);
  return (start > 0 ? "…" : "") + excerpt + (end < fullText.length ? "…" : "");
}

function extractSearchTokens(query: string): string[] {
  const clean = query.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, " ").trim();
  const words = clean.split(/\s+/).filter(w => w.length >= 2);
  const tokens = new Set<string>(words);

  for (const word of words) {
    if (/[\u4e00-\u9fa5]/.test(word)) {
      for (let i = 0; i < word.length - 1; i++) {
        tokens.add(word.slice(i, i + 2));
      }
    }
  }
  return Array.from(tokens);
}

/**
 * Retrieve relevant legal chunks given a natural language query
 */
export async function retrieve(
  query: string,
  opts?: {
    topK?: number;
    source?: 'statute' | 'judgment';
    minScore?: number;
    vectorStore?: VectorStore;
    embedder?: LegalEmbedder;
  }
): Promise<RetrievedChunk[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const store = opts?.vectorStore || defaultVectorStore;
  const embedder = opts?.embedder || defaultEmbedder;
  const topK = opts?.topK || 5;
  const minScore = opts?.minScore ?? 0.05;

  const docs = await store.getAll(opts?.source);
  if (docs.length === 0) {
    return [];
  }

  const queryEmbedding = await embedder.embed(trimmed);
  const scored: Array<{ doc: StoredDocument; score: number }> = [];
  const searchTokens = extractSearchTokens(trimmed);

  for (const doc of docs) {
    let score = cosineSimilarity(queryEmbedding, doc.embedding);

    // Exact citation boost or keyword boost
    if (doc.citation && trimmed.includes(doc.citation)) {
      score += 0.5;
    }
    if (doc.fullText && doc.fullText.includes(trimmed)) {
      score += 0.3;
    }

    // Token overlap boost (hybrid retrieval)
    let tokenOverlap = 0;
    for (const token of searchTokens) {
      if (doc.citation && doc.citation.includes(token)) tokenOverlap += 0.25;
      if (doc.fullText && doc.fullText.includes(token)) tokenOverlap += 0.15;
    }
    score += tokenOverlap;

    const hasExactMatch = (doc.citation && trimmed.includes(doc.citation)) || (doc.fullText && doc.fullText.includes(trimmed));
    const isMeaningfulMatch = hasExactMatch || tokenOverlap > 0 || score >= 0.75;

    if (isMeaningfulMatch && score >= minScore) {
      scored.push({ doc, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, topK).map(({ doc, score }) => ({
    id: doc.id,
    source: doc.source,
    citation: doc.citation,
    excerpt: extractRelevantExcerpt(doc.fullText, trimmed),
    sourceUrl: doc.url,
    score: Number(score.toFixed(4))
  }));
}
