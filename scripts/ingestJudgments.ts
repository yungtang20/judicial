#!/usr/bin/env node
import fs from "node:fs";
import { fetchJudicialHtml, parseJudicialJudgment } from "../server/services/judicialCrawler.js";
import { indexDocument, defaultVectorStore, defaultEmbedder } from "../server/services/legalRetrieval.js";
import { ingestSeedCorpus } from "../server/services/corpusIngest.js";

async function main() {
  const args = process.argv.slice(2);
  console.log("=== 司法院判決與法規語料向量化匯入程式 ===");

  // 1. 同步匯入已驗證的種子法規與判例資料庫
  console.log("[1/2] 正在匯入種子法規與判例資料庫...");
  const seedStats = await ingestSeedCorpus(defaultVectorStore, defaultEmbedder);
  console.log(`種子資料匯入完成: 法規 ${seedStats.statutesCount} 筆, 判決 ${seedStats.judgmentsCount} 筆, 跳過 ${seedStats.skippedCount} 筆`);

  // 2. 若有額外提供 URL 或檔案清單，進行爬取與解析
  const urlsToIngest: string[] = [];
  for (const arg of args) {
    if (arg.startsWith("http://") || arg.startsWith("https://")) {
      urlsToIngest.push(arg);
    } else if (fs.existsSync(arg)) {
      const content = fs.readFileSync(arg, "utf-8");
      const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.startsWith("http"));
      urlsToIngest.push(...lines);
    }
  }

  if (urlsToIngest.length > 0) {
    console.log(`[2/2] 開始處理 ${urlsToIngest.length} 個外部判決 URL...`);
    let ingestedUrlCount = 0;
    let failedUrlCount = 0;

    for (const url of urlsToIngest) {
      try {
        console.log(`正在抓取: ${url}`);
        const html = await fetchJudicialHtml(url);
        const parsed = parseJudicialJudgment(html);

        if (!parsed.fullText) {
          console.warn(`[警告] URL 查無有效判決全文，跳過: ${url}`);
          failedUrlCount++;
          continue;
        }

        const citation = parsed.caseNumber || (parsed.courtName ? `${parsed.courtName}判決` : "司法院判決");
        const id = `crawl_${Buffer.from(url).toString("base64url").slice(0, 32)}`;

        await indexDocument({
          id,
          source: "judgment",
          citation,
          fullText: parsed.fullText.slice(0, 2000), // 取關鍵主文與事實理由
          url,
          metadata: {
            courtName: parsed.courtName,
            crawledAt: new Date().toISOString()
          }
        }, defaultVectorStore, defaultEmbedder);

        ingestedUrlCount++;
        console.log(`✓ 成功索引: ${citation}`);
      } catch (err: any) {
        console.warn(`[警告] 抓取或解析失敗 [${url}]: ${err.message}`);
        failedUrlCount++;
      }
    }
    console.log(`URL 處理完成: 成功 ${ingestedUrlCount} 筆, 失敗/跳過 ${failedUrlCount} 筆`);
  } else {
    console.log("[2/2] 未提供額外 URL 清單，結束執行。");
  }

  const totalCount = await defaultVectorStore.count();
  console.log(`目前向量庫總收錄資料筆數: ${totalCount} 筆`);
}

if (process.argv[1]?.endsWith("ingestJudgments.ts") || process.argv[1]?.endsWith("ingestJudgments.js")) {
  main().catch((err) => {
    console.error("語料匯入異常終止:", err);
    process.exit(1);
  });
}
