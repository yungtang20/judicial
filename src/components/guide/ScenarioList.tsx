import React from 'react';
import { Clock, DollarSign, HelpCircle, Sparkles } from 'lucide-react';

export interface ScenarioListProps {
  [key: string]: any;
}

export const ScenarioList: React.FC<ScenarioListProps> = ({
  searchQuery,
  selectedCategory,
  setSelectedCategory,
  setSelectedScenario,
  aiTriageLoading,
  filteredScenarios,
  categories,
  handleRunAiTriage,
  handleLaunchScenario,
}) => (
  <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 md:p-6" aria-labelledby="scenario-heading">
    <div className="max-w-3xl">
      <h2 id="scenario-heading" className="text-lg font-bold text-white">或直接選擇常見情境</h2>
      <p className="mt-1 text-sm text-slate-400">選擇最接近的狀況，不需要先知道法律名稱。</p>
    </div>

    <div className="mt-4 flex flex-wrap gap-2" aria-label="生活情境分類">
      {categories.map((category) => {
        const active = selectedCategory === category.id;
        return (
          <button
            key={category.id}
            type="button"
            aria-pressed={active}
            onClick={() => setSelectedCategory(category.id)}
            className={`min-h-11 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
              active
                ? 'border-indigo-500 bg-indigo-600 text-white'
                : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-600 hover:bg-slate-800'
            }`}
          >
            {category.label}
          </button>
        );
      })}
    </div>

    <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-800 pt-5">
      <h3 className="text-sm font-bold text-slate-200">符合的情境</h3>
      <span className="text-xs text-slate-500">{filteredScenarios.length} 項</span>
    </div>

    {filteredScenarios.length === 0 ? (
      <div className="mt-3 rounded-xl border border-dashed border-slate-700 bg-slate-950/50 px-5 py-8 text-center">
        <p className="text-sm font-semibold text-slate-200">沒有完全相符的預設情境</p>
        <p className="mt-1 text-xs text-slate-400">可以直接分析你輸入的內容，系統會先追問必要事實。</p>
        <button
          type="button"
          onClick={() => handleRunAiTriage(searchQuery)}
          disabled={!searchQuery.trim() || aiTriageLoading}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {aiTriageLoading ? '分析中…' : '分析這個狀況'}
        </button>
      </div>
    ) : (
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        {filteredScenarios.map((scenario) => {
          const Icon = scenario.icon;
          return (
            <article key={scenario.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-slate-800 p-2 text-indigo-300">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold leading-5 text-slate-100">{scenario.title}</h4>
                  <p className="mt-1.5 line-clamp-3 text-xs leading-5 text-slate-400">{scenario.plainDesc}</p>
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-1 gap-2 border-t border-slate-800 pt-3 text-xs sm:grid-cols-2">
                <div className="flex items-start gap-1.5">
                  <DollarSign className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
                  <div><dt className="sr-only">規費</dt><dd className="line-clamp-2 text-slate-400">{scenario.feeInfo}</dd></div>
                </div>
                <div className="flex items-start gap-1.5">
                  <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden="true" />
                  <div><dt className="sr-only">時效</dt><dd className="line-clamp-2 text-slate-400">{scenario.timeInfo}</dd></div>
                </div>
              </dl>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setSelectedScenario(scenario)}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                >
                  <HelpCircle className="h-4 w-4" aria-hidden="true" />
                  查看處理方式
                </button>
                <button
                  type="button"
                  onClick={() => handleLaunchScenario(scenario)}
                  className="min-h-11 flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                >
                  使用這個工具
                </button>
              </div>
            </article>
          );
        })}
      </div>
    )}
  </section>
);
