/**
 * Unified Legal Search Service
 *
 * Consolidates: twLegalRagClient (RAG search) + apiClient (fetchUrl, searchTlr, fetchTlrFulltext)
 * Provides a single entry point for all legal source retrieval.
 */

import {
  type LegalSourceKind,
  type LegalSourceItem,
  type LegalSearchSources,
  type LegalPromptContext,
  searchLegalSources as _searchLegalSources,
  formatLegalPromptBlock as _formatLegalPromptBlock,
  retrieveLegalContext as _retrieveLegalContext,
} from '../twLegalRagClient';
import { apiClient } from '../apiClient';

// ── Re-export existing types ──────────────────────────────────────────────────
export type {
  LegalSourceKind,
  LegalSourceItem,
  LegalSearchSources,
  LegalPromptContext,
};

// ── Re-export low-level helpers ───────────────────────────────────────────────
export const searchLegalSources = _searchLegalSources;
export const formatLegalPromptBlock = _formatLegalPromptBlock;
export const retrieveLegalContext = _retrieveLegalContext;

// ── Unified high-level APIs ───────────────────────────────────────────────────

/**
 * Search for legal sources and return formatted prompt block in one call.
 * Combines `searchLegalSources` + `formatLegalPromptBlock`.
 */
export async function searchAndFormat(
  query: string,
  fetchImpl?: typeof fetch
): Promise<{
  sources: LegalSearchSources;
  promptBlock: string;
}> {
  const sources = await _searchLegalSources(query, fetchImpl);
  const promptBlock = _formatLegalPromptBlock(sources, []);
  return { sources, promptBlock };
}

/**
 * Fetch and parse a remote URL (PDF / HTML) for document ingestion.
 */
export async function fetchAndParseUrl(url: string): Promise<{
  ok: boolean;
  title?: string;
  content?: string;
  error?: string;
}> {
  return apiClient.fetchUrl(url);
}

/**
 * Search TW Legal RAG via the backend API and return raw source items.
 */
export async function searchTlr(
  query: string,
  searchType: string = 'all'
): Promise<LegalSourceItem[]> {
  return apiClient.searchTlr(query, searchType);
}

/**
 * Fetch full text of a TLR source by id.
 */
export async function fetchTlrFulltext(
  docId: string,
  system: string = 'judgment'
): Promise<{ fulltext?: string; error?: string }> {
  return apiClient.fetchTlrFulltext(docId, system);
}
