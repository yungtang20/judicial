/**
 * Minimal embedding interface for RAG and knowledge-base retrieval.
 * Implementations encapsulate any vendor SDK (Gemini, OpenAI, local, etc.).
 */
export interface Embedder {
  embed(text: string): Promise<number[]>;
}
