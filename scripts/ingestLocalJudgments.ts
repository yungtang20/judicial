#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { parseAndChunkJudicialData, RawJudicialData } from "../server/knowledge-base/judgmentChunker.js";
import { JudgmentChunk } from "../server/knowledge-base/judgmentTypes.js";

const SEED_FILE = path.resolve(process.cwd(), "server/knowledge-base/seeds/judgments.json");

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log("Usage: tsx scripts/ingestLocalJudgments.ts <path_to_raw_judgments.json>");
    console.log("格式範例: [{ \"court\": \"最高法院\", \"sys\": \"民事\", \"no\": \"112年度台上字第1號\", \"date\": \"2023-01-01\", \"reason\": \"損害賠償\", \"content\": \"主文... 理由...\" }]");
    process.exit(1);
  }

  const inputFile = path.resolve(process.cwd(), args[0]);
  if (!fs.existsSync(inputFile)) {
    console.error(`File not found: ${inputFile}`);
    process.exit(1);
  }

  console.log(`讀取原始判決資料: ${inputFile}`);
  const rawData: RawJudicialData[] = JSON.parse(fs.readFileSync(inputFile, "utf-8"));

  let existingChunks: JudgmentChunk[] = [];
  if (fs.existsSync(SEED_FILE)) {
    try {
      existingChunks = JSON.parse(fs.readFileSync(SEED_FILE, "utf-8"));
      console.log(`目前 judgments.json 已有 ${existingChunks.length} 筆 chunks`);
    } catch (err: any) {
      console.warn(`讀取既有 judgments.json 失敗: ${err.message}`);
    }
  }

  let newChunksCount = 0;
  for (const raw of rawData) {
    // Basic validation
    if (!raw.no || !raw.content || !raw.court) {
      console.warn(`[警告] 跳過無效資料: ${JSON.stringify(raw).slice(0, 50)}...`);
      continue;
    }

    const chunks = parseAndChunkJudicialData(raw);
    for (const chunk of chunks) {
      // 避免重複匯入相同 id
      if (!existingChunks.find(c => c.id === chunk.id)) {
        existingChunks.push(chunk);
        newChunksCount++;
      }
    }
  }

  fs.writeFileSync(SEED_FILE, JSON.stringify(existingChunks, null, 2), "utf-8");
  console.log(`成功匯入並切分 ${newChunksCount} 筆新 chunks。`);
  console.log(`目前 judgments.json 總計 ${existingChunks.length} 筆 chunks。`);
  console.log(`注意: 首次被搜尋時，系統會自動呼叫 defaultEmbedder 進行向量化，並可隨後快取回寫。`);
}

main().catch(err => {
  console.error("匯入失敗:", err);
  process.exit(1);
});
