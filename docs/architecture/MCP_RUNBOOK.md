# MCP 法律檢索 Runbook

雙來源架構：語義檢索（TLR）與官方直連（mcp-taiwan-legal-db）互補，不得互相取代。

| 來源 | 介面 | 用途 |
|---|---|---|
| TLR（法律偵探後端） | Remote MCP `tlr` ＋ `twlegalrag` CLI | 2,260 萬筆裁判語義檢索、函釋效力、現行法條 |
| mcp-taiwan-legal-db 1.2.0 | 本機 stdio spawn（見下表） | 司法院／法規庫／憲法法庭官方即時查詢 |

## 接線位置

- opencode MCP：`.opencode/opencode.json` → `mcp.tlr`（`type: remote`，免 key，OAuth 動態註冊）
- TLR CLI 版 skill：`tw-legal-rag`（`pack` 為主流程，`law`／`ref` 為法源查證）
- 官方來源 client：`src/lib/taiwanLegalDbClient.ts`

## 安裝與驗證

```bash
# TLR CLI（本機已有 2.2.0）
pip install -U twlegalrag
twlegalrag health

# mcp-taiwan-legal-db（獨立 venv，不得裝到系統 Python）
# 預設路徑：D:\工作用\mcp-taiwan-legal-db\.venv
D:\工作用\mcp-taiwan-legal-db\.venv\Scripts\python.exe -m pip show mcp-taiwan-legal-db
D:\工作用\mcp-taiwan-legal-db\.venv\Scripts\python.exe -c "import asyncio; from mcp_server.server import mcp; print([t.name for t in asyncio.run(mcp.list_tools())])"
# 預期 8 tools：search_judgments, get_judgment, query_regulation, get_pcode,
# search_regulations, get_interpretation, search_interpretations, get_citations
```

## 預設 spawn 路徑（`DEFAULT_TRANSPORT`）

- command：`D:\工作用\mcp-taiwan-legal-db\.venv\Scripts\python.exe`
- args：`-m mcp_server.server`
- cwd：`D:\工作用\mcp-taiwan-legal-db`
- 覆寫：`TaiwanLegalDbQuery.transport`（測試／換機部署用）

## 治理紅線

- 任一來源 spawn 失敗、逾時、查無 → fail-closed 回 `unavailable`／`not_found`，不得臆測結果。
- TLR `check pass` 只代表字號在 bundle 內，不代表見解讀對；見解層自查由讀了全文的模型執行。
- 查詢字串會送到 TLR 後端（明文記錄供檢索品質分析），不得送個人機密或保密事實。
- 金鑰放環境變數，不得 commit（`~/.twlegalrag/config.toml` 已 git-ignore 概念同適用）。
