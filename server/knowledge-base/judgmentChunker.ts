/**
 * Phase 4 Roadmap Step 3: 資料管線自動化 (Data Pipeline)
 * 此為示範如何將司法院 Open Data 的原始 JSON 判決書解析為 JudgmentChunk 的工具函式。
 */
import { JudgmentChunk, JudgmentMetadata } from "./judgmentTypes.js";

/**
 * 模擬自司法院 Open Data API 取得之原始 JSON 格式
 */
export interface RawJudicialData {
  court: string;
  sys: string;
  no: string;
  date: string;
  reason: string;
  content: string; // 包含主文、事實、理由等合併之大字串
}

export function parseAndChunkJudicialData(rawData: RawJudicialData): JudgmentChunk[] {
  const chunks: JudgmentChunk[] = [];
  
  const metadata: JudgmentMetadata = {
    court: rawData.court,
    sys: rawData.sys,
    caseNo: `${rawData.court} ${rawData.no}判決`,
    date: rawData.date,
    reason: rawData.reason,
    relatedStatutes: extractStatutes(rawData.content)
  };

  const idPrefix = `judg-${rawData.no.replace(/\s+/g, '-')}`;

  // 簡易的正則切分策略 (實務上需更精確的 NLP 模型或複合正則表達式)
  const mainTextMatch = rawData.content.match(/主\s*文\s*([\s\S]*?)(?:事\s*實|理\s*由|$)/);
  if (mainTextMatch && mainTextMatch[1].trim()) {
    chunks.push({
      id: `${idPrefix}-main`,
      judgmentId: rawData.no,
      metadata,
      section: "主文",
      content: mainTextMatch[1].trim()
    });
  }

  const reasonMatch = rawData.content.match(/理\s*由\s*([\s\S]*?)(?:據上論斷|$)/);
  if (reasonMatch && reasonMatch[1].trim()) {
    const reasonText = reasonMatch[1].trim();
    // 理由段落通常非常長，若超過一定字數可再細切 (Overlapping Chunking)
    if (reasonText.length > 2000) {
      const splitReasons = splitLongReason(reasonText);
      splitReasons.forEach((part, index) => {
        chunks.push({
          id: `${idPrefix}-reason-${index}`,
          judgmentId: rawData.no,
          metadata,
          section: "理由",
          content: part
        });
      });
    } else {
      chunks.push({
        id: `${idPrefix}-reason`,
        judgmentId: rawData.no,
        metadata,
        section: "理由",
        content: reasonText
      });
    }
  }

  return chunks;
}

/**
 * 擷取相關法條的輔助工具
 */
function extractStatutes(content: string): string[] {
  const matches = content.match(/(?:民法|刑法|民事訴訟法|刑事訴訟法|勞動基準法)第\s*\d+\s*條(?:之\d+)?/g);
  return matches ? Array.from(new Set(matches.map(s => s.replace(/\s+/g, '')))) : [];
}

/**
 * 將超長理由段落進一步切分的輔助工具 (示範簡單的依據換行與字數切分)
 */
function splitLongReason(reason: string): string[] {
  const lines = reason.split('\n');
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const line of lines) {
    if (currentChunk.length + line.length > 1000) {
      chunks.push(currentChunk);
      currentChunk = line;
    } else {
      currentChunk += '\n' + line;
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}
