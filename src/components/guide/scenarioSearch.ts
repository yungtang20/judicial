import type { ScenarioItem } from './ScenarioDetailModal';

export function filterScenarios(
  scenarios: ScenarioItem[],
  selectedCategory: string,
  searchQuery: string
): ScenarioItem[] {
  const rawQuery = searchQuery.trim().toLowerCase();

  return scenarios.filter((scenario) => {
    const matchCategory = selectedCategory === 'ALL' || scenario.category === selectedCategory;
    if (!matchCategory) return false;
    if (!rawQuery) return true;

    if (
      scenario.title.toLowerCase().includes(rawQuery) ||
      scenario.plainDesc.toLowerCase().includes(rawQuery) ||
      scenario.situation.toLowerCase().includes(rawQuery) ||
      scenario.tags.some((tag) => tag.toLowerCase().includes(rawQuery))
    ) {
      return true;
    }

    if (scenario.tags.some((tag) => tag.length >= 2 && rawQuery.includes(tag.toLowerCase()))) {
      return true;
    }

    const cleaned = rawQuery.replace(/[我你他在了的個被有想請幫忙怎辦如何？?，。！!、\s]+/g, ' ');
    const tokens = cleaned.split(' ').filter((token) => token.length >= 2);
    return tokens.some((token) =>
      scenario.title.toLowerCase().includes(token) ||
      scenario.plainDesc.toLowerCase().includes(token) ||
      scenario.tags.some((tag) => tag.toLowerCase().includes(token))
    );
  });
}

export function matchesSafetyQuery(searchQuery: string, selectedCategory: string): boolean {
  const query = searchQuery.toLowerCase();
  return selectedCategory === 'SAFETY' ||
    ['性侵', '強暴', '強制性交', '妨害性自主', '女友性侵', '男友性侵', '保護令', '家暴', '親密暴力', '恐怖情人']
      .some((keyword) => query.includes(keyword));
}
