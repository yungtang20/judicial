import React from 'react';
import { Search, Sparkles } from 'lucide-react';

export interface HeroSectionProps {
  [key: string]: any;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  searchQuery,
  setSearchQuery,
  aiTriageLoading,
  handleRunAiTriage,
}) => {
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (searchQuery.trim()) handleRunAiTriage(searchQuery);
  };

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 md:p-6" aria-labelledby="guide-heading">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold text-indigo-300">生活法律導診</p>
        <h1 id="guide-heading" className="mt-2 text-2xl font-bold tracking-tight text-white md:text-3xl">
          描述你遇到的狀況
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          系統會先追問必要事實，再整理可能涉及的法律、證據與可採取的步驟。
        </p>

        <form className="mt-5" onSubmit={submit}>
          <label htmlFor="legal-situation" className="mb-2 block text-sm font-semibold text-slate-200">
            發生了什麼事？
          </label>
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-500" aria-hidden="true" />
            <textarea
              id="legal-situation"
              rows={3}
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="例如：房客積欠三個月租金，我想終止租約並請他搬離"
              className="min-h-28 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 py-3 pl-11 pr-4 text-sm leading-6 text-white outline-none placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="min-h-11 rounded-lg px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                清除
              </button>
            )}
            <button
              type="submit"
              disabled={!searchQuery.trim() || aiTriageLoading}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {aiTriageLoading ? '分析中…' : '開始分析'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};
