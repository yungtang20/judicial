# 如何擴充本機實務判決知識庫 (Local Judgment KB)

本專案實作了 Hybrid RAG，能在外部 TW-Legal-RAG 無法連線時，安全降級至本機知識庫。
本機知識庫包含了「法規與函釋」以及「實務判決節錄」。

## 判決資料結構

我們透過 `scripts/ingestLocalJudgments.ts` 來將原始判決 JSON 切分並匯入系統。

### 1. 準備您的原始判決資料 (`raw-judgments.json`)

請依照以下格式準備包含原始判決文字的 JSON 陣列（此格式與司法院 Open Data 高度相容）：

```json
[
  {
    "court": "最高法院",
    "sys": "民事",
    "no": "112年度台上字第1號",
    "date": "2023-01-01",
    "reason": "損害賠償",
    "content": "主文\n上訴駁回...\n事實\n...\n理由\n按損害賠償之目的..."
  }
]
```

### 2. 執行匯入腳本

在專案根目錄下執行：

```bash
npx tsx scripts/ingestLocalJudgments.ts raw-judgments.json
```

腳本會自動：
1. 讀取並透過 `judgmentChunker.ts` 進行正則切分（擷取主文、理由，並切分長度過長的段落）。
2. 自動萃取關聯法條（如：`民法第184條`）。
3. 將切分後的 `JudgmentChunk` 附加到 `server/knowledge-base/seeds/judgments.json` 中。

### 3. 向量化 (Embedding)

為了保持輕量，`judgments.json` 中無需預先包含 `embedding` 向量。
當系統首次執行檢索時（`judgmentKnowledgeBase.searchHybrid`），若發現某個 chunk 缺乏 embedding，會自動呼叫本機的 `defaultEmbedder` 進行運算並保留在記憶體中。
未來可依照需求，加上定時將記憶體 embedding 寫回 `.json` 的快取機制。
