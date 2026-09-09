# Smart Legal Assistant

臺灣法律分析、法律文件生成與外部文件引用檢查工具。

## 主要功能

- 智能裁判分析與比對（Smart Appeal Assistant / Judgment Analysis）
- LegalToolbox：依實際 `LEGAL_TOOLS` registry 動態顯示可用工具，不使用固定工具數量文案
- 雙軌訴訟防禦（DefenseWorkflowTool）
- 證據清單、時序與爭點整理
- 實務見解與裁判檢索
- 司法院資料開放平台連線
- 外部法律文件 AI 檢核器（External Legal Document Checker）
- 生活情境導診的法規／裁判／函釋分組檢索（可選 `tw-legal-rag`）

## 全法規通用法律分析

所有法律分析與文件生成工具共用 `UNIVERSAL_SYLLOGISM_RULES`，適用於民事、刑事、行政、家事、勞動、程序法、強制執行、上訴、時效及其他法律問題，並依下列順序分析：

1. 大前提：法規、法律原則與完整構成要件
2. 小前提：案件事實與證據
3. 涵攝：逐項比對事實、證據與構成要件
4. 結論：法律效果、程序、時效及待補事實

## 法律文件引用檢查流程

本系統生成的書狀、起訴狀、告訴狀、答辯狀、上訴狀、聲請狀、存證信函及 AI 導診文件，會自動執行：

```text
法律分析
→ 引用候選法條／裁判
→ PRE-CHECK 輸入與明示引用檢查
→ 生成法律文件
→ POST-CHECK 全文引用掃描
→ 檢查通過後回傳文件
```

引用檢查屬本機 heuristic 與索引比對，不等同司法院或其他官方機關核實；未索引或重要引用仍應人工查證。

統一工作流節點 4/6 會依 typed citation 分流逐筆查詢全國法規資料庫（法規）或司法院裁判書系統（裁判），保存 `status`、來源網址、查詢字串、比對策略、內容雜湊與查證時間。官方回傳查無資料或服務不可用時，節點 6 會 `fail-closed`（`NEEDS_REVIEW`），前端會顯示每筆官方證據；本機索引結果不會冒充官方查證。

Production 固定強制 CSP 與 authentication；CSP 不接受 production report-only 降級。Production Guest token 預設停用，只有明確設定 `ALLOW_GUEST_MODE=true` 才會啟用；目前公開 Render demo 已明確啟用，瀏覽器會取得短效簽章 token，且每個 Guest 使用獨立 tenant。可設定 `JWT_ISSUER`／`JWT_AUDIENCE` 強制驗證 token claims。審計 SQLite 為單機短期診斷儲存，Render 無 persistent disk 時不視為永久合規備份。

`/api/health` 會回報 `auditPersistence.mode` 與 `durable`。若正式環境要求審計持久化，請設定 persistent `AUDIT_DB_PATH` 並啟用 `AUDIT_PERSISTENCE_REQUIRED=true`；初始化失敗時服務會 fail-closed。

External Legal Document Checker 僅供獨立檢查對造書狀、外部律師文件、ChatGPT／Claude 等 AI 文件、網路法律文章及使用者自行匯入文件。系統自行生成的文件不需要使用者再次手動貼入檢核器。

外部文件檢核器另提供可選的裁判字號存在性交叉檢查：使用者明確同意後，僅將擷取出的裁判字號送至第三方 `dr-lawbot` 查詢，不會傳送完整文件。結果僅表示該資料源是否回傳完全吻合字號，並非官方核實，也不判斷裁判內容是否支持引用主張；查無結果、涵蓋範圍不足或服務失敗都必須人工至權威來源確認。

生活情境導診完成 AI 分析後，可在結果視窗分開查看法規、裁判、函釋與論著。啟用 `TLR_ENABLED=true` 後，server 會以 `tw-legal-rag` 的 retrieval-only 服務查詢判決與函釋；`allowed_citations` 只作為可引用候選提示，未讀候選不得直接當作權威依據。Lawbank 目前僅提供外部搜尋連結，未直接爬取其網站。

## 啟動方式

```bash
npm install
npm run dev
```

## Render 部署

Production 服務目前部署於 Render：

- 網址：[https://judicial-prod.onrender.com](https://judicial-prod.onrender.com)
- Runtime：Node.js 22.23.2（由 `.node-version` 與 Blueprint 固定）
- Build command：`npm ci --include=dev && npm run build`
- Start command：`npm start`

Render 部署設定位於根目錄的 `render.yaml`。部署時必須在 Render Environment Variables 設定：

```text
JWT_SECRET       # 至少 32 字元且具足夠熵值
HCNSEC_API_KEY   # 使用 HCNSEC provider 時必要
APP_URL          # Production 公開網址
```

Production 的首頁、前端 assets 與 `/api/health` 可公開存取；所有 `/api` 請求及非 GET 請求仍須提供有效的 Bearer Token 或 `X-API-Key`。

## 驗證指令

```bash
npm run lint
npm test
npm run test:coverage
npm run test:ssrf
npm run build
```
