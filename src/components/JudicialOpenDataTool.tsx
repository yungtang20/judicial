import React, { useState, useEffect } from 'react';
import { Database, Key, List, FileText, CheckCircle2, AlertCircle, RefreshCw, Download, ArrowRight, ExternalLink, ShieldCheck } from 'lucide-react';

interface JudicialCategory {
  categoryNo: string;
  categoryName: string;
}

interface FileSet {
  fileSetId: number;
  resourceFormat: string;
  resourceDescription: string;
}

interface JudicialResource {
  datasetId: number;
  title: string;
  categoryName: string;
  filesets: FileSet[];
}

interface JListChangeItem {
  date: string;
  list: string[];
}

interface JDocResult {
  JID?: string;
  JTITLE?: string;
  JYEAR?: string;
  JCASE?: string;
  JNO?: string;
  JDATE?: string;
  JFULLX?: {
    JFULLTYPE?: string;
    JFULLCONTENT?: string;
    JFULLPDF?: string;
  };
  ATTACHMENTS?: Array<{ TITLE: string; URL: string }>;
  error?: string;
}

export default function JudicialOpenDataTool() {
  const [activeTab, setActiveTab] = useState<'categories' | 'jdgApi' | 'memberToken'>('categories');
  const [hasEnvCreds, setHasEnvCreds] = useState<boolean>(false);
  
  // 帳密設定
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  
  // 會員 Token
  const [memberToken, setMemberToken] = useState<string>('');
  const [memberTokenExpiry, setMemberTokenExpiry] = useState<string>('');
  const [memberAuthLoading, setMemberAuthLoading] = useState<boolean>(false);
  const [memberAuthError, setMemberAuthError] = useState<string>('');

  // 裁判書 API Token (JDG Auth)
  const [jdgToken, setJdgToken] = useState<string>('');
  const [jdgAuthLoading, setJdgAuthLoading] = useState<boolean>(false);
  const [jdgAuthError, setJdgAuthError] = useState<string>('');

  // 分類與資源資料
  const [categories, setCategories] = useState<JudicialCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [resources, setResources] = useState<JudicialResource[]>([]);
  const [catLoading, setCatLoading] = useState<boolean>(false);
  const [resLoading, setResLoading] = useState<boolean>(false);

  // 檔案內容查詢
  const [selectedFileSetId, setSelectedFileSetId] = useState<string>('');
  const [fileTop, setFileTop] = useState<number>(10);
  const [fileSkip, setFileSkip] = useState<number>(0);
  const [fileContent, setFileContent] = useState<string>('');
  const [fileLoading, setFileLoading] = useState<boolean>(false);

  // 裁判書異動清單 & 全文
  const [jlistData, setJlistData] = useState<JListChangeItem[]>([]);
  const [jlistLoading, setJlistLoading] = useState<boolean>(false);
  const [selectedJid, setSelectedJid] = useState<string>('');
  const [jdocResult, setJdocResult] = useState<JDocResult | null>(null);
  const [jdocLoading, setJdocLoading] = useState<boolean>(false);

  // 檢查伺服器環境變數
  useEffect(() => {
    fetch('/api/judicial/env-status')
      .then((res) => res.json())
      .then((data) => {
        if (data.configured) {
          setHasEnvCreds(true);
        }
      })
      .catch((err) => console.warn('Failed to check judicial env status:', err));
  }, []);

  // 取得主題分類
  const fetchCategories = async () => {
    setCatLoading(true);
    try {
      const res = await fetch('/api/judicial/categories');
      const data = await res.json();
      if (Array.isArray(data)) {
        setCategories(data);
      } else {
        alert('取得分類失敗：' + JSON.stringify(data));
      }
    } catch (err: any) {
      alert('請求錯誤：' + err.message);
    } finally {
      setCatLoading(false);
    }
  };

  // 取得指定分類資料源
  const fetchResources = async (catNo: string) => {
    setSelectedCategory(catNo);
    setResLoading(true);
    try {
      const res = await fetch(`/api/judicial/categories/${catNo}/resources`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setResources(data);
      } else {
        setResources([]);
      }
    } catch (err: any) {
      alert('取得資料源失敗：' + err.message);
    } finally {
      setResLoading(false);
    }
  };

  // 存取檔案內容
  const fetchFileContent = async (fileSetId: string) => {
    setSelectedFileSetId(fileSetId);
    setFileLoading(true);
    try {
      const res = await fetch(`/api/judicial/fileset/${fileSetId}?top=${fileTop}&skip=${fileSkip}`);
      const text = await res.text();
      setFileContent(text);
    } catch (err: any) {
      setFileContent('讀取失敗：' + err.message);
    } finally {
      setFileLoading(false);
    }
  };

  // 取得會員授權 Token
  const handleGetMemberToken = async () => {
    setMemberAuthLoading(true);
    setMemberAuthError('');
    try {
      const res = await fetch('/api/judicial/member-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account, password })
      });
      const data = await res.json();
      if (data.token) {
        setMemberToken(data.token);
        setMemberTokenExpiry(data.expires || '未定');
      } else {
        setMemberAuthError(data.message || '取得 Token 失敗');
      }
    } catch (err: any) {
      setMemberAuthError('連線錯誤：' + err.message);
    } finally {
      setMemberAuthLoading(false);
    }
  };

  // 取得裁判書 API Token (JDG Auth)
  const handleJdgAuth = async () => {
    setJdgAuthLoading(true);
    setJdgAuthError('');
    try {
      const res = await fetch('/api/judicial/jdg/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: account, password })
      });
      const data = await res.json();
      if (data.Token) {
        setJdgToken(data.Token);
      } else {
        setJdgAuthError(data.error || '驗證失敗');
      }
    } catch (err: any) {
      setJdgAuthError('驗證連線失敗：' + err.message);
    } finally {
      setJdgAuthLoading(false);
    }
  };

  // 取得 7 日裁判書異動清單 (JList)
  const handleFetchJList = async () => {
    if (!jdgToken) {
      alert('請先進行裁判書 API 驗證取得 Token');
      return;
    }
    setJlistLoading(true);
    try {
      const res = await fetch('/api/judicial/jdg/jlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: jdgToken })
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setJlistData(data);
      } else if (data.error) {
        alert('取得異動清單失敗：' + data.error);
      } else {
        alert('資料格式無效：' + JSON.stringify(data));
      }
    } catch (err: any) {
      alert('請求失敗：' + err.message);
    } finally {
      setJlistLoading(false);
    }
  };

  // 取得裁判書全文 (JDoc)
  const handleFetchJDoc = async (jidToFetch: string) => {
    if (!jdgToken) {
      alert('請先取得裁判書 API Token');
      return;
    }
    const targetJid = jidToFetch || selectedJid;
    if (!targetJid) {
      alert('請輸入或選擇裁判書 JID');
      return;
    }
    setSelectedJid(targetJid);
    setJdocLoading(true);
    try {
      const res = await fetch('/api/judicial/jdg/jdoc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: jdgToken, j: targetJid })
      });
      const data = await res.json();
      setJdocResult(data);
    } catch (err: any) {
      alert('讀取裁判書全文失敗：' + err.message);
    } finally {
      setJdocLoading(false);
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 bg-[var(--color-surface-base)] overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 頁面標題 */}
        <div className="bg-[var(--color-surface-overlay)] p-6 rounded-xl border border-[var(--color-border-subtle)]">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <Database className="w-7 h-7 text-[var(--color-brand-primary)]" />
                司法院開放資料與裁判書 API 整合對接平台
              </h1>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">
                支援司法院資料開放平臺 OData Restful API 及司法院裁判書開放 API (JList / JDoc)
              </p>
            </div>
            
            {hasEnvCreds ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-status-success-bg)] text-emerald-700 rounded-lg border border-[var(--color-status-success)]/30 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                已自動載入系統環境變數帳密
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning)] rounded-lg border border-[var(--color-status-warning)]/30 text-xs">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                未檢測到環境變數，可於下方手動輸入帳密
              </div>
            )}
          </div>

          {/* 帳號密碼覆蓋輸入欄 */}
          <div className="mt-4 pt-4 border-t border-[var(--color-border-subtle)] grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
                會員帳號 (memberAccount / user)
              </label>
              <input
                type="text"
                placeholder={hasEnvCreds ? '（使用環境變數設定）' : '例如：jdy2020'}
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-[var(--color-border-strong)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
                會員密碼 (pwd / password)
              </label>
              <input
                type="password"
                placeholder={hasEnvCreds ? '（使用環境變數設定）' : '••••••••'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-[var(--color-border-strong)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-primary)]"
              />
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">
              💡 若系統已於 <code className="bg-[var(--color-surface-overlay)] px-1 py-0.5 rounded text-[var(--color-text-secondary)]">.env</code> 設定 <code className="bg-[var(--color-surface-overlay)] px-1 py-0.5 rounded text-[var(--color-text-secondary)]">JUDICIAL_OPENDATA_ACCOUNT</code>，此處可留空。
            </div>
          </div>
        </div>

        {/* 頁籤切換 */}
        <div className="flex border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)] rounded-t-xl px-4 pt-2">
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-5 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'categories'
                ? 'border-[var(--color-brand-primary)] text-[var(--color-brand-primary)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
            }`}
          >
            <List className="w-4 h-4" />
            (1) 主題分類與資料集清單
          </button>
          <button
            onClick={() => setActiveTab('jdgApi')}
            className={`px-5 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'jdgApi'
                ? 'border-[var(--color-brand-primary)] text-[var(--color-brand-primary)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
            }`}
          >
            <FileText className="w-4 h-4" />
            (2) 司法院裁判書開放 API (JList / JDoc)
          </button>
          <button
            onClick={() => setActiveTab('memberToken')}
            className={`px-5 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'memberToken'
                ? 'border-[var(--color-brand-primary)] text-[var(--color-brand-primary)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
            }`}
          >
            <Key className="w-4 h-4" />
            (3) 會員授權 Token 驗證
          </button>
        </div>

        {/* 頁籤 1: 主題分類與資料集清單 */}
        {activeTab === 'categories' && (
          <div className="bg-[var(--color-surface-overlay)] p-6 rounded-b-xl border border-t-0 border-[var(--color-border-subtle)] space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[var(--color-text-primary)]">司法院主題分類 REST API</h3>
                <p className="text-xs text-[var(--color-text-muted)]">取得司法院公開資料集類別及包含之檔案資源描述</p>
              </div>
              <button
                onClick={fetchCategories}
                disabled={catLoading}
                className="px-4 py-2 bg-[var(--color-brand-primary)] text-white text-xs font-semibold rounded-md hover:opacity-90 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${catLoading ? 'animate-spin' : ''}`} />
                {catLoading ? '載入中...' : '取得分類清單 (/categories)'}
              </button>
            </div>

            {categories.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-2">
                  選擇主題分類（共 {categories.length} 項）：
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.categoryNo}
                      onClick={() => fetchResources(cat.categoryNo)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition ${
                        selectedCategory === cat.categoryNo
                          ? 'bg-[var(--color-brand-primary)] text-white border-[var(--color-brand-primary)] font-bold'
                          : 'bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-overlay)]'
                      }`}
                    >
                      {cat.categoryName} <span className="opacity-75">({cat.categoryNo})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {resLoading && (
              <div className="text-center py-6 text-xs text-[var(--color-text-muted)]">正在獲取資料源清單...</div>
            )}

            {resources.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-[var(--color-border-subtle)]">
                <h4 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
                  分類 [{selectedCategory}] 資料集清單：
                </h4>
                <div className="divide-y divide-gray-200">
                  {resources.map((resItem) => (
                    <div key={resItem.datasetId} className="py-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[var(--color-brand-primary)] bg-[var(--color-status-info-bg)] px-2 py-0.5 rounded border border-[var(--color-status-info)]/30">
                            #{resItem.datasetId}
                          </span>
                          <span className="font-semibold text-sm text-[var(--color-text-primary)]">{resItem.title}</span>
                        </div>
                        <span className="text-xs text-[var(--color-text-muted)]">{resItem.categoryName}</span>
                      </div>

                      {resItem.filesets && resItem.filesets.length > 0 && (
                        <div className="pl-3 border-l-2 border-[var(--color-border-subtle)] space-y-1">
                          {resItem.filesets.map((f) => (
                            <div key={f.fileSetId} className="flex items-center justify-between py-1 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[var(--color-text-primary)] font-semibold">#{f.fileSetId}</span>
                                <span className="bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold">
                                  {f.resourceFormat}
                                </span>
                                <span className="text-[var(--color-text-muted)] text-[11px]">{f.resourceDescription}</span>
                              </div>
                              <button
                                onClick={() => fetchFileContent(String(f.fileSetId))}
                                className="px-2.5 py-1 bg-gray-800 text-white rounded text-[11px] hover:bg-black transition cursor-pointer"
                              >
                                檢視內容
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 檔案內容顯示 */}
            {selectedFileSetId && (
              <div className="mt-6 p-4 border border-[var(--color-status-info)]/30 bg-[var(--color-status-info-bg)]/30 rounded-lg space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-[var(--color-status-info)]">
                    資料源 FileSet #{selectedFileSetId} 數據預覽
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <span>top:</span>
                    <input
                      type="number"
                      value={fileTop}
                      onChange={(e) => setFileTop(Number(e.target.value))}
                      className="w-16 px-2 py-1 border rounded text-xs bg-[var(--color-surface-overlay)]"
                    />
                    <span>skip:</span>
                    <input
                      type="number"
                      value={fileSkip}
                      onChange={(e) => setFileSkip(Number(e.target.value))}
                      className="w-16 px-2 py-1 border rounded text-xs bg-[var(--color-surface-overlay)]"
                    />
                    <button
                      onClick={() => fetchFileContent(selectedFileSetId)}
                      className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                    >
                      重新抓取
                    </button>
                  </div>
                </div>

                {fileLoading ? (
                  <div className="text-xs text-[var(--color-text-muted)]">正在下載數據...</div>
                ) : (
                  <pre className="text-xs bg-gray-900 text-emerald-400 p-3 rounded max-h-60 overflow-auto font-mono whitespace-pre-wrap">
                    {fileContent || '（無資料或無法解析內容）'}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}

        {/* 頁籤 2: 司法院裁判書開放 API */}
        {activeTab === 'jdgApi' && (
          <div className="bg-[var(--color-surface-overlay)] p-6 rounded-b-xl border border-t-0 border-[var(--color-border-subtle)] space-y-6">
            <div className="p-4 bg-[var(--color-surface-raised)] rounded-lg border border-[var(--color-border-subtle)] space-y-3">
              <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <Key className="w-4 h-4 text-[var(--color-brand-primary)]" />
                步驟 1：進行裁判書 API 權限驗證 (/jdg/api/Auth)
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)]">
                向 <code className="bg-[var(--color-border-strong)] px-1 py-0.5 rounded">https://data.judicial.gov.tw/jdg/api/Auth</code> 請求取得裁判書檢索 Token（有效期限 6 小時，限每日 0:00 - 6:00 可完整連線）。
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleJdgAuth}
                  disabled={jdgAuthLoading}
                  className="px-4 py-2 bg-[var(--color-brand-primary)] text-white text-xs font-bold rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${jdgAuthLoading ? 'animate-spin' : ''}`} />
                  {jdgAuthLoading ? '驗證中...' : '取得裁判書 API Token'}
                </button>
                {jdgToken && (
                  <span className="text-xs text-emerald-700 font-mono font-semibold flex items-center gap-1 bg-[var(--color-status-success-bg)] px-2 py-1 rounded border border-[var(--color-status-success)]/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Token 已取得: {jdgToken.slice(0, 12)}...
                  </span>
                )}
                {jdgAuthError && (
                  <span className="text-xs text-red-600 font-semibold">{jdgAuthError}</span>
                )}
              </div>
            </div>

            {/* 步驟 2: 取得異動清單 */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                    步驟 2：取得近 7 日裁判書異動清單 (/jdg/api/JList)
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)]">取得最新裁判書 ID (jid) 列表</p>
                </div>
                <button
                  onClick={handleFetchJList}
                  disabled={jlistLoading}
                  className="px-4 py-2 bg-gray-800 text-white text-xs font-semibold rounded hover:bg-black disabled:opacity-50 flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${jlistLoading ? 'animate-spin' : ''}`} />
                  {jlistLoading ? '查詢中...' : '查詢異動清單'}
                </button>
              </div>

              {jlistData.length > 0 && (
                <div className="space-y-3 border border-[var(--color-border-subtle)] p-4 rounded-lg bg-[var(--color-surface-raised)] max-h-72 overflow-y-auto">
                  {jlistData.map((item, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="text-xs font-bold text-[var(--color-text-secondary)]">📅 異動日期：{item.date} (共 {item.list.length} 筆)</div>
                      <div className="flex flex-wrap gap-1.5">
                        {item.list.slice(0, 15).map((jid) => (
                          <button
                            key={jid}
                            onClick={() => handleFetchJDoc(jid)}
                            className="px-2 py-1 bg-[var(--color-surface-overlay)] border border-[var(--color-border-strong)] text-[var(--color-text-secondary)] rounded text-[11px] font-mono hover:bg-[var(--color-status-info-bg)] hover:border-blue-300 transition"
                          >
                            {jid}
                          </button>
                        ))}
                        {item.list.length > 15 && (
                          <span className="text-xs text-[var(--color-text-muted)] self-center">...等 {item.list.length - 15} 筆</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 步驟 3: 查詢裁判書全文 */}
            <div className="space-y-4 pt-4 border-t border-[var(--color-border-subtle)]">
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                步驟 3：查詢特定裁判書內容 (/jdg/api/JDoc)
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="輸入裁判書 JID，例如：CHDM,105,交訴,51,20161216,1"
                  value={selectedJid}
                  onChange={(e) => setSelectedJid(e.target.value)}
                  className="flex-1 text-xs px-3 py-2 border border-[var(--color-border-strong)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-primary)] font-mono"
                />
                <button
                  onClick={() => handleFetchJDoc(selectedJid)}
                  disabled={jdocLoading}
                  className="px-4 py-2 bg-[var(--color-brand-primary)] text-white text-xs font-bold rounded hover:opacity-90 disabled:opacity-50"
                >
                  {jdocLoading ? '載入全文中...' : '讀取裁判書內容'}
                </button>
              </div>

              {jdocResult && (
                <div className="p-4 border border-[var(--color-border-subtle)] rounded-lg bg-[var(--color-surface-raised)] space-y-3">
                  <div className="flex justify-between items-start border-b pb-2 border-[var(--color-border-subtle)]">
                    <div>
                      <h4 className="font-bold text-sm text-[var(--color-text-primary)]">
                        {jdocResult.JTITLE || '裁判書全文內容'}
                      </h4>
                      <p className="text-xs text-[var(--color-text-muted)] font-mono">
                        JID: {jdocResult.JID} | 日期: {jdocResult.JDATE} | 案號: {jdocResult.JYEAR}年 {jdocResult.JCASE}字 第{jdocResult.JNO}號
                      </p>
                    </div>
                  </div>

                  {jdocResult.JFULLX?.JFULLCONTENT && (
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                        裁判書全文預覽：
                      </label>
                      <textarea
                        readOnly
                        value={jdocResult.JFULLX.JFULLCONTENT}
                        className="w-full h-48 text-xs p-3 font-mono border rounded bg-[var(--color-surface-overlay)]"
                      />
                    </div>
                  )}

                  {jdocResult.ATTACHMENTS && jdocResult.ATTACHMENTS.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-[var(--color-text-secondary)]">裁判書附檔：</div>
                      {jdocResult.ATTACHMENTS.map((att, i) => (
                        <a
                          key={i}
                          href={att.URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {att.TITLE}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 頁籤 3: 會員授權 Token */}
        {activeTab === 'memberToken' && (
          <div className="bg-[var(--color-surface-overlay)] p-6 rounded-b-xl border border-t-0 border-[var(--color-border-subtle)] space-y-6">
            <div>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">司法院會員授權 Token 取得測試</h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                請求網址：<code className="bg-[var(--color-surface-overlay)] px-1 py-0.5 rounded">POST https://opendata.judicial.gov.tw/api/MemberTokens</code>
              </p>
            </div>

            <div className="p-4 bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] rounded-lg space-y-4">
              <button
                onClick={handleGetMemberToken}
                disabled={memberAuthLoading}
                className="px-5 py-2.5 bg-[var(--color-brand-primary)] text-white text-xs font-bold rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${memberAuthLoading ? 'animate-spin' : ''}`} />
                {memberAuthLoading ? '請求 Bearer Token 中...' : '發送 MemberTokens 驗證請求'}
              </button>

              {memberToken && (
                <div className="p-3 bg-[var(--color-status-success-bg)] border border-[var(--color-status-success)]/30 rounded space-y-2 text-xs">
                  <div className="font-bold text-[var(--color-status-success)] flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    成功取得 Bearer Authorization Token：
                  </div>
                  <div className="font-mono text-[var(--color-text-secondary)] bg-[var(--color-surface-overlay)] p-2 rounded border border-[var(--color-status-success)]/30 break-all text-[11px]">
                    Bearer {memberToken}
                  </div>
                  <div className="text-[var(--color-text-secondary)]">過期時間：{memberTokenExpiry}</div>
                </div>
              )}

              {memberAuthError && (
                <div className="p-3 bg-[var(--color-status-danger-bg)] border border-[var(--color-status-danger)]/30 rounded text-xs text-red-700 font-semibold">
                  驗證失敗：{memberAuthError}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
