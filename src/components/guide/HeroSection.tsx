import React from 'react';
import StorytellingInput from '../dashboard/StorytellingInput';

export interface HeroSectionProps {
  [key: string]: any;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  searchQuery,
  setSearchQuery,
  aiTriageLoading,
  handleRunAiTriage,
}) => {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 md:p-6" aria-labelledby="guide-heading">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold text-indigo-300">以上都沒有？</p>
        <h1 id="guide-heading" className="mt-2 text-2xl font-bold tracking-tight text-white md:text-3xl">
          用你的話描述發生了什麼事
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          不用法律用語，照實寫就好。系統會先追問必要事實，再整理可能涉及的法律、證據與可採取的步驟。
        </p>

        <StorytellingInput value={searchQuery} onChange={setSearchQuery} onSubmit={() => handleRunAiTriage(searchQuery)} loading={aiTriageLoading} />
      </div>
    </section>
  );
};
