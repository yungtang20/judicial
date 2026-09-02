# Phase 4: Judgment Hybrid RAG System Design

## 1. 整體架構圖 (Architecture Overview)

```text
[ 資料管線 Data Pipeline ]
司法院 Open Data (裁判書 JSON) / 爬蟲 (Crawler)
       ↓
[ 文本清洗與 Chunking ] (按「爭點 / 理由段落 / 要旨」切分)
       ↓
[ Embedding & Indexing ] 
  ├─ Dense Vector (Gemini / text-embedding-004) -> Vector Store (SQLite-vec / LanceDB / pgvector)
  └─ Sparse / Keyword (BM25 / Full-text Search) -> FTS5 (SQLite) / Elasticsearch

[ 檢索服務 Retrieval Service ]
使用者查詢 Query
  ├─ 1. BM25 關鍵字檢索 (過濾：法院層級、時間、案由)
  └─ 2. Vector 向量檢索
       ↓
[ 混合排序 Hybrid Search & Reranking ]
Reciprocal Rank Fusion (RRF) 或 LLM Reranker (Cross-Encoder)
       ↓
[ 結果整合 Result Integration ]
合併 Phase 3 (法規 + 函釋) + Phase 4 (判決段落)
       ↓
[ 生成管線 LegalGenerationPipeline ]
注入 Prompt -> AI 生成 -> Citation Verifier (防幽靈引用)
```

## 2. 技術選型與理由

1. **資料管線**：
   - **來源**：司法院開放資料 API 或每日打包的 JSON 檔。相比即時爬蟲，批次處理 Open Data 更穩定且不對司法院伺服器造成負擔。
   - **Chunking 策略**：判決書通常極長。不建議按固定 token 數切。應採用「語意分段」：主文、事實、理由（再細分爭點）。保留法院、裁判字號、裁判日期、案由等 Metadata。
2. **Vector Store & Full-Text Search**：
   - **方案 A (純 Node.js + SQLite)**：使用 SQLite 的 `FTS5` 擴充做全文檢索 (BM25)，結合 `sqlite-vec` 擴充做向量檢索。優點：輕量、無須額外維護資料庫服務，適合單機部署與小規模 (十萬筆以內)。
   - **方案 B (PostgreSQL + pgvector)**：若資料量達到百萬筆級別 (全台歷年判決)，則強烈建議使用 PostgreSQL (pgvector + pg_trgm)。
3. **Reranker**：
   - 初期：使用 Reciprocal Rank Fusion (RRF) 演算法結合 BM25 與 Vector 分數，計算成本最低。
   - 後期：使用輕量級 Cross-Encoder (如 `BGE-Reranker` 透過 API 或本地部署) 來提升排序精準度。

## 3. 核心模組介面設計

```typescript
// server/knowledge-base/judgmentTypes.ts

export interface JudgmentMetadata {
  court: string;        // e.g., "最高法院"
  caseNo: string;       // e.g., "112年度台上字第123號"
  sys: string;          // e.g., "刑事", "民事"
  reason: string;       // e.g., "損害賠償"
  date: string;         // e.g., "2023-05-10"
  relatedStatutes: string[]; // 相關法條
}

export interface JudgmentChunk {
  id: string;
  judgmentId: string;
  metadata: JudgmentMetadata;
  section: "主文" | "事實" | "理由" | "要旨";
  content: string;      // 該段落文本
  embedding?: number[];
}

export interface JudgmentRetrievalFilter {
  courtLevels?: string[]; // e.g., ["最高法院", "高等法院"]
  sys?: "刑事" | "民事" | "行政";
  dateRange?: { start: string; end: string };
}

export interface IJudgmentRetriever {
  search(query: string, filter?: JudgmentRetrievalFilter, topK?: number): Promise<JudgmentChunk[]>;
}
```

## 4. 與現有 Phase 1~3 程式碼的整合點

- **擴充 `LocalLegalKnowledgeBase` 或建立 `JudgmentKnowledgeBase`**：
  Phase 3 已經實作了 `LocalLegalKnowledgeBase` 處理法規與函釋。Phase 4 建立專屬的 `JudgmentKnowledgeBase`。
- **整合於 `LegalRetrievalService`**：
  在 `retrieveContext` 方法中，平行呼叫 Phase 3 的法規檢索與 Phase 4 的判決檢索。
  ```typescript
  const [statutesSources, judgmentSources] = await Promise.all([
    this.localKb.retrieveAsSources(query),
    this.judgmentKb.retrieveAsSources(query)
  ]);
  // 合併 sources 並統一回傳
  ```
- **串接 `citationVerifier` (防幽靈引用)**：
  Phase 4 檢索到的 `caseNo` (裁判字號) 必須被加入 `allowedCitations` 陣列中。這樣 Pipeline 步驟 4 的 `verifyGeneratedDocument` 就能無縫攔截 AI 偽造的判決字號。

## 5. 分階段實作路線圖 (Roadmap)

- **Step 1: 基礎建設與小規模資料 (PoC)**
  - 實作 `JudgmentKnowledgeBase` 介面。
  - 抓取 100 篇最高法院具代表性之判決，手動或簡單正則切分 Chunk，存入 JSON 或 SQLite。
  - 實作 RRF (BM25 + Vector) 混合檢索。
- **Step 2: 系統整合與防護機制**
  - 將 `JudgmentKnowledgeBase` 接入 `LegalRetrievalService`。
  - 確認檢索到的裁判字號正確注入 `allowedCitations`，且 Pipeline 正常運作。
  - 更新 Prompt 範本，區分「法規/函釋」與「實務判決段落」。
- **Step 3: 資料管線自動化 (Data Pipeline)**
  - 實作司法院 Open Data 解析腳本。
  - 建立穩健的 Chunking 演算法 (利用法學特徵，如「理  由」、「主  文」等標籤斷詞)。
  - 轉移至 `sqlite-vec` 或 `pgvector` 以應付大量資料。
- **Step 4: 進階檢索 (Advanced Retrieval)**
  - 實作 Metadata Filter (法院層級、時間區間)。
  - 引入 Cross-Encoder 進行 Rerank。

## 6. 風險與限制說明

1. **幻覺風險 (Hallucination)**：
   LLM 可能會把 A 判決的事實與 B 判決的理由縫合。
   *緩解*：Prompt 中強硬規定「必須明確指出哪一個判決字號對應哪一段論述，不得混淆」。
2. **切分斷層 (Chunking Context Loss)**：
   按段落切分可能導致理由段落缺少前文事實背景。
   *緩解*：Chunking 時採用 Overlapping，或在每個 Chunk 前綴加上該案的簡要 Metadata (如案由、法院層級)。
3. **效能與儲存成本**：
   全台判決數量極大，Embedding 運算與儲存成本驚人。
   *緩解*：初期僅針對「最高法院判決」或「具參考價值裁判」建立索引。
4. **法律效力免責 (Disclaimer)**：
   必須在回傳的 API Payload 中明確標示：「本系統檢索之判決節錄僅供參考，不代表最新實務見解，亦不構成正式法律建議，請務必至司法院系統查閱全文。」
