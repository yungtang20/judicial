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
        <p className="text-xs font-semibold text-indigo-300">生活法律導診</p>
        <h1 id="guide-heading" className="mt-2 text-2xl font-bold tracking-tight text-white md:text-3xl">
          描述你遇到的狀況
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          系統會先追問必要事實，再整理可能涉及的法律、證據與可採取的步驟。
        </p>

        <StorytellingInput value={searchQuery} onChange={setSearchQuery} onSubmit={() => handleRunAiTriage(searchQuery)} loading={aiTriageLoading} />
      </div>
    </section>
  );
};
