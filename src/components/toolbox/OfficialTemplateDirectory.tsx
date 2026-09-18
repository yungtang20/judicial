import React, { useState, useEffect, useCallback } from 'react';
import { ExternalLink, Download, FileText, ChevronRight, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { fetchWithAuth } from '../../lib/apiClient';

interface TemplateSummary {
  id: string;
  code: string;
  name: string;
  category: string;
  sourcePageUrl: string;
  officialUpdatedAt: string;
  templateStatus: string;
  hasEditableFile: boolean;
  hasPdf: boolean;
}

interface CategorySummary {
  name: string;
  total: number;
  readyForMerge: number;
  sourceOnly: number;
}

interface TemplateDetail extends TemplateSummary {
  editableFileUrl: string | null;
  pdfFileUrl: string | null;
  localFileHash: string | null;
  downloadedAt: string | null;
  fields: Array<{ key: string; label: string; type: string; required: boolean; placeholder?: string }>;
}

interface OfficialTemplateDirectoryProps {
  searchQuery?: string;
}

export const OfficialTemplateDirectory: React.FC<OfficialTemplateDirectoryProps> = ({ searchQuery = '' }) => {
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateDetail | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load categories on mount
  useEffect(() => {
    fetchWithAuth('/api/official-templates')
      .then(r => r.json())
      .then((data: { categories: CategorySummary[] }) => setCategories(data.categories || []))
      .catch(() => {});
  }, []);

  // Load templates when category selected
  useEffect(() => {
    if (!selectedCategory) { setTemplates([]); return; }
    setIsLoading(true);
    fetchWithAuth(`/api/official-templates?category=${encodeURIComponent(selectedCategory)}`)
      .then(r => r.json())
      .then((data: { templates: TemplateSummary[] }) => setTemplates(data.templates || []))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [selectedCategory]);

  const handleSelectTemplate = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const res = await fetchWithAuth(`/api/official-templates/${id}`);
      const data: TemplateDetail = await res.json();
      setSelectedTemplate(data);
      setFieldValues({});
      setRenderError(null);
    } catch {
      setRenderError('Failed to load template details');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRender = useCallback(async () => {
    if (!selectedTemplate) return;
    setIsRendering(true);
    setRenderError(null);
    try {
      const res = await fetchWithAuth(`/api/official-templates/${selectedTemplate.id}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: fieldValues }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRenderError(data.error || `HTTP ${res.status}`);
        return;
      }
      // Download the file
      if (data.documentBase64) {
        const binary = atob(data.documentBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: data.mimeType || 'application/vnd.oasis.opendocument.text' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.fileName || `${selectedTemplate.name}.odt`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      setRenderError(err.message || 'Render failed');
    } finally {
      setIsRendering(false);
    }
  }, [selectedTemplate, fieldValues]);

  const query = searchQuery.trim().toLowerCase();
  const filteredCategories = query
    ? categories.filter(c => c.name.toLowerCase().includes(query))
    : categories;

  const statusLabel = (s: string) => {
    switch (s) {
      case 'READY_FOR_MERGE': return <span className="text-green-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />可套版</span>;
      case 'SOURCE_ONLY': return <span className="text-yellow-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />僅提供來源</span>;
      case 'DOWNLOADED': return <span className="text-sky-400 flex items-center gap-1"><Download className="w-3 h-3" />已下載</span>;
      default: return <span className="text-slate-500">{s}</span>;
    }
  };

  // Step 3: Show template detail + field form
  if (selectedTemplate) {
    return (
      <section aria-labelledby="official-template-detail">
        <div className="mb-4">
          <button onClick={() => { setSelectedTemplate(null); setRenderError(null); }}
            className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 mb-2">
            <ChevronRight className="w-3 h-3 rotate-180" />返回 {selectedTemplate.category}
          </button>
          <h2 id="official-template-detail" className="text-lg font-bold text-white">{selectedTemplate.name}</h2>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
            <span>代碼：{selectedTemplate.code}</span>
            <span>官方更新：{selectedTemplate.officialUpdatedAt}</span>
            <span>狀態：{statusLabel(selectedTemplate.templateStatus)}</span>
          </div>
          <div className="mt-2 flex gap-3">
            <a href={selectedTemplate.sourcePageUrl} target="_blank" rel="noreferrer"
              className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />官方詳細頁
            </a>
            {selectedTemplate.pdfFileUrl && (
              <a href={selectedTemplate.pdfFileUrl} target="_blank" rel="noreferrer"
                className="text-xs text-slate-400 hover:text-slate-300 flex items-center gap-1">
                <FileText className="w-3 h-3" />PDF 範本
              </a>
            )}
          </div>
        </div>

        {selectedTemplate.templateStatus === 'SOURCE_ONLY' ? (
          <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-300">
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            此模板目前僅提供官方來源下載，無法線上套版。請點選上方「官方詳細頁」連結至司法院下載原始檔案。
          </div>
        ) : selectedTemplate.templateStatus === 'READY_FOR_MERGE' || selectedTemplate.templateStatus === 'DOWNLOADED' ? (
          <div className="space-y-4">
            {selectedTemplate.fields.length > 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
                <h3 className="text-sm font-bold text-white">填寫資料</h3>
                {selectedTemplate.fields.map(field => (
                  <div key={field.key}>
                    <label className="block text-xs text-slate-400 mb-1">
                      {field.label} {field.required && <span className="text-red-400">*</span>}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                        placeholder={field.placeholder}
                        value={fieldValues[field.key] || ''}
                        onChange={e => setFieldValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                        rows={4}
                      />
                    ) : (
                      <input
                        type="text"
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                        placeholder={field.placeholder}
                        value={fieldValues[field.key] || ''}
                        onChange={e => setFieldValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-400">
                此模板尚未建立欄位對應（FIELD_MAPPING），目前無法自動套版。
              </div>
            )}

            {renderError && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                {renderError}
              </div>
            )}

            {selectedTemplate.fields.length > 0 && (
              <button
                onClick={handleRender}
                disabled={isRendering}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-bold text-white hover:bg-sky-500 disabled:opacity-50"
              >
                {isRendering ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />產生中...</>
                ) : (
                  <><Download className="w-4 h-4" />下載套版文件</>
                )}
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-400">
            此模板狀態為 {selectedTemplate.templateStatus}，暫時無法套版。
          </div>
        )}
      </section>
    );
  }

  // Step 2: Show templates in category
  if (selectedCategory) {
    return (
      <section aria-labelledby="official-template-list">
        <div className="mb-4">
          <button onClick={() => setSelectedCategory(null)}
            className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 mb-2">
            <ChevronRight className="w-3 h-3 rotate-180" />返回全部分類
          </button>
          <h2 id="official-template-list" className="text-lg font-bold text-white">{selectedCategory}</h2>
          <p className="mt-1 text-xs text-slate-400">
            共 {templates.length} 份書狀。選取一份後填寫資料，僅產生該份文件。
          </p>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center p-8 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />載入中...
          </div>
        ) : templates.length > 0 ? (
          <div className="space-y-2">
            {templates.map(t => (
              <button key={t.id} onClick={() => handleSelectTemplate(t.id)}
                className="w-full text-left rounded-2xl border border-slate-800 bg-slate-900/80 p-4 transition-colors hover:border-sky-500/60 hover:bg-slate-800/90">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-sky-400 bg-sky-400/10 px-1.5 py-0.5 rounded">{t.code}</span>
                      <h3 className="text-sm font-bold text-slate-100">{t.name}</h3>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      官方更新：{t.officialUpdatedAt}　{statusLabel(t.templateStatus)}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0 text-slate-600" />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-center text-sm text-slate-400">
            此分類下無可用範本。
          </p>
        )}
      </section>
    );
  }

  // Step 1: Show categories
  return (
    <section aria-labelledby="official-template-heading">
      <div className="mb-4">
        <h2 id="official-template-heading" className="text-lg font-bold text-white">司法院官方書狀範本</h2>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          選擇分類 → 選擇書狀 → 填寫資料 → 僅產生一份文件。所有文件經 P4–P9 合規驗證。
        </p>
      </div>
      {filteredCategories.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredCategories.map(cat => (
            <button key={cat.name} onClick={() => setSelectedCategory(cat.name)}
              className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-left transition-colors hover:border-sky-500/60 hover:bg-slate-800/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">{cat.name}</h3>
                  <p className="mt-1 text-xs text-slate-400">共 {cat.total} 份書狀</p>
                </div>
                <ChevronRight className="w-4 h-4 shrink-0 text-sky-400" />
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                可套版 {cat.readyForMerge} 份　|　來源連結 {cat.sourceOnly} 份
              </p>
            </button>
          ))}
        </div>
      ) : (
        <p role="status" className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-center text-sm text-slate-400">
          找不到符合「{searchQuery.trim()}」的分類。
        </p>
      )}
    </section>
  );
};
